import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import socket from "../socket";
import { CircuitBreakerItem } from "@/lib/items";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

function CircuitBreaker(item: CircuitBreakerItem & {
  isEditing: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  // State variables based on your data structure
  const [isSBO, setIsSBO] = useState(item.is_sbo);
  const [isDPMode, setIsDPMode] = useState(item.is_double_point);
  const [isRemote, setIsRemote] = useState(item.remote === 1);

  const [cbStatusOpen, setCbStatusOpen] = useState(item.cb_status_open);
  const [cbStatusClose, setCbStatusClose] = useState(item.cb_status_close);
  const [cbStatusDP, setCbStatusDP] = useState(item.cb_status_dp);

  const openValueDoublePoint = 1;
  const closeValueDoublePoint = 2;
  const invalidValueDoublePoint0 = 0;
  const invalidValueDoublePoint3 = 3;

  useEffect(() => {
    const handleUpdate = (data: CircuitBreakerItem[]) => {
      // Filter the data to find the specific item based on id
      const filtered = data.filter((look: CircuitBreakerItem) => look.id === item.id);
      if (filtered.length > 0 && filtered[0].id === item.id) {
        setCbStatusOpen(filtered[0].cb_status_open);
        setCbStatusClose(filtered[0].cb_status_close);
        setCbStatusDP(filtered[0].cb_status_dp);
        setIsRemote(filtered[0].remote === 1);
        setIsSBO(filtered[0].is_sbo);
        setIsDPMode(filtered[0].is_double_point);
      }
    }
    socket.on('circuit_breakers', handleUpdate);
    return () => {
      socket.off('circuit_breakers', handleUpdate);
    }
  }, [item.id]);

  const handleOpen = () => {
    if (isDPMode) {
      // Full double point mode (both status and control are double point)
      setCbStatusDP(openValueDoublePoint);

      socket.emit('update_circuit_breaker', {
        id: item.id,
        cb_status_dp: openValueDoublePoint,
        control_dp: openValueDoublePoint
      });
    } else {
      // Full single point mode
      setCbStatusOpen(1);
      setCbStatusClose(0);

      socket.emit('update_circuit_breaker', {
        id: item.id,
        cb_status_open: 1,
        cb_status_close: 0,
        control_open: 1,
        control_close: 0
      });
    }
  };

  const handleClose = () => {
    if (isDPMode) {
      // Full double point mode
      setCbStatusDP(closeValueDoublePoint);

      socket.emit('update_circuit_breaker', {
        id: item.id,
        cb_status_dp: closeValueDoublePoint,
        control_dp: closeValueDoublePoint
      });
    } else {
      // Full single point mode
      setCbStatusOpen(0);
      setCbStatusClose(1);

      socket.emit('update_circuit_breaker', {
        id: item.id,
        cb_status_open: 0,
        cb_status_close: 1,
        control_open: 0,
        control_close: 1
      });
    }
  };

  const handleTrip = () => {
    if (isDPMode) {
      const newStatus = item.cb_status_dp === 1 ? 2 : 1;

      setCbStatusDP(newStatus);

      // Full double point mode
      socket.emit('update_circuit_breaker', {
        id: item.id,
        cb_status_dp: newStatus,
        control_dp: newStatus
      });
    } else {
      const newStatusOpen = item.cb_status_open === 1 ? 0 : 1;
      const newStatusClose = item.cb_status_close === 1 ? 0 : 1;

      setCbStatusOpen(newStatusOpen);
      setCbStatusClose(newStatusClose);

      // Handle trip logic for single point
      socket.emit('update_circuit_breaker', {
        id: item.id,
        cb_status_open: newStatusOpen,
        cb_status_close: newStatusClose,
        control_open: newStatusOpen,
        control_close: newStatusClose,
      });
    }
  };

  const handleInvalid = (type = 0) => {
    if (isDPMode) {
      // Handle invalid logic for double point
      if (type === invalidValueDoublePoint0) {
        setCbStatusDP(invalidValueDoublePoint0);

        // Full double point mode
        socket.emit('update_circuit_breaker', {
          id: item.id,
          cb_status_dp: invalidValueDoublePoint0,
          control_dp: invalidValueDoublePoint0
        });
      }
      else if (type === invalidValueDoublePoint3) {
        setCbStatusDP(invalidValueDoublePoint3);

        // Full double point mode
        socket.emit('update_circuit_breaker', {
          id: item.id,
          cb_status_dp: invalidValueDoublePoint3,
          control_dp: invalidValueDoublePoint3
        });
      }
    }
  };

  const toggleLocalRemote = () => {
    setIsRemote(!isRemote);

    socket.emit('update_circuit_breaker', {
      id: item.id,
      remote: isRemote ? 0 : 1
    });
  };

  const toggleSBO = () => {
    setIsSBO(!isSBO);

    socket.emit('update_circuit_breaker', {
      id: item.id,
      is_sbo: !isSBO
    });
  };

  const setSPMode = () => {
    setIsDPMode(false);

    socket.emit('update_circuit_breaker', {
      id: item.id,
      is_double_point: false
    });
  };

  const setDPMode = () => {
    setIsDPMode(true);

    socket.emit('update_circuit_breaker', {
      id: item.id,
      is_double_point: true
    });
  };

  const getModeText = () => {
    return isDPMode ? "Double Point Mode" : "Single Point Mode";
  };

  return (
    <div>
      <div className="text-center py-2 border-b">
        <p className="font-bold text-lg">{item.name}</p>
      </div>
      <div className="flex flex-row border-b-2 py-2">
        <div className="flex flex-col my-2 mx-6 gap-2">
          {/* Display lights */}
          <div className="flex flex-row">
            <div className="flex w-full justify-around gap-3">
              <div
                className={`green-light w-24 h-24 rounded-full border-2 border-green-600 ${isDPMode
                  ? (cbStatusDP === 1 || cbStatusDP === 3) ? 'bg-green-600' : 'bg-green-200 opacity-50'
                  : (cbStatusOpen === 1 && cbStatusClose === 0) ? 'bg-green-600' : 'bg-green-200 opacity-50'
                  }`}
              ></div>
              <div
                className={`red-light w-24 h-24 rounded-full border-2 border-red-600 ${isDPMode
                  ? (cbStatusDP === 2 || cbStatusDP === 3) ? 'bg-red-600' : 'bg-red-200 opacity-50'
                  : (cbStatusClose === 1 && cbStatusOpen === 0) ? 'bg-red-600' : 'bg-red-200 opacity-50'
                  }`}
              ></div>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex flex-row gap-2 justify-around my-1">
            <Button
              onClick={() => handleOpen()}
              className={`text-xs w-12 h-12 rounded-full flex items-center justify-center bg-green-600 border-2 border-black ${isRemote ? 'opacity-50' : ''
                }`}
              disabled={isRemote || item.isEditing}
            >
              Open
            </Button>

            <Button
              onClick={() => handleClose()}
              className={`text-xs w-12 h-12 rounded-full flex items-center justify-center bg-red-600 border-2 border-black ${isRemote ? 'opacity-50' : ''
                }`}
              disabled={isRemote || item.isEditing}
            >
              Close
            </Button>
          </div>

          {/* Special operation buttons */}
          <div className="flex flex-row justify-around gap-2 text-sm">
            <Button
              size="sm"
              variant="outline"
              className={`text-xs border-black text-blue-600 hover:bg-blue-600 hover:text-white ${isRemote ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              disabled={isRemote || item.isEditing || !isDPMode}
              onClick={() => isDPMode && handleInvalid(0)} // Set to invalid 0
            >
              Invalid 0
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`text-xs border-black text-blue-600 hover:bg-blue-600 hover:text-white ${isRemote ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              disabled={isRemote || item.isEditing}
              onClick={() => handleTrip()} // Trip
            >
              Trip
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`text-xs border-black text-blue-600 hover:bg-blue-600 hover:text-white ${isRemote ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              disabled={isRemote || item.isEditing || !isDPMode}
              onClick={() => isDPMode && handleInvalid(3)} // Set to invalid 3
            >
              Invalid 3
            </Button>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3">
          <div className="text-sm flex flex-col">
            {isDPMode ? (
              <>
                <p>IOA CB Status DP: <span className="font-bold">{item.ioa_cb_status_dp}</span></p>
                <p>IOA Control DP: <span className="font-bold">{item.ioa_control_dp}</span></p>
              </>
            ) : (
              <>
                <p>IOA CB Status Open/Close: <span className="font-bold">{item.ioa_cb_status}/{item.ioa_cb_status_close}</span></p>
                <p>IOA Control Open/Close: <span className="font-bold">{item.ioa_control_open}/{item.ioa_control_close}</span></p>
              </>
            )}
            <p>IOA Local/Remote: <span className="font-bold">{item.ioa_local_remote}</span></p>
            <p>SBO: <span className="font-bold">{isSBO ? "True" : "False"}</span></p>
            <p>Mode: <span className="font-bold">{getModeText()}</span></p>
          </div>

          {item.isEditing ? (
            <div className="flex flex-row gap-2 justify-center">
              <Button
                size="sm"
                className={`bg-white text-blue-500 rounded w-9 h-9 border-2 border-black hover:bg-gray-300}`}
                onClick={() => item.onEdit && item.onEdit(item.id)}
              >
                <FiEdit2 />
              </Button>
              <Button
                size="sm"
                className={`bg-white text-red-500 rounded w-9 h-9 border-2 border-black hover:bg-gray-300}`}
                onClick={() => item.onDelete && item.onDelete(item.id)}
              >
                <FiTrash2 />
              </Button>
            </div>
          ) : (
            <div className="flex flex-row gap-2 text-white">
              <Button
                size="sm"
                className={`border border-black text-xs hover:bg-blue-600 hover:text-white ${isSBO ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'} ${item.remote == 1 ? 'opacity-50' : ''}`}
                onClick={() => !isRemote && toggleSBO()}
                disabled={isRemote}
              >
                SBO
              </Button>

              {/* Mode selector buttons */}
              <Button
                size="sm"
                className={`border border-black text-xs hover:bg-blue-600 hover:text-white ${!isDPMode ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'} ${isRemote ? 'opacity-50' : ''}`}
                onClick={() => !isRemote && setSPMode()}
                disabled={isRemote}
              >
                SP
              </Button>
              <Button
                size="sm"
                className={`border border-black text-xs hover:bg-blue-600 hover:text-white ${isDPMode ? 'bg-blue-500 text-white' : 'bg-white text-blue-500'} ${isRemote ? 'opacity-50' : ''}`}
                onClick={() => !isRemote && setDPMode()}
                disabled={isRemote}
              >
                DP
              </Button>
            </div>
          )}
          {/* Local/Remote switch */}
          <div className="flex flex-row gap-4 items-center">
            <span className={`font-bold ${!isRemote ? 'text-red-500' : ''}`}>Local</span>
            <Switch
              id={`location-mode-${item.id}`}
              checked={isRemote}
              onCheckedChange={toggleLocalRemote}
              disabled={item.isEditing}
            />
            <span className={`font-bold ${isRemote ? 'text-red-500' : ''}`}>Remote</span>
          </div>
        </div>
      </div>
    </div >
  );
}

export { CircuitBreaker };