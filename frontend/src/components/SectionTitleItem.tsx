// frontend/src/components/SectionTitle.tsx (updated)
import React from "react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { ManageItemDialog } from "./ManageItemDialog";

interface Item {
  id: string;
  name: string;
  address: number;
}

interface SectionTitleProps {
  title: string;
  onAdd: (data: { name: string; address: number }) => void;
  onRemove: (data: { id: string }) => void;
  items: Item[];
}

function SectionTitle({ title, onAdd, onRemove, items }: SectionTitleProps) {
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = React.useState(false);

  return (
    <div className="flex flex-row border-b-2">
      <h2 className="text-xl font-semibold pl-7 pt-1 pr-36 m-2">{title}</h2>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="bg-blue-500 text-white rounded m-2 h-9 w-9 border border-black"
              onClick={() => setAddDialogOpen(true)}
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
              onClick={() => setRemoveDialogOpen(true)}
            >
              -
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Remove a {title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ManageItemDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        title={`Add New ${title.slice(0, -1)}`}
        action="add"
        itemType={title.slice(0, -1)}
        onSubmit={onAdd}
      />

      <ManageItemDialog
        isOpen={removeDialogOpen}
        onClose={() => setRemoveDialogOpen(false)}
        title={`Remove ${title.slice(0, -1)}`}
        action="remove"
        itemType={title.slice(0, -1)}
        items={items}
        onSubmit={onRemove}
      />
    </div>
  );
}

export { SectionTitle };