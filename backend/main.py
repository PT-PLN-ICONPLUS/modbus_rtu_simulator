import asyncio
import math
import threading
import time
from typing import Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from pymodbus.server import StartTcpServer, ServerStop
from pymodbus.datastore import ModbusSlaveContext, ModbusServerContext
from pymodbus.datastore import ModbusSequentialDataBlock
from pymodbus import FramerType
from pymodbus.device import ModbusDeviceIdentification
import random
from dotenv import load_dotenv
import os
import logging
from contextlib import asynccontextmanager
import uvicorn
from pydantic import BaseModel
from data_models import CircuitBreakerItem, TeleSignalItem, TelemetryItem, TapChangerItem
from pymodbus import __version__ as pymodbus_version

# MODBUS MAPPING
# 1. Coils Status ADRESS 0 - 9999
# 2. Discrete Inputs ADRESS 10000 - 19999
# 3. Holding Registers ADRESS 20000 - 29999
# 4. Input Registers ADRESS 30000 - 39999

# Configure logging
logging.getLogger("pymodbus").setLevel(logging.CRITICAL)
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

FASTAPI_HOST = os.getenv("FASTAPI_HOST")
FASTAPI_PORT = int(os.getenv("FASTAPI_PORT"))
MODBUS_HOST = os.getenv("MODBUS_HOST")
MODBUS_PORT = int(os.getenv("MODBUS_PORT"))

app = FastAPI()
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for items
circuit_breakers: Dict[str, CircuitBreakerItem] = {}
telesignals: Dict[str, TeleSignalItem] = {}
telemetries: Dict[str, TelemetryItem] = {}
tap_changers: Dict[str, TapChangerItem] = {}

# Initialize MODBUS Data Store with sufficient space
store = ModbusSlaveContext(
    di=ModbusSequentialDataBlock(0, [0] * 5000),  # Discrete Inputs
    co=ModbusSequentialDataBlock(0, [0] * 5000),  # Coil Statuses
    hr=ModbusSequentialDataBlock(0, [0] * 7000),  # Holding Registers
    ir=ModbusSequentialDataBlock(0, [0] * 7000),  # Input Registers
)
context = ModbusServerContext(slaves=store, single=True)

# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    # Send current state to new clients
    await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()], room=sid)
    await sio.emit('telesignals', [item.model_dump() for item in telesignals.values()], room=sid)
    await sio.emit('telemetries', [item.model_dump() for item in telemetries.values()], room=sid)
    await sio.emit('tap_changers', [item.model_dump() for item in tap_changers.values()], room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    
@sio.event
async def get_initial_data(sid):
    """Send initial data to the frontend."""
    try:
        data = {
            "circuit_breakers": [item.model_dump() for item in circuit_breakers.values()],
            "telesignals": [item.model_dump() for item in telesignals.values()],
            "telemetries": [item.model_dump() for item in telemetries.values()],
            "tap_changers": [item.model_dump() for item in tap_changers.values()],
        }
        await sio.emit('get_initial_data_response', data, room=sid)
        logger.info(f"Initial data sent to {sid}")
    except Exception as e:
        logger.error(f"Error fetching initial data: {e}")
        await sio.emit('get_initial_data_error', {"error": "Failed to fetch initial data"}, room=sid)
    
@sio.event
async def add_circuit_breaker(sid, data):
    item = CircuitBreakerItem(**data)
    circuit_breakers[item.id] = item
    
    try:
        # Update Modbus registers with initial states
        store.setValues(2, item.ioa_cb_status - 1, [False])
        store.setValues(2, item.ioa_cb_status_close - 1, [False])
        
        store.setValues(1, item.ioa_control_open - 1, [0])  # Initially off
        store.setValues(1, item.ioa_control_close - 1, [0])  # Initially off
        
        if item.has_double_point:
            if item.ioa_cb_status_dp is not None:
                store.setValues(2, item.ioa_cb_status_dp - 1, [False])
            if item.ioa_control_dp is not None:
                store.setValues(3, item.ioa_control_dp - 1, [0])
        
        store.setValues(1, item.ioa_local_remote_sp - 1, [item.remote_sp])  # Set remote/local mode
        if item.has_local_remote_dp:
            store.setValues(1, item.ioa_local_remote_dp - 1, [item.remote_dp])
            
        logger.info(f"Added circuit breaker: {item.name} with IOA CB status open (for unique value): {item.ioa_cb_status}")
        await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()])
        return {"status": "success", "message": f"Added circuit breaker {item.name}"}
    except Exception as e:
        logger.error(f"Error adding circuit breaker: {e}")
        return {"status": "error", "message": "Failed to add circuit breaker"}

