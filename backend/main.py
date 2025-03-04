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

# Data models for configuration
class RegisterConfig(BaseModel):
    name: str
    min_value: int
    max_value: int
    interval: int
    address: int

class CoilConfig(BaseModel):
    name: str
    interval: int
    address: int

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

# Default configurations
register_configs = {
    'VR': {'min_value': 200, 'max_value': 300, 'interval': 1, 'address': 0},
    'P': {'min_value': 100, 'max_value': 200, 'interval': 1, 'address': 1},
    'Q': {'min_value': 150, 'max_value': 300, 'interval': 1, 'address': 2},
    'PF': {'min_value': 100, 'max_value': 200, 'interval': 1, 'address': 3},
    'VS': {'min_value': 200, 'max_value': 300, 'interval': 1, 'address': 4},
    'VT': {'min_value': 200, 'max_value': 300, 'interval': 1, 'address': 5},
    'F': {'min_value': 49, 'max_value': 51, 'interval': 1, 'address': 6},
    'IR': {'min_value': 90, 'max_value': 100, 'interval': 1, 'address': 7},
    'IS': {'min_value': 90, 'max_value': 100, 'interval': 1, 'address': 8},
    'IT': {'min_value': 90, 'max_value': 100, 'interval': 1, 'address': 9}
}

coil_configs = {
    'CB': {'interval': 10, 'address': 0},
    'LOCAL': {'interval': 10, 'address': 1},
    'OCR': {'interval': 10, 'address': 2},
    'GFT': {'interval': 10, 'address': 3},
    'RACK IN': {'interval': 10, 'address': 4},
    'RACK OUT': {'interval': 10, 'address': 5}
}

# Initialize MODBUS Data Store with 3 Coils
store = ModbusSlaveContext(
    di=ModbusSequentialDataBlock(0, [0] * 10),  # Discrete Inputs
    co=ModbusSequentialDataBlock(0, [0] * 1000),  # Coil Statuses
    hr=ModbusSequentialDataBlock(0, [0] * 20000),  # Holding Registers
    ir=ModbusSequentialDataBlock(0, [0] * 10),  # Input Registers
)
context = ModbusServerContext(slaves=store, single=True)

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit('register_config', register_configs, room=sid)
    await sio.emit('coil_config', coil_configs, room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

# Function to emit updated values via Socket.IO
async def emit_updates():
    coil_timers = {name: 0 for name in coil_configs.keys()}
    register_timers = {name: 0 for name in register_configs.keys()}

    while True:
        # Update holding registers
        hr_values = {}
        hr_updates = []
        
        for name, config in register_configs.items():
            register_timers[name] += 1
            if register_timers[name] >= config['interval']:
                register_timers[name] = 0
                value = random.randint(config['min_value'], config['max_value'])
                hr_values[name] = value
                hr_updates.append((config['address'], value))
        
        if hr_values:
            logger.debug(f"Emitting register update: {hr_values}")
            for address, value in hr_updates:
                store.setValues(3, address, [value])
            await sio.emit('register_update', hr_values)
        
        # Update coils
        coil_values = {}
        coil_updates = []
        
        for name, config in coil_configs.items():
            coil_timers[name] += 1
            if coil_timers[name] >= config['interval']:
                coil_timers[name] = 0
                value = random.choice([0, 1])
                coil_values[name] = value
                coil_updates.append((config['address'], value))
        
        if coil_values:
            logger.debug(f"Emitting coil update: {coil_values}")
            for address, value in coil_updates:
                store.setValues(1, address, [value])
            await sio.emit('coil_update', coil_values)
        
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
    task = asyncio.create_task(emit_updates())
    logger.info("Started Socket.IO update task")

    try:
        yield
    finally:
        # Shutdown code (optional)
        task.cancel()
        logger.info("Shutting down Socket.IO update task")

# Assign lifespan handler to app
app = FastAPI(lifespan=lifespan)
socket_app = socketio.ASGIApp(sio, app)

# API endpoints
@app.get("/")
async def root():
    return {"message": "Modbus TCP Server Simulator API"}

if __name__ == "__main__":
    uvicorn.run(socket_app, host=FASTAPI_HOST, port=FASTAPI_PORT)