import asyncio
import threading
import time
from typing import Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from pymodbus.server import StartTcpServer, StartAsyncTcpServer, ServerStop
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
from data_models import CircuitBreakerItem, TeleSignalItem, TelemetryItem
from pymodbus import __version__ as pymodbus_version

# Configure logging
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
        # 1. CB Status Single Open (Discrete Input) - Register type 2
        store.setValues(2, item.ioa_cb_status - 1, [False])
        
        # 2. CB Status Single Close (Discrete Input) - Register type 2
        store.setValues(2, item.ioa_cb_status_close - 1, [False])
        
        # 3. CB Status Double Point (Input Register) if enabled - Register type 4
        if item.is_double_point and item.ioa_cb_status_dp:
            store.setValues(4, item.ioa_cb_status_dp - 1, [0])
            # Control Double (Holding Register) if enabled
            store.setValues(3, item.ioa_control_dp - 1, [0])  # Initially off
        
        # 4. Control Open/Close (Coils) - Register type 1
        store.setValues(1, item.ioa_control_open - 1, [0])  # Initially off
        store.setValues(1, item.ioa_control_close - 1, [0])  # Initially off
        
        # 6. Local/Remote (Coil) - Register type 1
        store.setValues(1, item.ioa_local_remote - 1, [item.remote])
        
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
        if item.ioa_cb_status == ioa_cb_status:
            # Update remote status if provided
            if 'remote' in data:
                circuit_breakers[item_id].remote = data['remote']
                store.setValues(1, item.ioa_local_remote - 1, [data['remote']])
                
            # Update value if provided
            if 'cb_status_open' in data:
                circuit_breakers[item_id].cb_status_open = data['cb_status_open']
                store.setValues(2, item.ioa_cb_status - 1, [data['cb_status_open']])
                
            if 'cb_status_close' in data:
                circuit_breakers[item_id].cb_status_close = data['cb_status_close']
                store.setValues(2, item.ioa_cb_status_close - 1, [data['cb_status_close']])
                
            if 'cb_status_dp' in data:
                circuit_breakers[item_id].cb_status_dp = data['cb_status_dp']
                store.setValues(4, item.ioa_cb_status_dp - 1, [data['cb_status_dp']])
                
            if 'control_open' in data:
                circuit_breakers[item_id].control_open = data['control_open']
                store.setValues(1, item.ioa_control_open - 1, [data['control_open']])
                
            if 'control_close' in data:
                circuit_breakers[item_id].control_close = data['control_close']
                store.setValues(1, item.ioa_control_close - 1, [data['control_close']])
                
            if 'control_dp' in data:
                circuit_breakers[item_id].control_dp = data['control_dp']
                store.setValues(3, item.ioa_control_dp - 1, [data['control_dp']])
                
            # Handle SBO mode update if provided
            if 'is_sbo' in data:
                circuit_breakers[item_id].is_sbo = data['is_sbo']
                
            # Handle double point mode update if provided
            if 'is_double_point' in data:
                circuit_breakers[item_id].is_double_point = data['is_double_point']
            
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
        if item.is_double_point and item.ioa_cb_status_dp:
            store.setValues(4, item.ioa_cb_status_dp - 1, [0])
            store.setValues(3, item.ioa_control_dp - 1, [0])
        store.setValues(1, item.ioa_local_remote - 1, [False])
        
        logger.info(f"Removed circuit breaker: {item.name}")
        await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()])
        return {"status": "success", "message": f"Removed circuit breaker {item.name}"}
    return {"status": "error", "message": "Circuit breaker not found"}

@sio.event
async def add_tele_signal(sid, data):
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
    ioa = data.get('ioa')
    # Find the item by IOA
    for item_id, item in list(telesignals.items()):
        if item.ioa == ioa:
            # Update auto_mode if provided
            if 'auto_mode' in data:
                telesignals[item_id].auto_mode = data['auto_mode']
                logger.info(f"Telesignal set auto_mode to {data['auto_mode']} name: {item.name} (IOA: {item.ioa})")
            
            # Update value if provided
            if 'value' in data:
                new_value = data['value']
                telesignals[item_id].value = new_value
                store.setValues(1, item.ioa - 1, [new_value])
                logger.info(f"Telesignal updated: {item.name} (IOA: {item.ioa}) value: {item.value}")
            
            await sio.emit('telesignals', [item.model_dump() for item in telesignals.values()])
            return {"status": "success"}
    
    return {"status": "error", "message": "Telesignal not found"}

