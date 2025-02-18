# Modbus TCP Server Simulator

This is only for TCP clients only!

## How to run this simulator

- Clone this project
- Adjust the HOST and PORT in .env file
- Run this script ```python3 main.py```
- If you are using Docker, run this script ```sudo docker compose up --build -d```

## Addresses

| Address | Type | Name | Interval (s) | Range

| ------ | ------ | ------ | ------ | ------ |
| 40001 | Holding Register | VR | 1 | 200-300 |
| 40002 | Holding Register | P | 1 | 100-200 |
| 40003 | Holding Register | Q | 1 | 150-300 |
| 40004 | Holding Register | PF | 1 | 100-200 |
| 40005 | Holding Register | VS | 1 | 200-300 |
| 40006 | Holding Register | VT | 1 | 200-300 |
| 40007 | Holding Register | F | 1 | 49-51 |
| 40008 | Holding Register | IR | 1 | 90-100 |
| 40009 | Holding Register | IS | 1 | 90-100 |
| 400010 | Holding Register | IT | 1 | 90-100 |
| 0001 | Coil Status | CB | 10 | 1/0 |
| 0002 | Coil Status | LOCAL | 10 | 1/0 |
| 0003 | Coil Status | OCR | 10 | 1/0 |
| 0004 | Coil Status | GFT | 10 | 1/0 |
| 0005 | Coil Status | RACK IN | 10 | 1/0 |
| 0006 | Coil Status | RACK OUT | 10 | 1/0 |

 Created by: [@ardanngrha](https://github.com/ardanngrha)
