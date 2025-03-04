// frontend/src/components/TeleMetryItem.tsx
import { useState } from 'react';
import { Button } from './ui/button';

interface TelemetryProps {
  name?: string;
  address?: number; // ioa
  unit?: string;
}

function Telemetry({ name = "Frequency", address = 117, unit = "Hz" }: TelemetryProps) {
  const [isAuto, setAuto] = useState(false);
  const [value, setValue] = useState(50.0); // Value as float

  const increaseValue = () => {
    setValue(prev => Math.min(parseFloat((prev + 0.1).toFixed(1)), 100.0));
  };

  const decreaseValue = () => {
    setValue(prev => Math.max(parseFloat((prev - 0.1).toFixed(1)), 0.0));
  };

  return (
    <div className="p-3 flex items-center text-center border-b-2">
      <p className="font-bold w-1/3">{name}</p>
      <div className="flex flex-col w-1/3">
        <p className="text-2xl font-bold">
          {value} {unit}
        </p>
        <p className="text-sm">IOA: {address}</p>
      </div>
      <div className="flex flex-col w-1/3 gap-0.5 items-center">
        <Button
          className={`text-black bg-white rounded w-9 h-9  border-2 border-black hover:bg-gray-300`}
          onClick={increaseValue}
        >
          +
        </Button>
        <Button
          className={`${isAuto ? 'bg-green-500 hover:bg-green-300' : 'bg-white hover:hover:bg-gray-300'} text-${isAuto ? 'white' : 'green-500'} rounded w-9 h-9  border-2 border-black`}
          onClick={() => setAuto(!isAuto)}
        >
          A
        </Button>
        <Button
          className={`text-black bg-white rounded w-9 h-9  border-2 border-black hover:bg-gray-300`}
          onClick={decreaseValue}
        >
          -
        </Button>
      </div>
    </div>
  )
}

export { Telemetry };