@sio.event
async def update_circuit_breaker(sid, data):
    id = data.get('id')
    # Find the item by IOA
    for item_id, item in list(circuit_breakers.items()):
        if id == item_id:
            ioa_changes = {}
            for ioa_key in ['ioa_cb_status', 'ioa_cb_status_close', 'ioa_control_open', 
                           'ioa_control_close', 'ioa_local_remote_sp', 'ioa_local_remote_dp', 
                           'ioa_cb_status_dp', 'ioa_control_dp']:
                if ioa_key in data and getattr(item, ioa_key, None) != data.get(ioa_key):
                    ioa_changes[ioa_key] = (getattr(item, ioa_key), data.get(ioa_key))
            
            if ioa_changes:
                # remove all old ioas
                store.setValues(2, item.ioa_cb_status - 1, [False])
                store.setValues(2, item.ioa_cb_status_close - 1, [False])
                store.setValues(1, item.ioa_control_open - 1, [0])
                store.setValues(1, item.ioa_control_close - 1, [0])
                
                if item.has_double_point:
                    if item.ioa_cb_status_dp is not None:
                        store.setValues(4, item.ioa_cb_status_dp - 1, [0])
                    if item.ioa_control_dp is not None:
                        store.setValues(3, item.ioa_control_dp - 1, [0])
                        
                store.setValues(1, item.ioa_local_remote_sp - 1, [False])  # Reset remote/local mode
                if item.has_local_remote_dp:
                    store.setValues(1, item.ioa_local_remote_dp - 1, [False])
                    
                # update all fields
                for key, value in data.items():
                    if hasattr(circuit_breakers[item_id], key) and key != 'id':
                        setattr(circuit_breakers[item_id], key, value)
                        
                await add_circuit_breaker(item_id, item.model_dump())            
            else:         
                for key, value in data.items():
                    if hasattr(circuit_breakers[item_id], key) and key != 'id':
                        setattr(circuit_breakers[item_id], key, value)
                        
                        if key == 'remote_sp':
                            store.setValues(1, item.ioa_local_remote_sp - 1, [value])
                        elif key == 'remote_dp':
                            store.setValues(1, item.ioa_local_remote_dp - 1, [value])
                        elif key == 'cb_status_open':
                            store.setValues(2, item.ioa_cb_status - 1, [value])
                        elif key == 'cb_status_close':
                            store.setValues(2, item.ioa_cb_status_close - 1, [value])
                        elif key == 'cb_status_dp':
                            store.setValues(4, item.ioa_cb_status_dp - 1, [value])
                        elif key == 'control_open':
                            store.setValues(1, item.ioa_control_open - 1, [value])
                        elif key == 'control_close':
                            store.setValues(1, item.ioa_control_close - 1, [value])
                        elif key == 'control_dp':
                            store.setValues(3, item.ioa_control_dp - 1, [value])   
            
            logger.info(f"Updated circuit breaker: {item.name}, data: {circuit_breakers[item_id].model_dump()}")
            await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()])
            return {"status": "success"}
    
    return {"status": "error", "message": "Circuit breaker not found"}

@sio.event
async def remove_circuit_breaker(sid, data):
    item_id = data.get('id')
    if item_id and item_id in circuit_breakers:
        item = circuit_breakers.pop(item_id)
        # Remove Modbus registers
        store.setValues(2, item.ioa_cb_status - 1, [False])
        store.setValues(2, item.ioa_cb_status_close - 1, [False])
        store.setValues(1, item.ioa_control_open - 1, [0])
        store.setValues(1, item.ioa_control_close - 1, [0])
        
        if item.has_double_point:
            if item.ioa_cb_status_dp is not None:
                store.setValues(4, item.ioa_cb_status_dp - 1, [0])
            if item.ioa_control_dp is not None:
                store.setValues(3, item.ioa_control_dp - 1, [0])
        
        store.setValues(1, item.ioa_local_remote_sp - 1, [False])  # Reset remote/local mode
        if item.has_local_remote_dp:
            store.setValues(1, item.ioa_local_remote_dp - 1, [False])
        
        logger.info(f"Removed circuit breaker: {item.name}")
        await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()])
        return {"status": "success", "message": f"Removed circuit breaker {item.name}"}
    return {"status": "error", "message": "Circuit breaker not found"}

