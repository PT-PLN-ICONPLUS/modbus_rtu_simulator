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

  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="min-w-screen">
      <h1 className="text-3xl font-bold py-3 text-center">Modbus TCP Server Simulator</h1>

      <div className="flex flex-row w-full">
        {/* Circuit Breaker Section */}
        <div className="w-1/3 border-2">
          <div className="flex flex-row border-b-2">
            <h2 className="text-xl font-semibold pl-7 pr-36 m-2">Circuit Breaker</h2>
            <button
              className="bg-blue-500 text-white p-2 rounded m-2"
              onClick={() => setRegisterModalOpen(true)}
            >
              +
            </button>
            <button
              className="bg-red-500 text-white p-2 rounded m-2"
              onClick={() => setCoilModalOpen(true)}
            >
              -
            </button>
          </div>

          <div className="flex flex-row gap-2">
            <div className="flex flex-col">

              <div className="flex flex-row">

                <div className="flex w-full justify-around gap-3">
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className={`w-24 h-24 rounded-full border-2 border-green-400 ${isOpen ? 'bg-green-200' : 'bg-green-200 opacity-50'}`}
                    ></div>
                    <span className="text-2xl font-sans">Open</span>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <div
                      className={`w-24 h-24 rounded-full border-2 border-red-400 ${!isOpen ? 'bg-red-200' : 'bg-red-200 opacity-50'}`}
                    ></div>
                    <span className="text-2xl font-sans">Close</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-row gap-2 justify-around">
                <button
                  onClick={() => setIsOpen(true)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${isOpen ? 'bg-green-200 border-2 border-green-500' : 'bg-green-100 border-2 border-green-300'
                    }`}
                >
                  Open
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${!isOpen ? 'bg-red-200 border-2 border-red-500' : 'bg-red-100 border-2 border-red-300'
                    }`}
                >
                  Close
                </button>
              </div>

              <div className="flex flex-row gap-1">
                <button className="bg-blue-500 text-sm text-white">Invalid 0</button>
                <button className="bg-blue-500 text-sm text-white">Trip</button>
                <button className="bg-blue-500 text-sm text-white">Invalid 3</button>

              </div>
            </div>

            <div className="flex flex-col">
              <text className="font-sm">IQA Data: 300</text>
              <text className="font-sm">IQA Command: 6000</text>
              <text className="font-sm">SBO: False</text>
              <text className="font-sm">Type: Double Point Command</text>

              <div className="flex flex-row">
                <button className="bg-blue-500 text-white">SBO</button>
                <button className="bg-blue-500 text-white">DP</button>
              </div>

              <div className="flex flex-row">
                <text className="text-sm text-gray-500">Local</text>
                <text className="text-sm text-gray-500">Remote</text>
              </div>
            </div>

          </div>
        </div>

        {/* Telesignal Section */}
        <div className="p-6 w-1/3 border-2">
          <h2 className="text-xl font-semibold mb-4">Telesignal</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="mr-4">
                <span className="font-medium">Over Current Relay 1A</span>
              </div>
              <div className="mr-4">
                <span className="font-medium">IQA:</span> 117
              </div>
              <div className="mr-4">
                <span className="font-medium">Type:</span> Single Point
              </div>
              <div className="mr-4">
                <span className="font-medium">Status:</span> ON
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="mr-4">
                <span className="font-medium">Ground Fault Relay 2A</span>
              </div>
              <div className="mr-4">
                <span className="font-medium">IOA:</span> 132
              </div>
              <div className="mr-4">
                <span className="font-medium">Type:</span> Single Point
              </div>
              <div className="mr-4">
                <span className="font-medium">Status:</span> OFF
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Section */}
        <div className="p-6 w-1/3 border-2">
          <h2 className="text-xl font-semibold mb-4">Telemetry</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="mr-4">
                <span className="font-medium">Frekuensi</span>
              </div>
              <div className="mr-4">
                <span className="font-medium">IQA:</span> 1080
              </div>
              <div className="mr-4">
                <span className="font-medium">Value:</span> 400 F
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="mr-4">
                <span className="font-medium">Power Aktif</span>
              </div>
              <div className="mr-4">
                <span className="font-medium">IQA:</span> 1081
              </div>
              <div className="mr-4">
                <span className="font-medium">Value:</span> 5 P
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="mr-4">
                <span className="font-medium">Area Gangguan Phase A</span>
              </div>
              <div className="mr-4">
                <span className="font-medium">IQA:</span> 1088
              </div>
              <div className="mr-4">
                <span className="font-medium">Value:</span> 0.5 AMPF
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Register Modal */}
      {registerModalOpen && (
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center">
          <div className="p-6 rounded-lg w-96">
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
        <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center">
          <div className="p-6 rounded-lg w-96">
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