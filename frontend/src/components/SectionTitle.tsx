import { Button } from "./ui/button";

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex flex-row border-b-2">
      <h2 className="text-xl font-semibold pl-7 pt-1 pr-36 m-2">{title}</h2>
      <Button
        className="bg-blue-500 text-white rounded m-2 h-9  w-9"
        // TODO
        onClick={() => (true)}
      >
        +
      </Button>
      <Button
        className="bg-red-500 text-white rounded m-2 h-9 w-9"
        // TODO
        onClick={() => (true)}
      >
        -
      </Button>
    </div>
  );
}

export { SectionTitle };