@sio.event
async def add_telesignal(sid, data):
    item = TeleSignalItem(**data)
    telesignals[item.id] = item
    # Update Modbus register with initial state
    try:
        store.setValues(1, item.ioa - 1, [item.value])  # Discrete input
        logger.info(f"Added telesignal: {item.name} with IOA {item.ioa}")
        await sio.emit('telesignals', [item.model_dump() for item in telesignals.values()])
        return {"status": "success", "message": f"Added telesignal {item.name}"}
    except Exception as e:
        logger.error(f"Error adding telesignal: {e}")
        return {"status": "error", "message": "Failed to add telesignal"}

@sio.event
async def update_telesignal(sid, data):
    id = data.get('id')
    # Find the item by IOA
    for item_id, item in list(telesignals.items()):
        if id == item_id:
            # Check if IOA is being updated
            old_ioa = item.ioa
            new_ioa = data.get('ioa')
            
            # Handle IOA update if needed
            if new_ioa is not None and old_ioa != new_ioa:
                # Remove old IOA
                store.setValues(1, old_ioa - 1, [0])  # Reset old IOA

                store.setValues(1, new_ioa - 1, [item.value])
                
                telesignals[item_id].ioa = new_ioa
                telesignals[item_id].name = data.get('name', item.name)
                telesignals[item_id].interval = data.get('interval', item.interval)
                telesignals[item_id].auto_mode = data.get('auto_mode', item.auto_mode)

            # Update all fields that are provided in the data
            for key, value in data.items():
                if hasattr(telesignals[item_id], key) and key != 'id':
                    setattr(telesignals[item_id], key, value)

                    # Update IEC server for the IOA value
                    if key == 'value':
                        store.setValues(1, item.ioa - 1, [value])
                        telesignals[item_id].value = value
            
            logger.info(f"Updated telesignal: {item.name}, data: {telesignals[item_id].model_dump()}")
            await sio.emit('telesignals', [item.model_dump() for item in telesignals.values()])
            return {"status": "success"}
    
    return {"status": "error", "message": "Telesignal not found"}

@sio.event
async def remove_telesignal(sid, data):
    item_id = data.get('id')
    if item_id and item_id in telesignals:
        item = telesignals.pop(item_id)
        # Remove Modbus register
        store.setValues(1, item.ioa - 1, [0])  # Reset to 0
        
        logger.info(f"Removed telesignal: {item.name}")
        await sio.emit('telesignals', [item.model_dump() for item in telesignals.values()])
        return {"status": "success", "message": f"Removed telesignal {item.name}"}
    return {"status": "error", "message": "Telesignal not found"}

@sio.event
async def add_telemetry(sid, data):
    item = TelemetryItem(**data)
    telemetries[item.id] = item
    # Update Modbus register with initial state
    try:
        scaled_value = int(item.value / item.scale_factor)

        store.setValues(3, item.ioa - 1, [scaled_value])  # Holding register

        telemetries[item.id].value = item.value
        telemetries[item.id].scale_factor = item.scale_factor
        telemetries[item.id].auto_mode = item.auto_mode
        telemetries[item.id].min_value = item.min_value
        telemetries[item.id].max_value = item.max_value
        
        logger.info(f"Added telemetry: {item.name} with IOA {item.ioa}")
        await sio.emit('telemetries', [item.model_dump() for item in telemetries.values()])
        return {"status": "success", "message": f"Added telemetry {item.name}"}
    except Exception as e:
        logger.error(f"Error adding telemetry: {e}")
        return {"status": "error", "message": "Failed to add telemetry"}    