@sio.event
async def remove_tele_signal(sid, data):
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
    ioa = data.get('ioa')
    # Find the item by IOA
    for item_id, item in list(telemetries.items()):
        if item.ioa == ioa:
            # Update auto_mode if provided
            if 'auto_mode' in data:
                telemetries[item_id].auto_mode = data['auto_mode']
                logger.info(f"Telemetry set auto_mode to {data['auto_mode']} name: {item.name} (IOA: {item.ioa})")
            
            # Update value if provided
            if 'value' in data:
                new_value = data['value']
                telemetries[item_id].value = new_value
                scaled_value = int(round(new_value / item.scale_factor))
                store.setValues(3, item.ioa - 1, [scaled_value])
                logger.info(f"Telemetry updated: {item.name} (IOA: {item.ioa}) value: {item.value}")
            
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
        "telemetries": {}
    }
    
    while True:
        try:
            current_time = time.time()
            has_updates = {
                "circuit_breakers": False,
                "telesignals": False,
                "telemetries": False
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
                
            # Broadcast updates only if there were changes
            if has_updates["circuit_breakers"] and circuit_breakers:
                await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()])
            if has_updates["telesignals"] and telesignals:
                await sio.emit('telesignals', [item.model_dump() for item in telesignals.values()])
            if has_updates["telemetries"] and telemetries:
                await sio.emit('telemetries', [item.model_dump() for item in telemetries.values()])
                
            # Use a shorter sleep time to check more frequently, but not burn CPU
            await asyncio.sleep(0.1)
        except Exception as e:
            logger.error(f"Error in IOA polling task: {str(e)}")
            await asyncio.sleep(3)  # Wait before retrying if there's an error
    
@sio.event
async def export_data(sid):
    """Export all data as JSON via socket."""
    try:
        logger.info("Exporting all IOA data via socket")
        data = {
            "circuit_breakers": [item.model_dump() for item in circuit_breakers.values()],
            "telesignals": [item.model_dump() for item in telesignals.values()],
            "telemetries": [item.model_dump() for item in telemetries.values()],
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

        # Populate with new data
        for cb in data.get("circuit_breakers", []):
            item = CircuitBreakerItem(**cb)
            circuit_breakers[item.id] = item
            
            # Update Modbus registers with initial states
            store.setValues(2, item.ioa_cb_status - 1, [False])
            store.setValues(2, item.ioa_cb_status_close - 1, [False])
            if item.is_double_point and item.ioa_cb_status_dp:
                store.setValues(4, item.ioa_cb_status_dp - 1, [0])
                store.setValues(3, item.ioa_control_dp - 1, [0])
                
            store.setValues(1, item.ioa_control_open - 1, [0])
            store.setValues(1, item.ioa_control_close - 1, [0])
            store.setValues(1, item.ioa_local_remote - 1, [item.remote])
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
            
        await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()], room=sid)
        await sio.emit('telesignals', [item.model_dump() for item in telesignals.values()], room=sid)
        await sio.emit('telemetries', [item.model_dump() for item in telemetries.values()], room=sid)
        await sio.emit('import_data_response', {"status": "success"}, room=sid)
    except Exception as e:
        logger.error(f"Error importing data: {e}")
        await sio.emit('import_data_error', {"error": "Failed to import data"}, room=sid)
            
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
    task = asyncio.create_task(poll_ioa_values())
    logger.info("Started Socket.IO simulation task")

    try:
        yield
    finally:
        # Shutdown code
        ServerStop()
        task.cancel()
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
            "telemetries": len(telemetries)
        }
    }

if __name__ == "__main__":
    uvicorn.run(socket_app, host=FASTAPI_HOST, port=FASTAPI_PORT)