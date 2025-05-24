# Modbus TCP Server Simulator

This is only for TCP clients only!

## Table of Contents

- [How to run locally](#how-to-run-locally)
- [How to run locally (using Docker Compose)](#how-to-run-locally-using-docker-compose)
- [How to Deploy in Kubernetes (Scada Nas Network)](#how-to-deploy-in-kubernetes-scada-nas-network)
  - [Installing](#installing)
  - [Uninstalling](#uninstalling)
- [Exporting and Importing](#exporting-and-importing)
- [Addresses Mapping](#addresses-mapping)

## How to run locally

- Clone this repository
- Adjust the all variables in `.env` file
- Open splitted two terminals
- On the first terminal, move to backend directory `cd ./backend`, then run this script `python3 main.py`
- On the second terminal, move to frontend directory `cd ../frontend`, then run this script `npm run dev` for development mode or `npm run build` for production mode

## How to run locally (using Docker Compose)

You will need **Docker** and **Docker Compose** installed, then run this command.

```sh
  sudo docker compose up --build -d
```

## How to Deploy in Kubernetes (Scada Nas Network)

You need to access **Scada Nas network** trough SSH, clone this repository, and just use shell scripts that i wrote.

The Docker image tag, host, and ports are dynamic so you can configure as you wanted.

First run this commands

```sh
chmod +x install.sh
chmod +x uninstall.sh
```

### Installing

Usage:

```sh
./install.sh <image-tag> <fastapi-port> <modbus-port> <fastapi-nodeport> <modbus-nodeport> <react-port> <react-nodeport> <fastapi-host>
```

Example:

```sh
./install.sh 1 7501 9001 30501 30901 3005 30005 10.14.73.59
```

### Uninstalling

Usage:

```sh
./uninstall.sh <image-tag>
```

Example:

```sh
./uninstall.sh 1
```

## Exporting and Importing

The exported and imported files are formatted in a `json` format, so you can use it in your own project. Example of exported `json` file and can be used to import:

```json
{{
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
      "ioa_local_remote": 225,
      "is_sbo": true,
      "is_double_point": false,
      "remote": 0,
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
  ]
}
}
```

## Addresses Mapping

| Tag Type         | Address Range | Access     | Size                    | Features                        | Items in Simulator                               |
| ---------------- | ------------- | ---------- | ----------------------- | ------------------------------- | ------------------------------------------------ |
| Coil Status      | 1 - 9999      | Read/Write | 1 bit (0–1)             | Read on/off value               | CB Status Open/Close                             |
| Discrete Input   | 10001 - 19999 | Read       | 1 bit (0–1)             | Read/Write on/off value         | CB Control Open/Close, Telesignals, Local/Remote |
| Holding Register | 30001 - 39999 | Read/Write | 16 bit words (0–65,535) | Read measurements and statuses  | Telemetries                                      |
| Input Register   | 40001 - 49999 | Read       | 16 bit words (0–65,535) | Read/Write configuration values | *Currently Not Used*                             |

All the codes are written by [@ardanngrha](github.com/ardanngrha)
