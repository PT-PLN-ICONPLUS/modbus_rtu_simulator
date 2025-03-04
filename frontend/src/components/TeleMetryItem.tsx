// frontend/src/components/TeleMetry.tsx
import { useState } from 'react';
import { Button } from './ui/button';

interface TelemetryProps {
  name?: string;
  address?: number;
}

function Telemetry({ name = "Frequency", address = 117 }: TelemetryProps) {
  const [isAuto, setAuto] = useState(false);
  const [value, setValue] = useState(400);

  const increaseValue = () => {
    setValue(prev => Math.min(prev + 10, 1000));
  };

  const decreaseValue = () => {
    setValue(prev => Math.max(prev - 10, 0));
  };

  return (
    <div className="p-3 flex items-center text-center border-b-2">
      <text className="font-bold w-1/3">{name}</text>
      <div className="flex flex-col w-1/3">
        <text className="text-2xl font-bold">
          {value} F
        </text>
        <text className="text-sm">IOA: {address}</text>
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