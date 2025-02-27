import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:7001');

interface RegisterConfig {
  min_value: number;
  max_value: number;
  interval: number;
  address: number;
}

interface CoilConfig {
  interval: number;
  address: number;
}

function App() {
  const [registerValues, setRegisterValues] = useState<Record<string, number>>({});
  const [coilValues, setCoilValues] = useState<Record<string, number>>({});
  const [registerConfigs, setRegisterConfigs] = useState<Record<string, RegisterConfig>>({});
  const [coilConfigs, setCoilConfigs] = useState<Record<string, CoilConfig>>({});

  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [coilModalOpen, setCoilModalOpen] = useState(false);

  // Form states
  const [newRegisterName, setNewRegisterName] = useState('');
  const [newRegisterMin, setNewRegisterMin] = useState(0);
  const [newRegisterMax, setNewRegisterMax] = useState(100);
  const [newRegisterInterval, setNewRegisterInterval] = useState(1);
  const [newRegisterAddress, setNewRegisterAddress] = useState(0);

  const [newCoilName, setNewCoilName] = useState('');
  const [newCoilInterval, setNewCoilInterval] = useState(10);
  const [newCoilAddress, setNewCoilAddress] = useState(0);

  useEffect(() => {
    socket.on('register_update', (data: Record<string, number>) => {
      setRegisterValues((prev) => ({ ...prev, ...data }));
    });
    socket.on('coil_update', (data: Record<string, number>) => {
      setCoilValues((prev) => ({ ...prev, ...data }));
    });
    socket.on('register_config', (data: Record<string, RegisterConfig>) => {
      setRegisterConfigs(data);
    });
    socket.on('coil_config', (data: Record<string, CoilConfig>) => {
      setCoilConfigs(data);
    });

    return () => {
      socket.off('register_update');
      socket.off('coil_update');
      socket.off('register_config');
      socket.off('coil_config');
    };
  }, []);

  const handleAddRegister = async () => {
    try {
      await fetch('http://localhost:7001/registers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRegisterName,
          min_value: newRegisterMin,
          max_value: newRegisterMax,
          interval: newRegisterInterval,
          address: newRegisterAddress,
        }),
      });
      setRegisterModalOpen(false);
      resetRegisterForm();
    } catch (error) {
      console.error('Failed to add register:', error);
    }
  };

  const handleAddCoil = async () => {
    try {
      await fetch('http://localhost:7001/coils', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCoilName,
          interval: newCoilInterval,
          address: newCoilAddress,
        }),
      });
      setCoilModalOpen(false);
      resetCoilForm();
    } catch (error) {
      console.error('Failed to add coil:', error);
    }
  };

  const handleDeleteRegister = async (name: string) => {
    try {
      await fetch(`http://localhost:7001/registers/${name}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete register:', error);
    }
  };

  const handleDeleteCoil = async (name: string) => {
    try {
      await fetch(`http://localhost:7001/coils/${name}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete coil:', error);
    }
  };

  const resetRegisterForm = () => {
    setNewRegisterName('');
    setNewRegisterMin(0);
    setNewRegisterMax(100);
    setNewRegisterInterval(1);
    setNewRegisterAddress(0);
  };

  const resetCoilForm = () => {
    setNewCoilName('');
    setNewCoilInterval(10);
    setNewCoilAddress(0);
  };

  return (
    <div className="min-w-screen mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Modbus TCP Server Simulator</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Holding Registers */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Holding Registers</h2>
            <button className="bg-blue-500 text-white" onClick={() => setRegisterModalOpen(true)}>
              Add Register
            </button>
          </div>
          <div className="space-y-4">
            {Object.entries(registerConfigs).map(([name, config]) => (
              <div key={name} className="flex justify-between items-center">
                <div className="mr-4">
                  <span className="font-medium">{name}</span>: {registerValues[name] || 0}{' '}
                  <span className="text-sm text-gray-500">Range: {config.min_value}-{config.max_value}</span>{' '}
                  <span className="text-sm text-gray-500">Interval: {config.interval}s</span>
                </div>
                <button className="bg-red-500 text-white" onClick={() => handleDeleteRegister(name)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Coil Status */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Coil Status</h2>
            <button className="bg-blue-500 text-white" onClick={() => setCoilModalOpen(true)}>
              Add Coil
            </button>
          </div>
          <div className="space-y-4">
            {Object.entries(coilConfigs).map(([name, config]) => (
              <div key={name} className="flex justify-between items-center">
                <div>
                  <span className="font-medium">{name}</span>:{' '}
                  <span className={`text-sm ${coilValues[name] ? 'text-green-600' : 'text-red-600'}`}>
                    {coilValues[name] ? 'ON' : 'OFF'}
                  </span>{' '}
                  <span className="text-sm text-gray-500">Interval: {config.interval}s</span>
                </div>
                <button className="bg-red-500 text-white" onClick={() => handleDeleteCoil(name)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Register Modal */}
      {registerModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Register</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Register Name"
                value={newRegisterName}
                onChange={(e) => setNewRegisterName(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="number"
                placeholder="Min Value"
                value={newRegisterMin}
                onChange={(e) => setNewRegisterMin(Number(e.target.value))}
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="number"
                placeholder="Max Value"
                value={newRegisterMax}
                onChange={(e) => setNewRegisterMax(Number(e.target.value))}
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="number"
                placeholder="Interval (seconds)"
                value={newRegisterInterval}
                onChange={(e) => setNewRegisterInterval(Number(e.target.value))}
                min={1}
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="number"
                placeholder="Address"
                value={newRegisterAddress}
                onChange={(e) => setNewRegisterAddress(Number(e.target.value))}
                className="w-full p-2 border rounded"
                required
              />
              <div className="flex justify-end gap-2">
                <button className="bg-gray-300" onClick={() => setRegisterModalOpen(false)}>
                  Cancel
                </button>
                <button className="bg-blue-500 text-white" onClick={handleAddRegister}>
                  Add Register
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Coil Modal */}
      {coilModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Coil</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Coil Name"
                value={newCoilName}
                onChange={(e) => setNewCoilName(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="number"
                placeholder="Interval (seconds)"
                value={newCoilInterval}
                onChange={(e) => setNewCoilInterval(Number(e.target.value))}
                min={1}
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="number"
                placeholder="Address"
                value={newCoilAddress}
                onChange={(e) => setNewCoilAddress(Number(e.target.value))}
                className="w-full p-2 border rounded"
                required
              />
              <div className="flex justify-end gap-2">
                <button className="bg-gray-300" onClick={() => setCoilModalOpen(false)}>
                  Cancel
                </button>
                <button className="bg-blue-500 text-white" onClick={handleAddCoil}>
                  Add Coil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;