@sio.event
async def update_telemetry(sid, data):
    id = data.get('id')
    
    if id:
        for item_id, item in list(telemetries.items()):
            if id == item_id:
                # Check if IOA is being updated
                old_ioa = item.ioa
                new_ioa = data.get('ioa')
                
                # Handle IOA update if needed
                if new_ioa is not None and old_ioa != new_ioa:
                    # Remove old IOA
                    store.setValues(3, old_ioa - 1, [0])
                    
                    scale_factor = data.get('scale_factor', item.scale_factor)
                    # TODO UPDATE IN THE FUTURE TO HANDLE FLOATING POINTS
                    # if scale_factor >= 1:
                    #     value_type = MeasuredValueScaled
                    #     scaled_value = int(item.value / scale_factor)
                    # else:
                    #     value_type = 
                    #     scaled_value = item.value
                    scaled_value = int(item.value / scale_factor)
                    
                    store.setValues(3, new_ioa - 1, [scaled_value])
                    
                    # update auto_mode and other metadata for new ioa
                    telemetries[item_id].ioa = new_ioa
                    telemetries[item_id].name = data.get('name', item.name)
                    telemetries[item_id].interval = data.get('interval', item.interval)
                    telemetries[item_id].unit = data.get('unit', item.unit)
                    telemetries[item_id].auto_mode = data.get('auto_mode', item.auto_mode)
                    telemetries[item_id].min_value = data.get('min_value', item.min_value)
                    telemetries[item_id].max_value = data.get('max_value', item.max_value)                                        
                    telemetries[item_id].scale_factor = scale_factor
                    
                    
                # Update all fields that are provided in the data
                for key, value in data.items():
                    if hasattr(telemetries[item_id], key) and key != 'id':
                        setattr(telemetries[item_id], key, value)
                        
                        # Update IEC server for the IOA value
                        if key == 'value':
                            scaled_value = int(item.value / item.scale_factor)
                            store.setValues(3, item.ioa - 1, [scaled_value])
                            
                logger.info(f"Updated telemetry: {item.name}, data: {telemetries[item_id].model_dump()}")
                await sio.emit('telemetries', [item.model_dump() for item in telemetries.values()])
                return {"status": "success"}
    return {"status": "error", "message": "Telemetry not found"}
        
@sio.event
async def remove_telemetry(sid, data):
    item_id = data.get('id')
    if item_id and item_id in telemetries:
        item = telemetries.pop(item_id)
        
        # Remove Modbus register
        store.setValues(3, item.ioa - 1, [0])  # Reset to 0
        
        logger.info(f"Removed telemetry: {item.name}")
        await sio.emit('telemetries', [item.model_dump() for item in telemetries.values()])
        return {"status": "success", "message": f"Removed telemetry {item.name}"}
    return {"status": "error", "message": "Telemetry not found"}

@sio.event
async def add_tap_changer(sid, data):
    item = TapChangerItem(**data)
    tap_changers[item.id] = item
    
    try:
        store.setValues(3, item.ioa_value - 1, [item.value])  # Holding register for value
        store.setValues(3, item.ioa_high_limit - 1, [item.value_high_limit])  # Holding register for high limit
        store.setValues(3, item.ioa_low_limit - 1, [item.value_low_limit])  # Holding register for low limit
        store.setValues(1, item.ioa_status_raise_lower - 1, [0])  # Discrete input for raise/lower status
        store.setValues(1, item.ioa_status_auto_manual - 1, [item.auto_mode])  # Discrete input for auto/manual status
        store.setValues(1, item.ioa_local_remote - 1, [item.is_local_remote])  # Discrete input for local/remote status
        store.setValues(1, item.ioa_command_raise_lower - 1, [0])  # Coil for raise/lower command
        store.setValues(1, item.ioa_command_auto_manual - 1, [item.auto_mode])  # Coil for auto/manual command
        
        logger.info(f"Added tap changer: {item.name} with IOA Value {item.ioa_value}")
        await sio.emit('tap_changers', [item.model_dump() for item in tap_changers.values()])
    except Exception as e:
        logger.error(f"Error adding tap changer: {e}")
        return {"status": "error", "message": "Failed to add tap changer"}    
    
    
@sio.event
async def update_tap_changer(sid, data):
    id = data.get('id')
    
    if id:
        for item_id, item in list(tap_changers.items()):
            if id == item_id:
                # Check if IOA is being updated
                old_ioa_value = item.ioa_value
                new_ioa_value = data.get('ioa_value')
                
                # Handle IOA update if needed
                if new_ioa_value is not None and old_ioa_value != new_ioa_value:
                    # Remove old IOA
                    store.setValues(3, old_ioa_value - 1, [0])
                    
                    store.setValues(3, new_ioa_value - 1, [item.value])
                    
                    tap_changers[item_id].ioa_value = new_ioa_value
                    tap_changers[item_id].name = data.get('name', item.name)
                    tap_changers[item_id].value_high_limit = data.get('value_high_limit', item.value_high_limit)
                    tap_changers[item_id].value_low_limit = data.get('value_low_limit', item.value_low_limit)
                    tap_changers[item_id].auto_mode = data.get('auto_mode', item.auto_mode)
                    tap_changers[item_id].is_local_remote = data.get('is_local_remote', item.is_local_remote)
                    
                # Update all fields that are provided in the data
                for key, value in data.items():
                    if hasattr(tap_changers[item_id], key) and key != 'id':
                        setattr(tap_changers[item_id], key, value)

                        # Update IEC server for the IOA value
                        if key == 'value':
                            store.setValues(3, item.ioa_value - 1, [value])
                        elif key == 'value_high_limit':
                            store.setValues(3, item.ioa_high_limit - 1, [value])
                        elif key == 'value_low_limit':
                            store.setValues(3, item.ioa_low_limit - 1, [value])
                        elif key == 'auto_mode':
                            store.setValues(1, item.ioa_status_auto_manual - 1, [value])
                        elif key == 'status_raise_lower':
                            store.setValues(1, item.ioa_status_raise_lower - 1, [value])
                        elif key == 'status_auto_manual':
                            store.setValues(1, item.ioa_status_auto_manual - 1, [value])
                        elif key == 'is_local_remote':
                            store.setValues(1, item.ioa_local_remote - 1, [value])
                        
                logger.info(f"Updated tap changer: {item.name}, data: {tap_changers[item_id].model_dump()}")
                await sio.emit('tap_changers', [item.model_dump() for item in tap_changers.values()])
                return {"status": "success"}
            
    return {"status": "error", "message": "Tap changer not found"}

