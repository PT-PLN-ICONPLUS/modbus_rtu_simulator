// frontend/src/components/CircuitBreakerItem.tsx (Updated)
import { useState } from "react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import socket from "../socket";

interface CircuitBreakerProps {
  name?: string;
  ioa_cb_status?: number;
  ioa_cb_status_close?: number;
  ioa_cb_status_dp?: number;
  ioa_control_dp?: number;
  ioa_control_open?: number;
  ioa_control_close?: number;
  ioa_local_remote?: number;
  remote?: number;
  is_sbo?: boolean;
  is_double_point?: boolean;
  is_mode_double_point?: boolean;
  interval?: number;
  onValueChange?: (value: number) => void;
}

function CircuitBreaker({
  name = "Circuit Breaker",
  ioa_cb_status = 0,
  ioa_cb_status_close = 0,
  ioa_cb_status_dp = 0,
  ioa_control_dp = 0,
  ioa_control_open = 0,
  ioa_control_close = 0,
  ioa_local_remote = 0,
  remote = 0,
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

  const [cb_status_open, set_cb_status_open] = useState(0);
  const [cb_status_close, set_cb_status_close] = useState(0);
  const [control_open, set_control_open] = useState(0);
  const [control_close, set_control_close] = useState(0);

  const [cb_status_double, set_cb_status_double] = useState(0);
  const [control_double, set_control_double] = useState(0);

  // Handle internal value change with notification to parent component
  const handleValueChange = (newValue: number) => {
    if (isLocal) {
      setValue(newValue);

      if (isDP) {
        // Double point logic
        if (newValue === 1) { // Open
          set_cb_status_double(1);
          set_control_double(1);
        } else if (newValue === 2) { // Close
          set_cb_status_double(2);
          set_control_double(2);
        } else if (newValue === 0) { // Invalid 0
          set_cb_status_double(0);
          set_control_double(0);
        } else if (newValue === 3) { // Invalid 3
          set_cb_status_double(3);
          set_control_double(3);
        }
      } else {
        // Single point logic
        if (newValue === 1) { // Open
          set_cb_status_close(0);
          set_cb_status_open(1);

          set_control_open(1);
          set_control_close(0);
        } else if (newValue === 0) { // Close
          set_cb_status_close(1);
          set_cb_status_open(0);

          set_control_open(0);
          set_control_close(1);
        }
      }

      // Send to backend
      socket.emit('update_circuit_breaker', {
        ioa_cb_status: cb_status_open,
        ioa_cb_status_close: cb_status_close,
        ioa_cb_status_dp: cb_status_double,
        ioa_control_close: control_close,
        ioa_control_open: control_open,
        ioa_control_dp: control_double,
        remote: remote,
        is_sbo: isSBO,
      });

      if (onValueChange) {
        onValueChange(newValue);
      }
    }
  };

  const toggleLocalRemote = (isRemote: boolean) => {
    setIsLocal(!isRemote);

    socket.emit('update_circuit_breaker', {
      ioa_cb_status: ioa_cb_status,
      remote: isRemote ? 1 : 0
    });
  };

  const toggleSBO = (enabled: boolean) => {
    setIsSBO(enabled);

    socket.emit('update_circuit_breaker', {
      ioa_cb_status: ioa_cb_status,
      is_sbo: enabled
    });
  };

  const toggleDP = () => {
    setIsDP(!isDP);
  };

  return (
    <div>
      <div className="flex flex-row border-b-2 py-2">
        <div className="flex flex-col my-2 mx-6 gap-2">
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
              onClick={() => isDP ? handleValueChange(1) : handleValueChange(0)}
              className={`text-xs w-12 h-12 rounded-full flex items-center justify-center bg-green-600 border-2 border-black ${!isLocal ? 'opacity-50' : ''
                }`}
              disabled={!isLocal}
            >
              Open
            </Button>

            <Button
              onClick={() => isDP ? handleValueChange(2) : handleValueChange(1)}
              className={`text-xs w-12 h-12 rounded-full flex items-center justify-center bg-red-600 border-2 border-black ${!isLocal ? 'opacity-50' : ''
                }`}
              disabled={!isLocal}
            >
              Close
            </Button>
          </div>

          {/* Special operation buttons */}
          <div className="flex flex-row justify-around gap-2 text-sm">
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
                <p className="">IOA CB Status DP: {ioa_cb_status_dp}</p>
                <p className="">IOA Control DP: {ioa_control_dp}</p>
              </>
            ) : (
              <>
                <p className="">IOA CB Status Open: {ioa_cb_status}</p>
                <p className="">IOA CB Status Close: {ioa_cb_status_close}</p>
                <p className="">IOA Control Open: {ioa_control_open} </p>
                <p className="">IOA Control Close: {ioa_control_close} </p>
              </>
            )}
            <p className="">IOA Local/Remote: {ioa_local_remote}</p>
            <p className="">SBO: {isSBO ? "True" : "False"}</p>
            <p className="">Type: {isDP ? "Double" : "Single"} Point Command</p>
          </div>

          {/* Toggle buttons */}
          <div className="flex flex-row gap-4 text-white">
            <Button
              size="sm"
              className={`border border-black text-xs hover:bg-blue-600 hover:text-white ${isSBO ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'} ${!isLocal ? 'opacity-50' : ''}`}
              onClick={() => isLocal && toggleSBO(!isSBO)}
              disabled={!isLocal}
            >
              SBO
            </Button>
            <Button
              size="sm"
              className={`border border-black text-xs hover:bg-blue-600 hover:text-white ${isDP ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'} ${!isLocal ? 'opacity-50' : ''}`}
              onClick={() => isLocal && toggleDP()}
              disabled={!isLocal && !is_double_point}
            >
              Double Point
            </Button>
          </div>

          {/* Local/Remote switch */}
          <div className="flex flex-row gap-4 items-center">
            <span className={`font-bold ${isLocal ? 'text-red-500' : ''}`}>Local</span>
            <Switch
              id={`location-mode-${remote}`}
              checked={!isLocal}
              onCheckedChange={(checked) => toggleLocalRemote(checked)}
            />
            <span className={`font-bold ${!isLocal ? 'text-red-500' : ''}`}>Remote</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CircuitBreaker };