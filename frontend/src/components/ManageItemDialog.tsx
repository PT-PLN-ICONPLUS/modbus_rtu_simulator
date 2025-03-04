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

interface Item {
  id: string;
  name: string;
  address: number;
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
                <label htmlFor="address" className="text-sm font-medium">Address</label>
                <input
                  type="number"
                  id="address"
                  className="border rounded p-2 w-full"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
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