@sio.event
async def remove_tap_changer(sid, data):
    item_id = data.get('id')
    if item_id and item_id in tap_changers:
        item = tap_changers.pop(item_id)

        store.setValues(3, item.ioa_value - 1, [0])  # Reset holding register for value
        store.setValues(3, item.ioa_high_limit - 1, [0])  # Reset holding register for high limit
        store.setValues(3, item.ioa_low_limit - 1, [0])  # Reset holding register for low limit
        store.setValues(1, item.ioa_status_raise_lower - 1, [0])  # Reset discrete input for raise/lower status
        store.setValues(1, item.ioa_status_auto_manual - 1, [0])  # Reset discrete input for auto/manual status
        store.setValues(1, item.ioa_local_remote - 1, [0])  # Reset discrete input for local/remote status
        store.setValues(1, item.ioa_command_raise_lower - 1, [0])  # Reset coil for raise/lower command
        store.setValues(1, item.ioa_command_auto_manual - 1, [0])  # Reset coil for auto/manual command

        logger.info(f"Removed tap changer: {item.name}")
        await sio.emit('tap_changers', [item.model_dump() for item in tap_changers.values()])
        return {"status": "success", "message": f"Removed tap changer {item.name}"}
    
    return {"status": "error", "message": "Tap changer not found"}

async def poll_ioa_values():
    """
    Continuously poll IOA values from the IEC server and send them to frontend clients.
    This function runs as a background task and sends updates every second.
    Also handles auto mode changes for telesignals and telemetry.
    """
    logger.info("Starting IOA polling task")
    
    # Track the last update time for each item
    last_update_times = {
        "circuit_breakers": {},
        "telesignals": {},
        "telemetries": {},
        "tap_changers": {}
    }
    
    while True:
        try:
            current_time = time.time()
            has_updates = {
                "circuit_breakers": False,
                "telesignals": False,
                "telemetries": False,
                "tap_changers": False
            }
            
            # Simulate telesignals in auto mode
            for item_id, item in list(telesignals.items()):
                # Skip if not due for update yet
                last_update = last_update_times["telesignals"].get(item_id, 0)
                if current_time - last_update < item.interval:
                    continue
                
                # Check if auto mode is enabled
                if not getattr(item, 'auto_mode', True):  # Default to True for backward compatibility
                    continue
                    
                new_value = random.randint(0, 1)
                if new_value != item.value:
                    telesignals[item_id].value = new_value
                    store.setValues(1, item.ioa - 1, [new_value])
                    
                    logger.info(f"Telesignal auto-updated: {item.name} (IOA: {item.ioa}) value: {telesignals[item_id].value}")
                    
                    # Record update time
                    last_update_times["telesignals"][item_id] = current_time
                    has_updates["telesignals"] = True
            
            # Simulate telemetry in auto mode
            for item_id, item in list(telemetries.items()):
                # Skip if not due for update yet
                last_update = last_update_times["telemetries"].get(item_id, 0)
                if current_time - last_update < item.interval:
                    continue
                    
                # Check if auto mode is enabled
                if not getattr(item, 'auto_mode', True):  # Default to True for backward compatibility
                    continue
                    
                # Generate a random value within range that's a multiple of the scale factor
                scale_factor = item.scale_factor
                # Determine how many possible steps exist within the range
                possible_steps = int(round((item.max_value - item.min_value) / scale_factor)) + 1
                # Choose a random step
                random_step = random.randint(0, possible_steps - 1)
                new_value = item.min_value + (random_step * scale_factor)
                # Determine precision based on scale factor
                precision = 0 if scale_factor >= 1 else -int(math.floor(math.log10(scale_factor)))
                # Round to appropriate precision to avoid floating point errors
                new_value = round(new_value, precision)
                
                # Update the telemetry object with the new value
                telemetries[item_id].value = new_value
                scaled_value = int(round(new_value / scale_factor))
                
                store.setValues(3, item.ioa - 1, [scaled_value])  # Holding register
                
                logger.info(f"Telemetry auto-updated: {item.name} (IOA: {item.ioa}) value: {telemetries[item_id].value}")
                
                # Record update time
                last_update_times["telemetries"][item_id] = current_time
                has_updates["telemetries"] = True
                
            for item_id, item in list(circuit_breakers.items()):
                 # Check if item should be updated based on interval
                last_update = last_update_times["tap_changers"].get(item_id, 0)
                if current_time - last_update >= item.interval and item.auto_mode:
                    # random value betwwen high and low limit
                    new_value = random.randint(item.value_low_limit, item.value_high_limit)
                    
                    # Update the tap changer value
                    tap_changers[item_id].value = new_value
                    
                    # Update IEC server
                    store.setValues(3, item.ioa_value - 1, [new_value])
                    
                    logger.info(f"Tap changer auto-updated: {item.name} (IOA: {item.ioa_value}) value: {new_value}")
                    
                    # Record update time
                    last_update_times["tap_changers"][item_id] = current_time
                    has_updates["tap_changers"] = True    
                
            # Broadcast updates only if there were changes
            if has_updates["circuit_breakers"] and circuit_breakers:
                await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()])
            if has_updates["telesignals"] and telesignals:
                await sio.emit('telesignals', [item.model_dump() for item in telesignals.values()])
            if has_updates["telemetries"] and telemetries:
                await sio.emit('telemetries', [item.model_dump() for item in telemetries.values()])
            if has_updates["tap_changers"] and tap_changers:
                await sio.emit('tap_changers', [item.model_dump() for item in tap_changers.values()])
                
            # Use a shorter sleep time to check more frequently, but not burn CPU
            await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"Error in IOA polling task: {str(e)}")
            await asyncio.sleep(3)  # Wait before retrying if there's an error
            
