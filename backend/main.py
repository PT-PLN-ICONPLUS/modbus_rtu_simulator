from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from pymodbus.server import StartTcpServer
from pymodbus.datastore import ModbusSlaveContext, ModbusServerContext
from pymodbus.datastore import ModbusSequentialDataBlock
import threading
import random
import time
from dotenv import load_dotenv
import os
import logging
import asyncio
from contextlib import asynccontextmanager
import uvicorn

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
socket_app = socketio.ASGIApp(sio, app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MODBUS Data Store with 3 Coils
store = ModbusSlaveContext(
    di=ModbusSequentialDataBlock(0, [0] * 10),  # Discrete Inputs
    co=ModbusSequentialDataBlock(0, [0] * 10),  # Coil Statuses
    hr=ModbusSequentialDataBlock(0, [0] * 10),  # Holding Registers
    ir=ModbusSequentialDataBlock(0, [0] * 10),  # Input Registers
)
context = ModbusServerContext(slaves=store, single=True)

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

# Function to emit updated values via Socket.IO
async def emit_updates():
    while True:
        # Update coils
        coil_values = [random.choice([0, 1]) for _ in range(6)]
        store.setValues(1, 0, coil_values)
        logger.debug(f"Emitting coil update: {coil_values}") 
        await sio.emit('coil_update', {'values': coil_values})

        # Update holding registers
        hr_values = {
            'VR': random.randint(200, 300),
            'P': random.randint(100, 200),
            'Q': random.randint(150, 300),
            'PF': random.randint(100, 200),
            'VS': random.randint(200, 300),
            'VT': random.randint(200, 300),
            'F': random.randint(49, 51),
            'IR': random.randint(90, 100),
            'IS': random.randint(90, 100),
            'IT': random.randint(90, 100)
        }
        logger.debug(f"Emitting register update: {hr_values}")
        store.setValues(3, 0, list(hr_values.values()))
        await sio.emit('register_update', hr_values)
        
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

# API endpoints
@app.get("/")
async def root():
    return {"message": "Modbus TCP Server Simulator API"}

if __name__ == "__main__":
    uvicorn.run(app, host=FASTAPI_HOST, port=FASTAPI_PORT)