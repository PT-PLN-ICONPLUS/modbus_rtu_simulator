import time
from typing import Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from pymodbus.server import StartTcpServer
from pymodbus.datastore import ModbusSlaveContext, ModbusServerContext
from pymodbus.datastore import ModbusSequentialDataBlock
import threading
import random
from dotenv import load_dotenv
import os
import logging
import asyncio
from contextlib import asynccontextmanager
import uvicorn
from pydantic import BaseModel
from data_models import CircuitBreakerItem, TeleSignalItem, TelemetryItem

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
tele_signals: Dict[str, TeleSignalItem] = {}
telemetry_items: Dict[str, TelemetryItem] = {}

# Initialize MODBUS Data Store with sufficient space
store = ModbusSlaveContext(
    di=ModbusSequentialDataBlock(0, [0] * 10000),  # Discrete Inputs
    co=ModbusSequentialDataBlock(0, [0] * 10000),  # Coil Statuses
    hr=ModbusSequentialDataBlock(0, [0] * 20000),  # Holding Registers
    ir=ModbusSequentialDataBlock(0, [0] * 10000),  # Input Registers
)
context = ModbusServerContext(slaves=store, single=True)

# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    # Send current state to new clients
    await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()], room=sid)
    await sio.emit('tele_signals', [item.model_dump() for item in tele_signals.values()], room=sid)
    await sio.emit('telemetry_items', [item.model_dump() for item in telemetry_items.values()], room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    
@sio.event
async def add_circuit_breaker(sid, data):
    item = CircuitBreakerItem(**data)
    circuit_breakers[item.id] = item
    # Update Modbus register with initial state
    store.setValues(1, item.ioa_data, [item.value])
    if item.is_double_point and item.ioa_data_dp:
        store.setValues(1, item.ioa_data_dp, [item.value])
    logger.info(f"Added circuit breaker: {item.name} with IOA {item.ioa_data}")
    await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()])
    return {"status": "success", "message": f"Added circuit breaker {item.name}"}

@sio.event
async def remove_circuit_breaker(sid, data):
    item_id = data.get('id')
    if item_id and item_id in circuit_breakers:
        item = circuit_breakers.pop(item_id)
        logger.info(f"Removed circuit breaker: {item.name}")
        await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()])
        return {"status": "success", "message": f"Removed circuit breaker {item.name}"}
    return {"status": "error", "message": "Circuit breaker not found"}

@sio.event
async def add_tele_signal(sid, data):
    item = TeleSignalItem(**data)
    tele_signals[item.id] = item
    # Update Modbus register with initial state
    store.setValues(2, item.ioa, [item.value])  # Discrete input
    logger.info(f"Added telesignal: {item.name} with IOA {item.ioa}")
    await sio.emit('tele_signals', [item.model_dump() for item in tele_signals.values()])
    return {"status": "success", "message": f"Added telesignal {item.name}"}

@sio.event
async def update_telesignal(sid, data):
    ioa = data.get('ioa')
    # Find the item by IOA
    for item_id, item in list(tele_signals.items()):
        if item.ioa == ioa:
            # Update auto_mode if provided
            if 'auto_mode' in data:
                tele_signals[item_id].auto_mode = data['auto_mode']
            
            # Update value if provided
            if 'value' in data:
                new_value = data['value']
                tele_signals[item_id].value = new_value
                store.setValues(2, item.ioa, [new_value])
            
            logger.info(f"Updated telesignal: {item.name} (IOA: {item.ioa})")
            await sio.emit('tele_signals', [item.model_dump() for item in tele_signals.values()])
            return {"status": "success"}
    
    return {"status": "error", "message": "Telesignal not found"}

@sio.event
async def remove_tele_signal(sid, data):
    item_id = data.get('id')
    if item_id and item_id in tele_signals:
        item = tele_signals.pop(item_id)
        logger.info(f"Removed telesignal: {item.name}")
        await sio.emit('tele_signals', [item.model_dump() for item in tele_signals.values()])
        return {"status": "success", "message": f"Removed telesignal {item.name}"}
    return {"status": "error", "message": "Telesignal not found"}

@sio.event
async def add_telemetry(sid, data):
    item = TelemetryItem(**data)
    telemetry_items[item.id] = item
    # Update Modbus register with initial state
    # Scale value as needed for integer representation
    scaled_value = int(item.value / item.scale_factor)
    store.setValues(3, item.ioa, [scaled_value])  # Holding register
    logger.info(f"Added telemetry: {item.name} with IOA {item.ioa}")
    await sio.emit('telemetry_items', [item.model_dump() for item in telemetry_items.values()])
    return {"status": "success", "message": f"Added telemetry {item.name}"}

@sio.event
async def remove_telemetry(sid, data):
    item_id = data.get('id')
    if item_id and item_id in telemetry_items:
        item = telemetry_items.pop(item_id)
        logger.info(f"Removed telemetry: {item.name}")
        await sio.emit('telemetry_items', [item.model_dump() for item in telemetry_items.values()])
        return {"status": "success", "message": f"Removed telemetry {item.name}"}
    return {"status": "error", "message": "Telemetry not found"}



