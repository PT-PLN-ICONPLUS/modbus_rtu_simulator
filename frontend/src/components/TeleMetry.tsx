import { useState } from 'react';
import { Button } from './ui/button';

function Telemetry() {
  const [isOn, setIsOn] = useState(false);
  const [isAuto, setAuto] = useState(false);

  return (
    <div className="p-3 flex items-center text-center border-b-2">
      <text className="font-bold w-1/3">Frequency</text>
      <div className="flex flex-col w-1/3">
        <text className="text-2xl font-bold">
          400 F
        </text>
        <text className="text-sm">IOA: 117</text>
      </div>
      <div className="flex flex-col w-1/3 gap-0.5 items-center">
        <Button
          className={`text-black bg-white rounded w-9 h-9  border-2 border-black hover:bg-gray-300`}
          onClick={() => setIsOn(!isOn)}
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
          onClick={() => setIsOn(!isOn)}
        >
          -
        </Button>
      </div>
    </div>
  )
}

export { Telemetry };