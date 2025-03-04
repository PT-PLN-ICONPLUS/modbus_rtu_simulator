import { useState } from "react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";

function CircuitBreaker() {
  // TODO DYNAMIC
  const [isLocal, setIsLocal] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [isSBO, setIsSBO] = useState(false);
  const [isDP, setIsDP] = useState(false);

  return (
    <div>
      <div className="flex flex-row border-b-2">
        <div className="flex flex-col my-2 mx-6">
          <div className="flex flex-row">
            <div className="flex w-full justify-around gap-3">
              <div
                className={`w-24 h-24 rounded-full border-2 border-green-600 ${isOpen ? 'bg-green-600' : 'bg-green-200 opacity-50'}`}
              ></div>
              <div
                className={`w-24 h-24 rounded-full border-2 border-red-600 ${!isOpen ? 'bg-red-600' : 'bg-red-200 opacity-50'}`}
              ></div>
            </div>
          </div>

          <div className="flex flex-row gap-2 justify-around my-1">
            <Button
              onClick={() => setIsOpen(true)}
              className={`text-xs w-12 h-12 rounded-full flex items-center justify-center bg-green-600 border-2 border-black ${!isLocal ? 'opacity-50' : ''}`}
              disabled={!isLocal}
            >
              Open
            </Button>

            <Button
              onClick={() => setIsOpen(false)}
              className={`text-xs w-12 h-12 rounded-full flex items-center justify-center bg-red-600 border-2 border-black ${!isLocal ? 'opacity-50' : ''}`}
              disabled={!isLocal}
            >
              Close
            </Button>
          </div>

          <div className="flex flex-row justify-around gap-1 text-sm">
            <Button
              size="sm"
              variant="outline"
              className={`text-xs border-black text-blue-600 hover:bg-blue-600 hover:text-white ${(!isDP || !isLocal) ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!isDP || !isLocal}
            >
              Invalid 0
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`text-xs border-black text-blue-600 hover:bg-blue-600 hover:text-white ${!isLocal ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!isLocal}
            >
              Trip
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={`text-xs border-black text-blue-600 hover:bg-blue-600 hover:text-white ${(!isDP || !isLocal) ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!isDP || !isLocal}
            >
              Invalid 3
            </Button>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-5">
          <div className="text-sm font-semibold flex flex-col">
            <text className="">IOA Data: 300</text>
            <text className="">IOA Command: 6000</text>
            <text className="">SBO: {isSBO ? "True" : "False"}</text>
            <text className="">Type: {isDP ? "Double" : "Single"} Point Command</text>
          </div>

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

          <div className="flex flex-row gap-4 items-center">
            <span className={`font-bold ${isLocal ? 'text-red-500' : ''}`}>Local</span>
            <Switch
              id="location-mode"
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