async def simulate_values():
    # Track the last update time for each item
    last_update_times = {
        "circuit_breakers": {},
        "tele_signals": {},
        "telemetry_items": {}
    }
    
    while True:
        current_time = time.time()
        has_updates = {
            "circuit_breakers": False,
            "tele_signals": False,
            "telemetry_items": False
        }
        
        # Simulate circuit breakers in auto mode
        for item_id, item in list(circuit_breakers.items()):
            # Skip if not due for update yet
            last_update = last_update_times["circuit_breakers"].get(item_id, 0)
            if current_time - last_update < item.interval:
                continue
                
            if not item.remote:  # Only change values if not in remote mode
                continue
                
            new_value = random.randint(item.min_value, item.max_value)
            if new_value != item.value:
                circuit_breakers[item_id].value = new_value
                store.setValues(1, item.ioa_data, [new_value])
                if item.is_double_point and item.ioa_data_dp:
                    store.setValues(1, item.ioa_data_dp, [new_value >> 1])
                    
                # Record update time
                last_update_times["circuit_breakers"][item_id] = current_time
                has_updates["circuit_breakers"] = True
        
        # Simulate telesignals in auto mode
        for item_id, item in list(tele_signals.items()):
            # Skip if not due for update yet
            last_update = last_update_times["tele_signals"].get(item_id, 0)
            if current_time - last_update < item.interval:
                continue
            
            # Check if auto mode is enabled
            if not getattr(item, 'auto_mode', True):  # Default to True for backward compatibility
                continue
                
            new_value = random.randint(item.min_value, item.max_value)
            if new_value != item.value:
                tele_signals[item_id].value = new_value
                store.setValues(2, item.ioa, [new_value])
                
                # Record update time
                last_update_times["tele_signals"][item_id] = current_time
                has_updates["tele_signals"] = True
        
        # Simulate telemetry in auto mode
        for item_id, item in list(telemetry_items.items()):
            # Skip if not due for update yet
            last_update = last_update_times["telemetry_items"].get(item_id, 0)
            if current_time - last_update < item.interval:
                continue
                
            # Add auto mode check here if implemented in frontend
            new_value = random.uniform(item.min_value, item.max_value)
            telemetry_items[item_id].value = round(new_value, 2)
            scaled_value = int(new_value / item.scale_factor)
            store.setValues(3, item.ioa, [scaled_value])
            
            # Record update time
            last_update_times["telemetry_items"][item_id] = current_time
            has_updates["telemetry_items"] = True
            
        # Broadcast updates only if there were changes
        if has_updates["circuit_breakers"] and circuit_breakers:
            await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()])
        if has_updates["tele_signals"] and tele_signals:
            await sio.emit('tele_signals', [item.model_dump() for item in tele_signals.values()])
        if has_updates["telemetry_items"] and telemetry_items:
            await sio.emit('telemetry_items', [item.model_dump() for item in telemetry_items.values()])
            
        # Use a shorter sleep time to check more frequently, but not burn CPU
        await asyncio.sleep(0.1)

# Start the MODBUS server
def start_modbus_server():
    StartTcpServer(context, address=(MODBUS_HOST, MODBUS_PORT))

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup code
    modbus_thread = threading.Thread(target=start_modbus_server, daemon=True)
    modbus_thread.start()
    logger.info(f"Started MODBUS TCP Server on {MODBUS_HOST}:{MODBUS_PORT}")

    # Start the Socket.IO update task
    task = asyncio.create_task(simulate_values())
    logger.info("Started Socket.IO simulation task")

    try:
        yield
    finally:
        # Shutdown code
        task.cancel()
        logger.info("Shutting down Socket.IO simulation task")

# Assign lifespan handler to app
app = FastAPI(lifespan=lifespan)
socket_app = socketio.ASGIApp(sio, app)

# API endpoints
@app.get("/")
async def root():
    return {
        "message": "Modbus TCP Server Simulator API", 
        "status": "running",
        "items": {
            "circuit_breakers": len(circuit_breakers),
            "tele_signals": len(tele_signals),
            "telemetry_items": len(telemetry_items)
        }
    }

@app.get("/status")
async def status():
    return {
        "modbus_server": {
            "host": MODBUS_HOST,
            "port": MODBUS_PORT,
            "status": "running"
        },
        "socket_server": {
            "host": FASTAPI_HOST,
            "port": FASTAPI_PORT,
            "status": "running"
        },
        "items": {
            "circuit_breakers": len(circuit_breakers),
            "tele_signals": len(tele_signals),
            "telemetry_items": len(telemetry_items)
        }
    }

if __name__ == "__main__":
    uvicorn.run(socket_app, host=FASTAPI_HOST, port=FASTAPI_PORT)