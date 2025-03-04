// frontend/src/components/ManageItemDialog.tsx (updated)
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

interface Item {
  id: string;
  name: string;
  address: number;
  unit?: string;
}

type ManageItemDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  action: "add" | "remove";
  itemType: string;
  items?: Item[];
  onSubmit: (data: any) => void;
};

export function ManageItemDialog({
  isOpen,
  onClose,
  title,
  action,
  itemType,
  items = [],
  onSubmit,
}: ManageItemDialogProps) {
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [valueTelesignal, setValueTelesignal] = React.useState("");
  const [valueTelemetry, setValueTelemetry] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [selectedItem, setSelectedItem] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (action === "add") {
      onSubmit({ name, address: parseInt(address) });
      setName("");
      setAddress("");
    } else {
      onSubmit({ id: selectedItem });
      setSelectedItem("");
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {action === "add" ? (
            <>
              <div className="grid w-full items-center gap-1.5">
                <label htmlFor="name" className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  id="name"
                  className="border rounded p-2 w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <label htmlFor="address" className="text-sm font-medium">Address/IOA</label>
                <input
                  type="number"
                  id="address"
                  className="border rounded p-2 w-full"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
              {action === "add" && itemType === "Telesignals" && (
                <div className="grid w-full items-center gap-1.5">
                  <label htmlFor="value" className="text-sm font-medium">Value</label>
                  <RadioGroup
                    value={valueTelesignal}
                    onValueChange={setValueTelesignal}
                    defaultValue="off"
                  >
                    <div className="flex flex-row gap-6">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="on" id="r1" />
                        <Label htmlFor="r1">On</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="off" id="r2" />
                        <Label htmlFor="r2">Off</Label>
                      </div></div>
                  </RadioGroup>
                </div>
              )}
              {action === "add" && itemType === "Telemetry" && (
                <>
                  <div className="grid w-full items-center gap-1.5">
                    <label htmlFor="value" className="text-sm font-medium">Value</label>
                    <input
                      type="number"
                      id="value"
                      className="border rounded p-2 w-full"
                      value={valueTelemetry}
                      onChange={(e) => setValueTelemetry(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid w-full items-center gap-1.5">
                    <label htmlFor="unit" className="text-sm font-medium">Unit</label>
                    <input
                      type="text"
                      id="unit"
                      className="border rounded p-2 w-full"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="grid w-full items-center gap-1.5">
              <label htmlFor="item" className="text-sm font-medium">Select {itemType} to remove</label>
              <select
                id="item"
                className="border rounded p-2 w-full"
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                required
              >
                <option value="">Select {itemType}</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant={action === "add" ? "default" : "destructive"}>
              {action === "add" ? "Add" : "Remove"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}