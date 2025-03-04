import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"



function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex flex-row border-b-2">
      <h2 className="text-xl font-semibold pl-7 pt-1 pr-36 m-2">{title}</h2>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="bg-blue-500 text-white rounded m-2 h-9 w-9 border border-black"
              // TODO
              onClick={() => (true)}
            >
              +
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add new {title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="bg-red-500 text-white rounded m-2 h-9 w-9 border border-black"
              // TODO
              onClick={() => (true)}
            >
              +
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Remove a {title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export { SectionTitle };
