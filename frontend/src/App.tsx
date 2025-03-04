// frontend/src/App.tsx
import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { SectionTitle } from './components/SectionTitleItem';
import { CircuitBreaker } from './components/CircuitBreakerItem';
import { TeleSignal } from './components/TeleSignalItem';
import { Telemetry } from './components/TeleMetryItem';

interface ComponentItem {
  id: string;
  name: string;
  address: number;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [circuitBreakers, setCircuitBreakers] = useState<ComponentItem[]>([
    { id: '1', name: 'Circuit Breaker 1', address: 1 },
    { id: '2', name: 'Circuit Breaker 2', address: 2 }
  ]);
  const [teleSignals, setTeleSignals] = useState<ComponentItem[]>([
    { id: '1', name: 'TeleSignal 1', address: 101 },
    { id: '2', name: 'TeleSignal 2', address: 102 },
    { id: '3', name: 'TeleSignal 3', address: 103 }
  ]);
  const [telemetry, setTelemetry] = useState<ComponentItem[]>([
    { id: '1', name: 'Telemetry 1', address: 201 },
    { id: '2', name: 'Telemetry 2', address: 202 },
    { id: '3', name: 'Telemetry 3', address: 203 }
  ]);

  useEffect(() => {
    const newSocket = io('http://localhost:7001');
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const addCircuitBreaker = (data: { name: string; address: number }) => {
    const newItem: ComponentItem = {
      id: Date.now().toString(),
      name: data.name,
      address: data.address
    };
    setCircuitBreakers([...circuitBreakers, newItem]);
  };

  const removeCircuitBreaker = (data: { id: string }) => {
    setCircuitBreakers(circuitBreakers.filter(item => item.id !== data.id));
  };

  const addTeleSignal = (data: { name: string; address: number }) => {
    const newItem: ComponentItem = {
      id: Date.now().toString(),
      name: data.name,
      address: data.address
    };
    setTeleSignals([...teleSignals, newItem]);
  };

  const removeTeleSignal = (data: { id: string }) => {
    setTeleSignals(teleSignals.filter(item => item.id !== data.id));
  };

  const addTelemetry = (data: { name: string; address: number }) => {
    const newItem: ComponentItem = {
      id: Date.now().toString(),
      name: data.name,
      address: data.address
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
            <CircuitBreaker key={item.id} name={item.name} address={item.address} />
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
            <TeleSignal key={item.id} name={item.name} address={item.address} />
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
            <Telemetry key={item.id} name={item.name} address={item.address} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;