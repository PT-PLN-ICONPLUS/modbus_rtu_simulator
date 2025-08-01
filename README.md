# Modbus TCP Server Simulator

This project is a simulator for a Modbus TCP server, designed to mimic the behavior of real-world devices in a SCADA (Supervisory Control and Data Acquisition) system. This makes it an excellent tool for development, testing, and training purposes.

This project especially built for [PLN Icon PLus](https://plniconplus.co.id/)'s GRITA project, which is a SCADA system for monitoring and controlling electrical grids in Indonesia.

The application features a FastAPI backend to handle the Modbus logic and a React frontend for a user-friendly interface to control and monitor the simulated devices.

## 📖 Table of Contents

- [Modbus TCP Server Simulator](#modbus-tcp-server-simulator)
  - [📖 Table of Contents](#-table-of-contents)
  - [🔌 Protocol and Application](#-protocol-and-application)
    - [Modbus TCP](#modbus-tcp)
    - [Application Function](#application-function)
  - [✨ Features](#-features)
  - [🛠️ Tech Stack](#️-tech-stack)
  - [🧩 Core Components](#-core-components)
    - [1. Circuit Breaker](#1-circuit-breaker)
    - [2. Tap Changer](#2-tap-changer)
    - [3. Telesignal (Digital Input)](#3-telesignal-digital-input)
    - [4. Telemetry (Analog Input)](#4-telemetry-analog-input)
  - [📂 Data Structure](#-data-structure)
    - [Example JSON](#example-json)
  - [🚀 Getting Started](#-getting-started)
    - [How to Run Locally](#how-to-run-locally)
    - [How to Run Locally (using Docker Compose)](#how-to-run-locally-using-docker-compose)
      - [Prerequisites](#prerequisites)
  - [☁️ Deployment](#️-deployment)
    - [How to Deploy in Kubernetes](#how-to-deploy-in-kubernetes)
    - [Installing](#installing)
    - [Uninstalling](#uninstalling)
  - [🗺️ Address Mapping](#️-address-mapping)
  - [✍️ Author](#️-author)

## 🔌 Protocol and Application

### Modbus TCP

Modbus TCP is a variant of the popular Modbus family of serial communication protocols. It is used for connecting supervisory and control devices over TCP/IP networks. In SCADA systems, it allows a central control station (master/client) to communicate with remote field devices like RTUs (slave/server) to monitor and control geographically dispersed processes, such as an electrical grid.

### Application Function

This simulator acts as a Modbus TCP server (slave). It allows you to dynamically create, configure, and manage simulated devices. A SCADA master system can connect to this simulator as if it were a physical device to:

- Read status data (Telesignals, Telemetry).
- Send control commands (e.g., open/close a Circuit Breaker).
- Test and validate the master system's configuration and logic.

## ✨ Features

- **Dynamic Configuration**: Add, remove, and edit components on the fly without restarting the application.
- **Web-Based UI**: Easy-to-use interface built with React for managing the simulation.
- **Data Persistence**: Export the current state of all components to a JSON file and import it later.
- **Containerized**: Easily run and deploy using Docker and Kubernetes.
- **Realistic Simulation**: Simulates key components of a power system substation.

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python), Pymodbus
- **Frontend**: React (TypeScript), Vite, Tailwind CSS
- **Real-time Communication**: Socket.IO
- **Containerization**: Docker
- **Orchestration**: Kubernetes

## 🧩 Core Components

The simulator supports several types of data points commonly found in SCADA systems.

### 1. Circuit Breaker

A Circuit Breaker is an automated electrical switch designed to protect an electrical circuit from damage caused by excess current.

**Logic**: The simulator allows a master to read the breaker's status (Open, Closed, or Invalid) and send commands to open or close it. It supports both single-point and double-point indication and control.

**Key Attributes**: `name`, `ioa_cb_status`, `ioa_control_open`, `ioa_control_close`, `has_double_point`.

### 2. Tap Changer

A Tap Changer is a mechanism in transformers used to regulate the output voltage to required levels.

**Logic**: This component simulates the tap position of a transformer. The master can read the current tap position and command it to raise or lower the tap, thus changing the voltage.

**Key Attributes**: `name`, `ioa_value`, `value`, `value_high_limit`, `value_low_limit`.

### 3. Telesignal (Digital Input)

A Telesignal represents a digital status point, typically a binary state (On/Off, True/False).

**Logic**: It reports a status value (0 or 1). The simulator can be configured to automatically toggle this value at a set interval to simulate changing conditions.

**Key Attributes**: `name`, `ioa`, `value`, `interval`, `auto_mode`.

### 4. Telemetry (Analog Input)

A Telemetry point represents an analog measurement, like voltage, current, or temperature.

**Logic**: It reports a floating-point value. The simulator can automatically generate values within a defined `min_value` and `max_value` range at a specified interval. A `scale_factor` can be applied to the value.

**Key Attributes**: `name`, `ioa`, `unit`, `value`, `min_value`, `max_value`, `interval`.

## 📂 Data Structure

The application state can be exported and imported using a single JSON file. This is useful for backups and for setting up specific simulation scenarios quickly.

The JSON object contains four main keys: `circuit_breakers`, `telesignals`, `telemetries`, and `tap_changers`.

### Example JSON

```json
{
  "circuit_breakers": [
    {
      "id": "1747883759434",
      "name": "CB EXP 1 PLTMG 1",
      "ioa_cb_status": 221,
      "ioa_cb_status_close": 222,
      "ioa_cb_status_dp": null,
      "ioa_control_open": 223,
      "ioa_control_close": 224,
      "ioa_control_dp": null,
      "ioa_local_remote_sp": 225,
      "ioa_local_remote_dp": null,
      "is_sbo": true,
      "has_double_point": false,
      "is_dp_mode": false,
      "is_sdp_mode": false,
      "has_local_remote_dp": true,
      "is_local_remote_dp_mode": false,
      "remote_sp": 0,
      "remote_dp": 0,
      "cb_status_open": 1,
      "cb_status_close": 0,
      "cb_status_dp": 1,
      "control_open": 1,
      "control_close": 0,
      "control_dp": 0
    }
  ],
  "telesignals": [
    {
      "id": "1747883866351",
      "name": "OCR (CB EXP 1 PLTMG 1)",
      "ioa": 100,
      "value": 0,
      "interval": 10,
      "auto_mode": false
    }
  ],
  "telemetries": [
    {
      "id": "1747884050882",
      "name": "P (CB EXP 1 PLTMG 1)",
      "ioa": 501,
      "unit": "MW",
      "value": 8,
      "scale_factor": 1,
      "min_value": 5,
      "max_value": 10,
      "interval": 1,
      "auto_mode": true
    }
  ],
  "tap_changers": [
    {
      "id": "1744709479999",
      "name": "TRF-1_TAP",
      "ioa_value": 1050,
      "value": 5,
      "value_high_limit": 10,
      "value_low_limit": 1,
      "ioa_high_limit": 1051,
      "ioa_low_limit": 1052,
      "ioa_status_raise_lower": 1053,
      "ioa_command_raise_lower": 1054,
      "interval": 1,
      "auto_mode": false,
      "ioa_status_auto_manual": 1055,
      "ioa_command_auto_manual": 1056,
      "is_local_remote": 1,
      "ioa_local_remote": 1057
    }
  ]
}
```

## 🚀 Getting Started

### How to Run Locally

- Clone this repository
- Adjust the all variables in .env file
- Open splitted two terminals
- On the first terminal, move to backend directory `cd ./backend`, then run this script `python3 main.py`
- On the second terminal, move to frontend directory `cd ../frontend`, then run this script `npm run dev` for development mode or `npm run build` for production mode

### How to Run Locally (using Docker Compose)

#### Prerequisites

- Docker
- Docker Compose

You will need Docker and Docker Compose installed, then run this command.

```bash
sudo docker compose up --build -d
```

- The React frontend will be accessible at `http://localhost:<react-port>`
- The FastAPI backend will be running on `http://localhost:<fastapi-port>`

## ☁️ Deployment

### How to Deploy in Kubernetes

To deploy the simulator in a Kubernetes cluster, you can use the provided shell scripts. These scripts dynamically configure the image tag, host, and ports.

1. Access your cluster environment, for example via SSH, and clone this repository.

2. Make the scripts executable:

```bash
chmod +x install.sh
chmod +x uninstall.sh
```

### Installing

The `install.sh` script creates the necessary Kubernetes deployments and services.

**Usage:**
  
```bash
./install.sh <image-tag> <fastapi-port> <modbus-port> <fastapi-nodeport> <modbus-nodeport> <react-port> <react-nodeport> <fastapi-host>
```

**Example:**

```bash
./install.sh 1 7501 9001 30501 30901 3005 30005 10.14.73.59
```

### Uninstalling

The `uninstall.sh` script removes all Kubernetes resources associated with the application.

**Usage:**

```bash
./uninstall.sh <image-tag>
```

**Example:**

```bash
./uninstall.sh 1
```

## 🗺️ Address Mapping

| Tag Type         | Address Range | Access     | Size                    | Features                        | Items in Simulator                               |
| ---------------- | ------------- | ---------- | ----------------------- | ------------------------------- | ------------------------------------------------ |
| Coil Status      | 1 - 9999      | Read/Write | 1 bit (0–1)             | Read on/off value               | CB Status Open/Close                             |
| Discrete Input   | 10001 - 19999 | Read       | 1 bit (0–1)             | Read/Write on/off value         | CB Control Open/Close, Telesignals, Local/Remote |
| Holding Register | 30001 - 39999 | Read/Write | 16 bit words (0–65,535) | Read measurements and statuses  | Telemetry                                        |
| Input Register   | 40001 - 49999 | Read       | 16 bit words (0–65,535) | Read/Write configuration values | Currently Not Used                               |

## ✍️ Author

All codes are written by [@ardanngrha](https://github.com/ardanngrha)
