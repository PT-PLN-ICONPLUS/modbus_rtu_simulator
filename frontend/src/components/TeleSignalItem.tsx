// frontend/src/components/TeleSignal.tsx
import { Button } from "./ui/button";
import { useState } from 'react';

interface TeleSignalProps {
  name?: string;
  address?: number;
}

function TeleSignal({ name = "Over Current Relay 1A", address = 117 }: TeleSignalProps) {
  const [isOn, setIsOn] = useState(true);
  const [isAuto, setAuto] = useState(true);

  return (
    <div className="p-3 flex items-center text-center border">
      <text className="font-bold w-1/3">{name}</text>
      <div className="flex flex-col w-1/3">
        <text className={`${isOn ? 'text-green-500' : 'text-red-500'} text-2xl font-bold`}>
          {isOn ? 'ON' : 'OFF'}
        </text>
        <text className="text-sm">IOA: {address}</text>
      </div>
      <div className="flex flex-col w-1/3 gap-0.5 items-center">
        <Button
          className={`${isAuto ? 'bg-green-500 hover:bg-green-300' : 'bg-white hover:hover:bg-gray-300'} text-${isAuto ? 'white' : 'green-500'} rounded w-9 h-9  border-2 border-black`}
          onClick={() => setAuto(!isAuto)}
        >
          A
        </Button>
        <Button
          className={`${isOn ? 'bg-green-500' : 'bg-red-500'} text-white rounded w-9 h-9  border-2 border-black`}
          onClick={() => setIsOn(!isOn)}
        >
        </Button>
      </div>
    </div>
  )
}

export { TeleSignal };