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

# Default configurations
# register_configs = {
#     'VR': {'min_value': 200, 'max_value': 300, 'interval': 1, 'address': 0},
#     'P': {'min_value': 100, 'max_value': 200, 'interval': 1, 'address': 1},
#     'Q': {'min_value': 150, 'max_value': 300, 'interval': 1, 'address': 2},
#     'PF': {'min_value': 100, 'max_value': 200, 'interval': 1, 'address': 3},
#     'VS': {'min_value': 200, 'max_value': 300, 'interval': 1, 'address': 4},
#     'VT': {'min_value': 200, 'max_value': 300, 'interval': 1, 'address': 5},
#     'F': {'min_value': 49, 'max_value': 51, 'interval': 1, 'address': 6},
#     'IR': {'min_value': 90, 'max_value': 100, 'interval': 1, 'address': 7},
#     'IS': {'min_value': 90, 'max_value': 100, 'interval': 1, 'address': 8},
#     'IT': {'min_value': 90, 'max_value': 100, 'interval': 1, 'address': 9}
# }

# coil_configs = {
#     'CB': {'interval': 10, 'address': 0},
#     'LOCAL': {'interval': 10, 'address': 1},
#     'OCR': {'interval': 10, 'address': 2},
#     'GFT': {'interval': 10, 'address': 3},
#     'RACK IN': {'interval': 10, 'address': 4},
#     'RACK OUT': {'interval': 10, 'address': 5}
# }

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

# Timer function to simulate value changes
async def simulate_values():
    while True:
        # Simulate circuit breakers in auto mode
        for item_id, item in list(circuit_breakers.items()):
            if not item.remote:  # Only change values if not in remote mode
                continue
                
            new_value = random.randint(item.min_value, item.max_value)
            if new_value != item.value:
                circuit_breakers[item_id].value = new_value
                store.setValues(1, item.ioa_data, [new_value])
                if item.is_double_point and item.ioa_data_dp:
                    store.setValues(1, item.ioa_data_dp, [new_value >> 1])
        
        # Simulate telesignals in auto mode
        for item_id, item in list(tele_signals.items()):
            # Add auto mode check here if implemented in frontend
            new_value = random.randint(item.min_value, item.max_value)
            if new_value != item.value:
                tele_signals[item_id].value = new_value
                store.setValues(2, item.ioa, [new_value])
        
        # Simulate telemetry in auto mode
        for item_id, item in list(telemetry_items.items()):
            # Add auto mode check here if implemented in frontend
            new_value = random.uniform(item.min_value, item.max_value)
            telemetry_items[item_id].value = round(new_value, 2)
            scaled_value = int(new_value / item.scale_factor)
            store.setValues(3, item.ioa, [scaled_value])
            
        # Broadcast updates
        if circuit_breakers:
            await sio.emit('circuit_breakers', [item.model_dump() for item in circuit_breakers.values()])
        if tele_signals:
            await sio.emit('tele_signals', [item.model_dump() for item in tele_signals.values()])
        if telemetry_items:
            await sio.emit('telemetry_items', [item.model_dump() for item in telemetry_items.values()])
            
        await asyncio.sleep(1)

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