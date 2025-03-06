// frontend/src/components/CircuitBreakerItem.tsx (Updated)
import { useState } from "react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";

interface CircuitBreakerProps {
  name?: string;
  ioa_data?: number;
  ioa_data_dp?: number;
  ioa_command?: number;
  ioa_command_dp?: number;
  is_sbo?: boolean;
  is_double_point?: boolean;
  is_mode_double_point?: boolean;
  interval?: number;
  onValueChange?: (value: number) => void;
}

function CircuitBreaker({
  name = "Circuit Breaker",
  ioa_data = 0,
  ioa_data_dp,
  ioa_command = 5700,
  ioa_command_dp,
  is_sbo = false,
  is_double_point = false,
  is_mode_double_point = false,
  onValueChange
}: CircuitBreakerProps) {
  // State variables based on your data structure
  const [isLocal, setIsLocal] = useState(true); // Controls if remote (false) or local (true)
  const [value, setValue] = useState(0); // 0 or 3 for invalid, 1 for open, 2 for close
  const [isSBO, setIsSBO] = useState(is_sbo);
  const [isDP, setIsDP] = useState(is_mode_double_point);

  // Handle internal value change with notification to parent component
  const handleValueChange = (newValue: number) => {
    if (isLocal) {
      setValue(newValue);
      if (onValueChange) {
        onValueChange(newValue);
      }
    }
  };

  return (
    <div>
      <div className="flex flex-row border-b-2">
        <div className="flex flex-col my-2 mx-6">
          {/* Display lights */}
          <div className="flex flex-row">
            <div className="flex w-full justify-around gap-3">
              <div
                className={`w-24 h-24 rounded-full border-2 border-green-600 ${value === 1 || value === 3 ? 'bg-green-600' : 'bg-green-200 opacity-50'
                  }`}
              ></div>
              <div
                className={`w-24 h-24 rounded-full border-2 border-red-600 ${value === 2 || value === 3 ? 'bg-red-600' : 'bg-red-200 opacity-50'
                  }`}
              ></div>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex flex-row gap-2 justify-around my-1">
            <Button
              onClick={() => handleValueChange(1)}
              className={`text-xs w-12 h-12 rounded-full flex items-center justify-center bg-green-600 border-2 border-black ${!isLocal ? 'opacity-50' : ''
                }`}
              disabled={!isLocal}
            >
              Open
            </Button>

            <Button
              onClick={() => handleValueChange(2)}
              className={`text-xs w-12 h-12 rounded-full flex items-center justify-center bg-red-600 border-2 border-black ${!isLocal ? 'opacity-50' : ''
                }`}
              disabled={!isLocal}
            >
              Close
            </Button>
          </div>

          {/* Special operation buttons */}
          <div className="flex flex-row justify-around gap-1 text-sm">
            <Button
              size="sm"
              variant="outline"
              className={`text-xs border-black text-blue-600 hover:bg-blue-600 hover:text-white ${(!isDP || !isLocal) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              disabled={!isDP || !isLocal}
              onClick={() => isDP && handleValueChange(0)} // Set to invalid 0
            >
              Invalid 0
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`text-xs border-black text-blue-600 hover:bg-blue-600 hover:text-white ${(!isLocal || value === 0 || value === 3) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              disabled={!isLocal || value === 0 || value === 3}
              onClick={() => {
                if (value === 1) handleValueChange(2);
                else if (value === 2) handleValueChange(1);
              }}
            >
              Trip
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`text-xs border-black text-blue-600 hover:bg-blue-600 hover:text-white ${(!isDP || !isLocal) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              disabled={!isDP || !isLocal}
              onClick={() => isDP && handleValueChange(3)} // Set to invalid 3
            >
              Invalid 3
            </Button>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3">
          <div className="text-sm flex flex-col">
            <p className="font-bold">{name}</p>
            {isDP ? (
              <>
                <p className="">IOA Data DP: {ioa_data_dp}</p>
                <p className="">IOA Command DP: {ioa_command_dp}</p>
              </>
            ) : (
              <>
                <p className="">IOA Data: {ioa_data}</p>
                <p className="">IOA Command: {ioa_command}</p>
              </>
            )}
            <p className="">SBO: {isSBO ? "True" : "False"}</p>
            <p className="">Type: {isDP ? "Double" : "Single"} Point Command</p>
          </div>

          {/* Toggle buttons */}
          <div className="flex flex-row gap-4 text-white">
            <Button
              size="sm"
              className={`border border-black text-xs hover:bg-blue-600 hover:text-white ${isSBO ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'
                } ${!isLocal ? 'opacity-50' : ''}`}
              onClick={() => isLocal && setIsSBO(!isSBO)}
              disabled={!isLocal}
            >
              SBO
            </Button>
            <Button
              size="sm"
              className={`border border-black text-xs hover:bg-blue-600 hover:text-white ${isDP ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'
                } ${!isLocal ? 'opacity-50' : ''}`}
              onClick={() => isLocal && setIsDP(!isDP)}
              disabled={!isLocal || !is_double_point}
            >
              Double Point
            </Button>
          </div>

          {/* Local/Remote switch */}
          <div className="flex flex-row gap-4 items-center">
            <span className={`font-bold ${isLocal ? 'text-red-500' : ''}`}>Local</span>
            <Switch
              id={`location-mode-${ioa_data}`}
              checked={!isLocal}
              onCheckedChange={(checked) => setIsLocal(!checked)}
            />
            <span className={`font-bold ${!isLocal ? 'text-red-500' : ''}`}>Remote</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CircuitBreaker };