# Modbus TCP Server Simulator

This is only for TCP clients only!

## How to run locally

- Clone this repository
- Adjust the HOST and PORT in **.env** file
- Open splitted two terminals
- On the first terminal, move to backend directory ```cd ./backend```, then run this script ```python3 main.py```
- On the second terminal, move to frontend directory ```cd ../frontend```, then run this script ```npm run dev```

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

All the codes are written by [@ardanngrha](github.com/ardanngrha)
