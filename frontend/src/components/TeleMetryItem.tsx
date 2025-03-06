// frontend/src/components/TeleMetryItem.tsx
import { useState } from 'react';
import { Button } from './ui/button';

interface TelemetryProps {
  name: string;
  ioa?: number; // ioa
  unit?: string;
  value?: number;
  min_value?: number;
  max_value?: number;
  scale_factor?: number;
}

function Telemetry({
  name = "Frequency",
  ioa = 117,
  unit = "Hz",
  value: initialValue = 50.0,
  min_value = 0.0,
  max_value = 100.0,
  scale_factor = 1.0
}: TelemetryProps) {
  const [isAuto, setAuto] = useState(false);
  const [value, setValue] = useState(initialValue); // Value as float

  const step = scale_factor || 1.0;

  const increaseValue = () => {
    setValue(prev => {
      const newValue = Math.min(prev + step, max_value);
      // Round to avoid floating point precision issues
      const precision = step >= 1 ? 0 : -Math.floor(Math.log10(step));
      return Number(newValue.toFixed(precision));
    });
  };

  const decreaseValue = () => {
    setValue(prev => {
      const newValue = Math.max(prev - step, min_value);
      // Round to avoid floating point precision issues
      const precision = step >= 1 ? 0 : -Math.floor(Math.log10(step));
      return Number(newValue.toFixed(precision));
    });
  };

  return (
    <div className="p-3 flex items-center text-center border-b-2">
      <p className="font-bold w-1/3">{name}</p>
      <div className="flex flex-col w-1/3">
        <p className="text-2xl font-bold">
          {value} {unit}
        </p>
        <p className="text-sm">IOA: {ioa}</p>
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