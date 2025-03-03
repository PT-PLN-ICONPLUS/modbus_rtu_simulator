import { useState } from "react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";

function CircuitBreaker() {
  const [isLocal, setIsLocal] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [isSBO, setIsSBO] = useState(false);
  const [isDP, setIsDP] = useState(false);

  return (
    <div className="flex flex-row gap-2 justify-around border-b-2">
      <div className="flex flex-col my-2">
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
            className={`w-12 h-12 rounded-full flex items-center justify-center bg-green-600 border-2 border-black`}
          >
            Open
          </Button>

          <Button
            onClick={() => setIsOpen(false)}
            className={`w-12 h-12 rounded-full flex items-center justify-center bg-red-600 border-2 border-black`}
          >
            Close
          </Button>
        </div>

        <div className="flex flex-row justify-around gap-1 text-sm">
          <Button size="sm" variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white">Invalid 0</Button>
          <Button size="sm" variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white">Trip</Button>
          <Button size="sm" variant="outline" className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white">Invalid 3</Button>
        </div>
      </div>

      <div className="flex flex-col justify-center gap-2">
        <div className="text-sm font-semibold flex flex-col">
          <text className="">IQA Data: 300</text>
          <text className="">IQA Command: 6000</text>
          <text className="">SBO: {isSBO ? "True" : "False"}</text>
          <text className="">Type: {isDP ? "Double" : "Single"} Point Command</text>
        </div>

        <div className="flex flex-row justify-around text-sm text-white">
          <Button
            size="sm"
            className={isSBO ? "bg-blue-500 text-white" : "bg-white text-blue-500 border border-blue-500"}
            onClick={() => setIsSBO(!isSBO)}
          >
            SBO
          </Button>
          <Button
            size="sm"
            className={isDP ? "bg-blue-500 text-white" : "bg-white text-blue-500 border border-blue-500"}
            onClick={() => setIsDP(!isDP)}
          >
            Double Point
          </Button>
        </div>

        <div className="flex flex-row justify-around items-center">
          <span className={`text-sm font-bold  ${isLocal ? 'text-red-500' : ''}`}>Local</span>
          <Switch
            id="location-mode"
            checked={!isLocal}
            onCheckedChange={(checked) => setIsLocal(!checked)}
          />
          <span className={`text-sm font-bold ${!isLocal ? 'text-red-500' : ''}`}>Remote</span>
        </div>
      </div>

    </div>
  )
}

export { CircuitBreaker };