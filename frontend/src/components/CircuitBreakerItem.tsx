// frontend/src/components/CircuitBreakerItem.tsx
import { useState } from "react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";

interface CircuitBreakerProps {
  name?: string;
  address?: number; // ioa_data
}

function CircuitBreaker({ address = 0 }: CircuitBreakerProps) {
  // State variables based on your data structure
  const [isLocal, setIsLocal] = useState(true); // remote flag (inverse of isLocal)
  const [value, setValue] = useState(0); // value: 1 = open, 2 = close
  const [isSBO, setIsSBO] = useState(false); // is_sbo flag
  const [isDP, setIsDP] = useState(false); // is_double_point flag

  // Calculate command address based on data address
  const commandAddress = address + 5700;

  return (
    <div>
      <div className="flex flex-row border-b-2">
        <div className="flex flex-col my-2 mx-6">
          {/* Display lights remain the same */}
          <div className="flex flex-row">
            <div className="flex w-full justify-around gap-3">
              <div
                className={`w-24 h-24 rounded-full border-2 border-green-600 ${value === 1 || value === 3 ? 'bg-green-600' : 'bg-green-200 opacity-50'}`}
              ></div>
              <div
                className={`w-24 h-24 rounded-full border-2 border-red-600 ${value === 2 || value === 3 ? 'bg-red-600' : 'bg-red-200 opacity-50'}`}
              ></div>
            </div>
          </div>

          {/* Control buttons remain the same */}
          <div className="flex flex-row gap-2 justify-around my-1">
            <Button
              onClick={() => setValue(1)}
              className={`text-xs w-12 h-12 rounded-full flex items-center justify-center bg-green-600 border-2 border-black ${!isLocal ? 'opacity-50' : ''}`}
              disabled={!isLocal}
            >
              Open
            </Button>

            <Button
              onClick={() => setValue(2)}
              className={`text-xs w-12 h-12 rounded-full flex items-center justify-center bg-red-600 border-2 border-black ${!isLocal ? 'opacity-50' : ''}`}
              disabled={!isLocal}
            >
              Close
            </Button>
          </div>

          {/* Special operation buttons with proper handling for double point */}
          <div className="flex flex-row justify-around gap-1 text-sm">
            <Button
              size="sm"
              variant="outline"
              className={`text-xs border-black text-blue-600 hover:bg-blue-600 hover:text-white ${(!isDP || !isLocal) ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!isDP || !isLocal}
              onClick={() => isDP && setValue(0)} // Set to invalid 0
            >
              Invalid 0
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`text-xs border-black text-blue-600 hover:bg-blue-600 hover:text-white ${(!isLocal || value === 0 || value === 3) ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!isLocal || value === 0 || value === 3}
              onClick={() => {
                if (value === 1) setValue(2);
                else if (value === 2) setValue(1);
              }}
            >
              Trip
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`text-xs border-black text-blue-600 hover:bg-blue-600 hover:text-white ${(!isDP || !isLocal) ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!isDP || !isLocal}
              onClick={() => isDP && setValue(3)} // Set to invalid 3
            >
              Invalid 3
            </Button>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-5">
          <div className="text-sm font-semibold flex flex-col">
            {/* <p className="">{name}</p> */}
            {!isDP && <p className="">IOA Data: {address}</p>}
            {isDP && <p className="">IOA Data: {address + 1}</p>}
            {!isDP && <p className="">IOA Command: {commandAddress}</p>}
            {isDP && <p className="">IOA Command: {commandAddress + 1}</p>}
            <p className="">SBO: {isSBO ? "True" : "False"}</p>
            <p className="">Type: {isDP ? "Double" : "Single"} Point Command</p>
          </div>

          {/* Toggle buttons */}
          <div className="flex flex-row gap-4 text-white">
            <Button
              size="sm"
              className={`border border-black text-xs hover:bg-blue-600 hover:text-white ${isSBO ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'} ${!isLocal ? 'opacity-50' : ''}`}
              onClick={() => setIsSBO(!isSBO)}
              disabled={!isLocal}
            >
              SBO
            </Button>
            <Button
              size="sm"
              className={`border border-black text-xs hover:bg-blue-600 hover:text-white ${isDP ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'} ${!isLocal ? 'opacity-50' : ''}`}
              onClick={() => setIsDP(!isDP)}
              disabled={!isLocal}
            >
              Double Point
            </Button>
          </div>

          {/* Local/Remote switch */}
          <div className="flex flex-row gap-4 items-center">
            <span className={`font-bold ${isLocal ? 'text-red-500' : ''}`}>Local</span>
            <Switch
              id={`location-mode-${address}`}
              checked={!isLocal}
              onCheckedChange={(checked) => setIsLocal(!checked)}
            />
            <span className={`font-bold ${!isLocal ? 'text-red-500' : ''}`}>Remote</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export { CircuitBreaker };