async def monitor_modbus_changes():
    """
    Poll Modbus registers, coils, and inputs every 1 ms.
    If any value changes (from any source), emit updates to the frontend.
    """
    logger.info("Starting Modbus register monitoring task")
    # Take initial snapshots
    prev_di = list(store.getValues(2, 0, 5000))
    prev_co = list(store.getValues(1, 0, 5000))
    prev_hr = list(store.getValues(3, 0, 7000))
    prev_ir = list(store.getValues(4, 0, 7000))

    while True:
        try:
            changed = False

            # Read current values
            cur_di = list(store.getValues(2, 0, 5000))
            cur_co = list(store.getValues(1, 0, 5000))
            cur_hr = list(store.getValues(3, 0, 7000))
            cur_ir = list(store.getValues(4, 0, 7000))

            # Check for changes in Discrete Inputs (2)
            if cur_di != prev_di:
                changed = True
                prev_di = cur_di.copy()
                # Update telesignals/circuit breakers as needed
                for item in telesignals.values():
                    new_val = cur_di[item.ioa - 1]
                    if item.value != new_val:
                        item.value = new_val
                for item in circuit_breakers.values():
                    if item.ioa_cb_status - 1 < len(cur_di):
                        item.cb_status_open = cur_di[item.ioa_cb_status - 1]
                    if item.ioa_cb_status_close - 1 < len(cur_di):
                        item.cb_status_close = cur_di[item.ioa_cb_status_close - 1]

            # Check for changes in Coils (1)
            if cur_co != prev_co:
                changed = True
                prev_co = cur_co.copy()
                for item in circuit_breakers.values():
                    if item.ioa_control_open - 1 < len(cur_co):
                        item.control_open = cur_co[item.ioa_control_open - 1]
                    if item.ioa_control_close - 1 < len(cur_co):
                        item.control_close = cur_co[item.ioa_control_close - 1]
                    if item.ioa_local_remote - 1 < len(cur_co):
                        item.remote = cur_co[item.ioa_local_remote - 1]

            # Check for changes in Holding Registers (3)
            if cur_hr != prev_hr:
                changed = True
                prev_hr = cur_hr.copy()
                for item in telemetries.values():
                    if item.ioa - 1 < len(cur_hr):
                        # Convert back to float using scale_factor
                        item.value = cur_hr[item.ioa - 1] * item.scale_factor
                for item in circuit_breakers.values():
                    if item.ioa_control_dp and item.ioa_control_dp - 1 < len(cur_hr):
                        item.control_dp = cur_hr[item.ioa_control_dp - 1]

            # Check for changes in Input Registers (4)
            if cur_ir != prev_ir:
                changed = True
                prev_ir = cur_ir.copy()
                for item in circuit_breakers.values():
                    if item.ioa_cb_status_dp and item.ioa_cb_status_dp - 1 < len(cur_ir):
                        item.cb_status_dp = cur_ir[item.ioa_cb_status_dp - 1]

            # Emit updates if any changes detected
            if changed:
                await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()])
                await sio.emit('telesignals', [item.model_dump() for item in telesignals.values()])
                await sio.emit('telemetries', [item.model_dump() for item in telemetries.values()])
                await sio.emit('tap_changers', [item.model_dump() for item in tap_changers.values()])

            await asyncio.sleep(0.001)  # 1 ms
        except Exception as e:
            logger.error(f"Error in Modbus monitoring task: {str(e)}")
            await asyncio.sleep(0.1)
    
