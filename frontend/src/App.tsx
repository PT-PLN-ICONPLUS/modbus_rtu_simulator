// frontend/src/App.tsx
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { SectionTitle } from './components/SectionTitleItem';
import { CircuitBreaker } from './components/CircuitBreakerItem';
import { TeleSignal } from './components/TeleSignalItem';
import { Telemetry } from './components/TeleMetryItem';

interface CircuitBreakerItem {
  id: string;
  name: string;
  ioa_data: number;
  ioa_data_dp?: number;
  ioa_command: number;
  ioa_command_dp?: number;
  is_sbo: boolean;
  is_double_point: boolean;
  remote: boolean;
  value: number;
  min_value: number;
  max_value: number;
  interval: number;
}

interface TeleSignalItem {
  id: string;
  name: string;
  ioa: number; // address
  value: number; // 0 is off, 1 is on
  min_value: number;
  max_value: number;
  interval: number;
}

interface TelemetryItem {
  id: string;
  name: string;
  ioa: number; // address
  unit: string;
  value: number;
  scale_factor: number;
  min_value: number;
  max_value: number;
  interval: number;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [circuitBreakers, setCircuitBreakers] = useState<CircuitBreakerItem[]>([
    {
      id: '1',
      name: 'Circuit Breaker 1',
      ioa_data: 1,
      ioa_data_dp: 2,
      ioa_command: 5701,
      ioa_command_dp: 5702,
      is_sbo: false,
      is_double_point: false,
      remote: false,
      value: 0,
      min_value: 0,
      max_value: 3,
      interval: 5
    },
  ]);

  const [teleSignals, setTeleSignals] = useState<TeleSignalItem[]>([
    {
      id: '1',
      name: 'TeleSignal 1',
      ioa: 101,
      value: 0,
      min_value: 0,
      max_value: 1,
      interval: 10
    },
  ]);

  const [telemetry, setTelemetry] = useState<TelemetryItem[]>([
    {
      id: '1',
      name: 'Voltage',
      ioa: 201,
      unit: 'V',
      value: 220,
      scale_factor: 1,
      min_value: 200,
      max_value: 240,
      interval: 2
    },
  ]);

  useEffect(() => {
    // Get backend host and port from environment variables or use defaults
    const backendHost = process.env.FASTAPI_HOST || 'localhost';
    const backendPort = process.env.FASTAPI_PORT || '7001';
    const socketUrl = `http://${backendHost}:${backendPort}`;

    console.log(`Connecting to socket at: ${socketUrl}`);
    const newSocket = io(socketUrl);

    newSocket.on('connect', () => {
      console.log(`Connected to backend socket.io server with ID: ${newSocket.id}`);
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`Disconnected from socket server. Socket ID was: ${newSocket.id}, reason: ${reason}`);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const addCircuitBreaker = (data: {
    name: string;
    ioa_data: number;
    ioa_data_dp?: number;
    ioa_command: number;
    ioa_command_dp?: number;
    is_sbo: boolean;
    is_double_point: boolean;
    interval: number;
  }) => {
    const newItem: CircuitBreakerItem = {
      id: Date.now().toString(),
      name: data.name,
      ioa_data: data.ioa_data,
      ioa_data_dp: data.ioa_data_dp,
      ioa_command: data.ioa_command,
      ioa_command_dp: data.ioa_command_dp,
      is_sbo: data.is_sbo,
      is_double_point: data.is_double_point,
      remote: false,
      value: 0,
      min_value: 0,
      max_value: data.is_double_point ? 3 : 2,
      interval: data.interval
    };
    setCircuitBreakers([...circuitBreakers, newItem]);
  };

  const removeCircuitBreaker = (data: { id: string }) => {
    setCircuitBreakers(circuitBreakers.filter(item => item.id !== data.id));
  };

  const addTeleSignal = (data: {
    name: string;
    ioa: number;
    interval: number;
    value: number;
  }) => {
    const newItem: TeleSignalItem = {
      id: Date.now().toString(),
      name: data.name,
      ioa: data.ioa,
      value: data.value,
      min_value: 0,
      max_value: 1,
      interval: data.interval
    };
    setTeleSignals([...teleSignals, newItem]);
  };

  const removeTeleSignal = (data: { id: string }) => {
    setTeleSignals(teleSignals.filter(item => item.id !== data.id));
  };

  const addTelemetry = (data: {
    name: string;
    ioa: number;
    unit: string;
    value: number;
    min_value: number;
    max_value: number;
    interval: number;
    scale_factor: number;
  }) => {
    const newItem: TelemetryItem = {
      id: Date.now().toString(),
      name: data.name,
      ioa: data.ioa,
      unit: data.unit || 'Unit',
      value: data.value,
      scale_factor: parseFloat(data.scale_factor?.toString() || "1"),
      min_value: data.min_value,
      max_value: data.max_value,
      interval: data.interval
    };
    setTelemetry([...telemetry, newItem]);
  };

  const removeTelemetry = (data: { id: string }) => {
    setTelemetry(telemetry.filter(item => item.id !== data.id));
  };

  return (
    <div className="min-w-screen">
      <h1 className="text-3xl font-bold py-3 text-center">Modbus TCP Server Simulator</h1>

      <div className="flex flex-row w-full min-h-screen">
        {/* Circuit Breaker Section */}
        <div className="w-1/3 border-2">
          {/* Header Circuit Breaker Section */}
          <SectionTitle
            title="Circuit Breakers"
            onAdd={addCircuitBreaker}
            onRemove={removeCircuitBreaker}
            items={circuitBreakers}
          />
          {circuitBreakers.map(item => (
            <CircuitBreaker
              key={item.id}
              name={item.name}
              ioa_data={item.ioa_data}
              ioa_data_dp={item.ioa_data_dp}
              ioa_command={item.ioa_command}
              ioa_command_dp={item.ioa_command_dp}
              is_sbo={item.is_sbo}
              is_double_point={item.is_double_point}
              interval={item.interval}
            />
          ))}
        </div>

        {/* Telesignal Section */}
        <div className="w-1/3 border-2">
          <SectionTitle
            title="Telesignals"
            onAdd={addTeleSignal}
            onRemove={removeTeleSignal}
            items={teleSignals}
          />
          {teleSignals.map(item => (
            <TeleSignal
              key={item.id}
              name={item.name}
              ioa={item.ioa}
              value={item.value} />
          ))}
        </div>

        {/* Telemetry Section */}
        <div className="w-1/3 border-2">
          <SectionTitle
            title="Telemetry"
            onAdd={addTelemetry}
            onRemove={removeTelemetry}
            items={telemetry}
          />
          {telemetry.map(item => (
            <Telemetry
              key={item.id}
              name={item.name}
              ioa={item.ioa}
              unit={item.unit}
              value={item.value}
              min_value={item.min_value}
              max_value={item.max_value}
              scale_factor={item.scale_factor || 1.0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;