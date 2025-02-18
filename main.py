from pymodbus.server import StartTcpServer
from pymodbus.datastore import ModbusSlaveContext, ModbusServerContext
from pymodbus.datastore import ModbusSequentialDataBlock
import threading
import random
import time
from dotenv import load_dotenv
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

host = os.getenv("HOST", "127.0.0.1")
port = os.getenv("PORT", 5020)

# Initialize MODBUS Data Store with 3 Coils
store = ModbusSlaveContext(
    di=ModbusSequentialDataBlock(0, [0] * 10),  # Discrete Inputs
    co=ModbusSequentialDataBlock(0, [0] * 10),  # Coil Statuses
    hr=ModbusSequentialDataBlock(0, [0] * 10),  # Holding Registers
    ir=ModbusSequentialDataBlock(0, [0] * 10),  # Input Registers
)
context = ModbusServerContext(slaves=store, single=True)

# Function to Randomly Update Coil Values Every 10 Seconds
def update_coils():
    while True:
        values = [random.choice([0, 1]) for _ in range(6)]  # Generate random True/False values
        store.setValues(1, 0, values)  # Update coil values (Function Code 1)
        logger.debug(f"Updated Coils: {values}")
        time.sleep(10)  # Wait 10 seconds before next update

# Function to Randomly Update Holding Registers Every 1 Second
def update_holding_registers():
    while True:
        values = [
            random.randint(200, 300),  # VR
            random.randint(100, 200),  # P
            random.randint(150, 300),  # Q
            random.randint(100, 200),  # PF
            random.randint(200, 300),  # VS
            random.randint(200, 300),  # VT
            random.randint(49, 51),    # F
            random.randint(90, 100),   # IR
            random.randint(90, 100),   # IS
            random.randint(90, 100)    # IT
        ]
        store.setValues(3, 0, values)  # Update holding registers (Function Code 3)
        logger.debug(f"Updated Holding Registers: {values}")
        time.sleep(1)  # Wait 1 second before next update

# Start the MODBUS Server in a Separate Thread
logger.info(f"Starting MODBUS TCP Server on {host}:{port}")
server_thread = threading.Thread(target=StartTcpServer, args=(context,), kwargs={"address": (host, int(port))}, daemon=True)
server_thread.start()

# Start the Coil Updating Thread
update_thread = threading.Thread(target=update_coils, daemon=True)
update_thread.start()
logger.info("Started coil update thread")

# Start the Holding Register Updating Thread
update_hr_thread = threading.Thread(target=update_holding_registers, daemon=True)
update_hr_thread.start()
logger.info("Started holding register update thread")

# Keep the script running
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    logger.info("Shutting down MODBUS server")