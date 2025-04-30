# Modbus TCP Server Simulator

This is only for TCP clients only!

## How to run locally

- Clone this repository
- Adjust the all variables in `.env` file
- Open splitted two terminals
- On the first terminal, move to backend directory `cd ./backend`, then run this script `python3 main.py`
- On the second terminal, move to frontend directory `cd ../frontend`, then run this script `npm run dev`

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
{
  "circuit_breakers": [{"id": "1745923955161","name": "EXPRESS_2","ioa_cb_status": 203,"ioa_cb_status_close": 2031,"ioa_cb_status_dp": 2032,"ioa_control_open": 508,"ioa_control_close": 507,"ioa_control_dp": 5071,"ioa_local_remote": 105,"is_sbo": false,"is_double_point": true,"remote": 0,"cb_status_open": 0,"cb_status_close": 0,"cb_status_dp": 0,"control_open": 0,"control_close": 0,"control_dp": 0}],
  "telesignals": [{"id": "1744709479696","name": "SPS_24DCF","ioa": 102,"value": 0,"interval": 5,"auto_mode": true}],
  "telemetries": [{"id": "1744709479605","name": "F_CB1","ioa": 1012,"unit": "A","value": 99,"scale_factor": 0.1,"min_value": 98,"max_value": 200,"interval": 1,"auto_mode": true}]
}
```


All the codes are written by [@ardanngrha](github.com/ardanngrha)
