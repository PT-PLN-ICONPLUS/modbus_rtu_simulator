/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Toaster } from "./ui/sonner";
import { toast } from "sonner";
import { Item } from "@/lib/items";

const FormField = memo(({
  label,
  id,
  type = "text",
  value,
  onChange,
  error,
  children
}: {
  label: string;
  id: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  error?: string;
  children?: React.ReactNode;
}) => (
  <div className="flex items-start mb-4">
    <Label htmlFor={id} className="w-1/3 pt-2 text-right pr-4">
      {label}
    </Label>
    <div className="w-2/3">
      {children || (
        <input
          type={type}
          id={id}
          className={`border rounded p-2 w-full ${error ? "border-red-500" : ""}`}
          value={value}
          onChange={onChange}
          step={type === "number" ? "any" : undefined}
        />
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  </div>
));

FormField.displayName = 'FormField';

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
  // Common fields
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [interval, setInterval] = useState("5");
  const [selectedItem, setSelectedItem] = useState("");

  // Circuit breaker fields
  const [ioaControlOpen, setIOAControlOpen] = useState("");
  const [ioaControlClose, setIOAControlClose] = useState("");
  const [ioaLocalRemote, setIOALocalRemote] = useState("");
  const [isDoublePoint, setIsDoublePoint] = useState("false");
  const [addressDP, setAddressDP] = useState("");
  const [ioaCbStatusClose, setIoaCbStatusClose] = useState("");
  const [controlDP, setControlDP] = useState("");

  // Telesignal fields
  const [valTelesignal, setValTelesignal] = useState("");

  // Telemetry fields
  const [unit, setUnit] = useState("");
  const [valTelemetry, setValTelemetry] = useState("");
  const [scaleFactor, setScaleFactor] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form on open/close
  useEffect(() => {
    if (isOpen) {
      // Keep defaults
      setScaleFactor("1");
      // Default valTelemetry based on min and max if they're set

    } else {
      // Reset form
      setName("");
      setAddress("");
      setInterval("5");
      setSelectedItem("");
      setIOAControlOpen("");
      setIOAControlClose("");
      setIOALocalRemote("");
      setIsDoublePoint("false");
      setAddressDP("");
      setIoaCbStatusClose("");
      setControlDP("");
      setUnit("");
      setMinValue("");
      setMaxValue("");
      setErrors({});
      setValTelemetry("");
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // For remove action, only validate selectedItem
    if (action === "remove") {
      if (!selectedItem) {
        newErrors.selectedItem = "Please select an item to remove";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    // Common validations
    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (
      action === "add" &&
      items.some(item => item.name.toLowerCase() === name.toLowerCase())
    ) {
      newErrors.name = "Name already exists";
    }

    if (!address) {
      newErrors.address = "Address/IOA is required";
    } else if (isNaN(Number(address))) {
      newErrors.address = "Address/IOA must be a number";
    } else if (
      action === "add" &&
      itemType === "Circuit Breakers" &&
      items.some((item: any) => item.ioa_cb_status === Number(address))
    ) {
      newErrors.address = "Address/IOA already in use";
    } else if (
      action === "add" &&
      itemType === "Telesignals" &&
      items.some((item: any) => item.ioa === Number(address))
    ) {
      newErrors.address = "Address/IOA already in use";
    } else if (
      action === "add" &&
      itemType === "Telemetry" &&
      items.some((item: any) => item.ioa === Number(address))
    ) {
      newErrors.address = "Address/IOA already in use";
    }

    if (!interval || isNaN(Number(interval)) || Number(interval) <= 0) {
      newErrors.interval = "Valid interval is required";
    }

    // Circuit breaker specific validations
    if (itemType === "Circuit Breakers") {
      if (!ioaControlOpen) {
        newErrors.ioaControlOpen = "IOA Control Open is required";
      } else if (isNaN(Number(ioaControlOpen))) {
        newErrors.ioaControlOpen = "IOA Control Open must be a number";
      } else if (
        action === "add" &&
        items.some((item: any) => item.ioa_control_open === Number(ioaControlOpen))
      ) {
        newErrors.ioaControlOpen = "IOA Control Open already in use";
      }

      if (!ioaControlClose) {
        newErrors.ioaControlClose = "IOA Control Close is required";
      } else if (isNaN(Number(ioaControlClose))) {
        newErrors.ioaControlClose = "IOA Control Close must be a number";
      } else if (
        action === "add" &&
        items.some((item: any) => item.ioa_control_close === Number(ioaControlClose))
      ) {
        newErrors.ioaControlClose = "IOA Control Close already in use";
      }

      if (!ioaLocalRemote) {
        newErrors.ioaLocalRemote = "IOA Local Remote is required";
      } else if (isNaN(Number(ioaLocalRemote))) {
        newErrors.ioaLocalRemote = "IOA Local Remote must be a number";
      } else if (
        action === "add" &&
        items.some((item: any) => item.ioa_local_remote === Number(ioaLocalRemote))
      ) {
        newErrors.ioaLocalRemote = "IOA Local Remote already in use";
      }

      if (!ioaCbStatusClose) {
        newErrors.ioaCbStatusClose = "IOA CB Status Close is required";
      } else if (isNaN(Number(ioaCbStatusClose))) {
        newErrors.ioaCbStatusClose = "IOA CB Status Close must be a number";
      }

      if (isDoublePoint === "true") {
        if (!addressDP) {
          newErrors.addressDP = "Double point address/IOA is required";
        } else if (isNaN(Number(addressDP))) {
          newErrors.addressDP = "Double point address/IOA must be a number";
        } else if (
          action === "add" &&
          items.some((item: any) => item.ioa_data_dp === Number(addressDP))
        ) {
          newErrors.addressDP = "Double point address/IOA already in use";
        }

        if (!controlDP) {
          newErrors.controlDP = "Control Double Point address is required";
        } else if (isNaN(Number(controlDP))) {
          newErrors.controlDP = "Control Double Point address must be a number";
        }
      }
    }

    // Telemetry specific validations
    if (itemType === "Telemetry") {
      if (!unit.trim()) {
        newErrors.unit = "Unit is required";
      }

      if (!valTelemetry || isNaN(Number(valTelemetry))) {
        newErrors.valTelemetry = "Valid value is required";
      }

      if (!scaleFactor || isNaN(Number(scaleFactor))) {
        newErrors.scaleFactor = "Valid scale factor is required";
      }

      if (!minValue || isNaN(Number(minValue))) {
        newErrors.minValue = "Valid minimum value is required";
      }

      if (!maxValue || isNaN(Number(maxValue))) {
        newErrors.maxValue = "Valid maximum value is required";
      }

      if (Number(minValue) >= Number(maxValue)) {
        newErrors.range = "Maximum value must be greater than minimum value";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Display general error toast
      toast.error("Please fix the errors in the form");
      return;
    }

    if (action === "add") {
      if (itemType === "Circuit Breakers") {
        const isDP = isDoublePoint === "true";
        onSubmit({
          name,
          ioa_cb_status: parseInt(address),
          ioa_cb_status_close: parseInt(ioaCbStatusClose),
          ioa_control_open: parseInt(ioaControlOpen),
          ioa_control_close: parseInt(ioaControlClose),
          ioa_local_remote: parseInt(ioaLocalRemote),
          is_double_point: isDP,
          ioa_cb_status_dp: isDP ? parseInt(addressDP) : undefined,
          ioa_control_dp: isDP ? parseInt(controlDP) : undefined,
          remote: 0,  // Default to local mode
          interval: parseInt(interval),
        });
      } else if (itemType === "Telesignals") {
        onSubmit({
          name,
          ioa: parseInt(address),
          interval: parseInt(interval),
          value: parseInt(valTelesignal),
        });
      } else if (itemType === "Telemetry") {
        onSubmit({
          name,
          ioa: parseInt(address),
          unit,
          value: parseFloat(valTelemetry),
          scale_factor: parseFloat(scaleFactor),
          min_value: parseFloat(minValue),
          max_value: parseFloat(maxValue),
          interval: parseInt(interval)
        });
      }
    } else {
      onSubmit({ id: selectedItem });
      setSelectedItem("");
    }

    onClose();
  };

  return (
    <>
      <Toaster />
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent aria-describedby={undefined} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="py-4">
            {action === "add" ? (
              <>
                <FormField
                  label="Name"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={errors.name}
                />

                <FormField
                  label="Interval (s)"
                  id="interval"
                  type="number"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  error={errors.interval}
                />

                <FormField
                  label={itemType === "Circuit Breakers" ? "IOA CB Status Open" : "Address/IOA"}
                  id="address"
                  type="number"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  error={errors.address}
                />

                {itemType === "Circuit Breakers" && (
                  <>

                    <FormField
                      label="IOA CB Status Close"
                      id="ioaCbStatusClose"
                      type="number"
                      value={ioaCbStatusClose}
                      onChange={(e) => setIoaCbStatusClose(e.target.value)}
                      error={errors.ioaCbStatusClose}
                    />

                    <FormField
                      label="IOA Control Open"
                      id="ioaControlOpen"
                      type="number"
                      value={ioaControlOpen}
                      onChange={(e) => setIOAControlOpen(e.target.value)}
                      error={errors.ioaControlOpen}
                    />

                    <FormField
                      label="IOA Control Close"
                      id="ioaControlClose"
                      type="number"
                      value={ioaControlClose}
                      onChange={(e) => setIOAControlClose(e.target.value)}
                      error={errors.ioaControlClose}
                    />

                    <FormField
                      label="IOA Local/Remote"
                      id="ioaLocalRemote"
                      type="number"
                      value={ioaLocalRemote}
                      onChange={(e) => setIOALocalRemote(e.target.value)}
                      error={errors.ioaLocalRemote}
                    />

                    <FormField
                      label="Double Point"
                      id="isDoublePoint"
                      error={errors.isDoublePoint}
                    >
                      <RadioGroup
                        value={isDoublePoint}
                        onValueChange={setIsDoublePoint}
                        defaultValue="false"
                        className="flex flex-row gap-6 mt-2 mb-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id="dp-yes" />
                          <Label htmlFor="dp-yes">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id="dp-no" />
                          <Label htmlFor="dp-no">No</Label>
                        </div>
                      </RadioGroup>
                    </FormField>

                    {isDoublePoint === "true" && (
                      <>
                        <FormField
                          label="IOA CB Status DP"
                          id="address-dp"
                          type="number"
                          value={addressDP}
                          onChange={(e) => setAddressDP(e.target.value)}
                          error={errors.addressDP}
                        />

                        <FormField
                          label="IOA Control DP"
                          id="control-dp"
                          type="number"
                          value={controlDP}
                          onChange={(e) => setControlDP(e.target.value)}
                          error={errors.controlDP}
                        />
                      </>
                    )}
                  </>
                )}

                {itemType === "Telesignals" && (
                  <FormField
                    label="Value"
                    id="value_telesignal"
                    error={errors.valTelesignal}
                  >
                    <RadioGroup
                      value={valTelesignal}
                      onValueChange={setValTelesignal}
                      defaultValue="0"
                      className="flex flex-row gap-6 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1" id="on" />
                        <Label htmlFor="on">ON</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="0" id="off" />
                        <Label htmlFor="off">OFF</Label>
                      </div>
                    </RadioGroup>
                  </FormField>
                )}

                {itemType === "Telemetry" && (
                  <>
                    <FormField
                      label="Unit"
                      id="unit"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      error={errors.unit}
                    />

                    <FormField
                      label="Value"
                      id="value_telemetry"
                      type="number"
                      value={valTelemetry}
                      onChange={(e) => setValTelemetry(e.target.value)}
                      error={errors.valTelemetry}
                    />

                    <FormField
                      label="Min Value"
                      id="min-value"
                      type="number"
                      value={minValue}
                      onChange={(e) => setMinValue(e.target.value)}
                      error={errors.minValue}
                    />

                    <FormField
                      label="Max Value"
                      id="max-value"
                      type="number"
                      value={maxValue}
                      onChange={(e) => setMaxValue(e.target.value)}
                      error={errors.maxValue || errors.range}
                    />

                    <FormField
                      label="Scale Factor"
                      id="scale-factor"
                      error={errors.scaleFactor}
                    >
                      <select
                        id="scale-factor"
                        className={`border rounded p-2 w-full ${errors.scaleFactor ? "border-red-500" : ""}`}
                        value={scaleFactor}
                        onChange={(e) => setScaleFactor(e.target.value)}
                      >
                        <option value="1">1</option>
                        <option value="0.1">0.1</option>
                        <option value="0.01">0.01</option>
                        <option value="0.001">0.001</option>
                      </select>
                    </FormField>
                  </>
                )}
              </>
            ) : (
              <FormField
                label={`Select ${itemType}`}
                id="item"
                error={errors.selectedItem}
              >
                <select
                  id="item"
                  className={`border rounded p-2 w-full ${errors.selectedItem ? "border-red-500" : ""}`}
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                >
                  <option value="">Select {itemType}</option>
                  {items.map((item: any) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </FormField>
            )}

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant={action === "add" ? "default" : "destructive"}>
                {action === "add" ? "Add" : "Remove"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}