@sio.event
async def export_data(sid):
    """Export all data as JSON via socket."""
    try:
        logger.info("Exporting all IOA data via socket")
        
        # Get circuit breakers with correct field names
        circuit_breaker_data = []
        for cb in circuit_breakers.values():
            cb_dict = cb.model_dump()
            # Ensure field name consistency with the model
            if "has_double_point" in cb_dict:
                cb_dict["has_double_point"] = cb_dict.get("has_double_point")
            
            circuit_breaker_data.append(cb_dict)
        
        data = {
            "circuit_breakers": circuit_breaker_data,
            "telesignals": [item.model_dump() for item in telesignals.values()],
            "telemetries": [item.model_dump() for item in telemetries.values()],
            "tap_changers": [item.model_dump() for item in tap_changers.values()],
        }
        await sio.emit('export_data_response', data, room=sid)
    except Exception as e:
        logger.error(f"Error exporting data: {e}")
        await sio.emit('export_data_error', {"error": "Failed to export data"}, room=sid)

@sio.event
async def import_data(sid, data):
    """Import all data from JSON via socket."""
    try:
        logger.info("Importing data via socket")
        # Clear existing data
        circuit_breakers.clear()
        telesignals.clear()
        telemetries.clear()
        tap_changers.clear()

        # Populate with new data
        for cb in data.get("circuit_breakers", []):
            if "is_double_point" in cb and "has_double_point" not in cb:
                cb["has_double_point"] = cb.pop["is_double_point"]
                
            item = CircuitBreakerItem(**cb)
            circuit_breakers[item.id] = item
            
            store.setValues(2, item.ioa_cb_status - 1, [False])  # Initially off
            store.setValues(2, item.ioa_cb_status_close - 1, [False])  # Initially off
            store.setValues(1, item.ioa_control_open - 1, [0])  # Initially off
            store.setValues(1, item.ioa_control_close - 1, [0])  # Initially off   
            
            if item.has_double_point:
                if item.ioa_cb_status_dp is not None:
                    store.setValues(4, item.ioa_cb_status_dp - 1, [0])
                if item.ioa_control_dp is not None:
                    store.setValues(3, item.ioa_control_dp - 1, [0])
                    
            store.setValues(1, item.ioa_local_remote_sp - 1, [False])  # Reset remote/local mode
            if item.has_local_remote_dp:
                store.setValues(1, item.ioa_local_remote_dp - 1, [False])
            
            logger.info(f"Added circuit breaker: {item.name} with IOA CB status open (for unique value): {item.ioa_cb_status}")    
            
        for ts in data.get("telesignals", []):
            item = TeleSignalItem(**ts)
            telesignals[item.id] = item
            
            # Update Modbus register with initial state
            store.setValues(1, item.ioa - 1, [item.value])  # Discrete input
            logger.info(f"Added telesignal: {item.name} with IOA {item.ioa}")

        for tm in data.get("telemetries", []):
            item = TelemetryItem(**tm)
            telemetries[item.id] = item
            # Update Modbus register with initial state
            # Scale value as needed for integer representation
            scaled_value = int(item.value / item.scale_factor)
            
            store.setValues(3, item.ioa - 1, [scaled_value])  # Holding register
            logger.info(f"Added telemetry: {item.name} with IOA {item.ioa}")
            
        for tc in data.get("tap_changers", []):
            item = TapChangerItem(**tc)
            tap_changers[item.id] = item
            
            store.setValues(3, item.ioa_value - 1, [item.value])  # Holding register for value
            store.setValues(3, item.ioa_high_limit - 1, [item.value_high_limit])  # Holding register for high limit
            store.setValues(3, item.ioa_low_limit - 1, [item.value_low_limit])  # Holding register for low limit
            store.setValues(1, item.ioa_status_raise_lower - 1, [0])  # Discrete input for raise/lower status
            store.setValues(1, item.ioa_status_auto_manual - 1, [item.auto_mode])  # Discrete input for auto/manual status
            store.setValues(1, item.ioa_local_remote - 1, [item.is_local_remote])  # Discrete input for local/remote status
            store.setValues(1, item.ioa_command_raise_lower - 1, [0])  # Coil for raise/lower command
            store.setValues(1, item.ioa_command_auto_manual - 1, [item.auto_mode])  # Coil for auto/manual command 
            
            logger.info(f"Added tap changer: {item.name} with IOA Value {item.ioa_value}")
            
        await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()], room=sid)
        await sio.emit('telesignals', [item.model_dump() for item in telesignals.values()], room=sid)
        await sio.emit('telemetries', [item.model_dump() for item in telemetries.values()], room=sid)
        await sio.emit('tap_changers', [item.model_dump() for item in tap_changers.values()], room=sid)
        await sio.emit('import_data_response', {"status": "success"}, room=sid)
    except Exception as e:
        logger.error(f"Error importing data: {e}")
        await sio.emit('import_data_error', {"error": "Failed to import data"}, room=sid)
            
@sio.event
async def update_order(sid, data):
    item_type = data.get('type')
    item_ids = data.get('items', [])
    
    if item_type == 'circuit_breakers':
        # Reorder circuit_breakers based on item_ids
        global circuit_breakers
        ordered_items = {}
        for id in item_ids:
            if id in circuit_breakers:
                ordered_items[id] = circuit_breakers[id]
        circuit_breakers = ordered_items
        
    elif item_type == 'telesignals':
        # Reorder telesignals
        global telesignals
        ordered_items = {}
        for id in item_ids:
            if id in telesignals:
                ordered_items[id] = telesignals[id]
        telesignals = ordered_items
        
    elif item_type == 'telemetries':
        # Reorder telemetries
        global telemetries
        ordered_items = {}
        for id in item_ids:
            if id in telemetries:
                ordered_items[id] = telemetries[id]
        telemetries = ordered_items    
        
    elif item_type == 'tap_changers':
        # Reorder tap_changers
        global tap_changers
        ordered_items = {}
        for id in item_ids:
            if id in tap_changers:
                ordered_items[id] = tap_changers[id]
        tap_changers = ordered_items
        
device = ModbusDeviceIdentification(
        info_name={
            "VendorName": "Pymodbus",
            "ProductCode": "PM",
            "VendorUrl": "https://github.com/pymodbus-dev/pymodbus/",
            "ProductName": "Pymodbus Server",
            "ModelName": "Pymodbus Server",
            "MajorMinorRevision": pymodbus_version,
        }
    )

# Start the MODBUS server
def run_modbus_server():
    StartTcpServer(
        context=context, 
        address=(MODBUS_HOST, MODBUS_PORT),
        framer=FramerType.SOCKET,
        identity=device,
    )

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup code
    # Start Modbus server using threading instead of asyncio
    server_thread = threading.Thread(target=run_modbus_server, daemon=True)
    server_thread.start()
    logger.info(f"Started MODBUS TCP Server on {MODBUS_HOST}:{MODBUS_PORT}")

    # Start the Socket.IO update task
    poll_task = asyncio.create_task(poll_ioa_values())
    monitor_task = asyncio.create_task(monitor_modbus_changes())
    logger.info("Started Socket.IO simulation task and MODBUS register monitoring task")

    try:
        yield
    finally:
        # Shutdown code
        ServerStop()
        poll_task.cancel()
        monitor_task.cancel()
        logger.info("Shutting down Socket.IO simulation task")

# Assign lifespan handler to app
app = FastAPI(lifespan=lifespan)
socket_app = socketio.ASGIApp(sio, app)

# API endpoint home
@app.get("/")
async def root():
    return {
        "message": "Modbus TCP Server Simulator API", 
        "status": "running",
        "items": {
            "circuit_breakers": len(circuit_breakers),
            "telesignals": len(telesignals),
            "telemetries": len(telemetries),
            "tap_changers": len(tap_changers)
        }
    }

if __name__ == "__main__":
    uvicorn.run(socket_app, host=FASTAPI_HOST, port=FASTAPI_PORT)