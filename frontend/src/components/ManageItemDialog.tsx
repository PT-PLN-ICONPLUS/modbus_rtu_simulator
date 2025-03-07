/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
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

export interface CircuitBreakerItem {
  id: string;
  name: string;
  ioa_data: number;
  ioa_data_dp?: number;
  ioa_command: number;
  ioa_command_dp?: number;
  is_sbo: boolean;
  is_double_point: boolean;
  value: number;
}

export interface TeleSignalItem {
  id: string;
  name: string;
  ioa: number;
  value: number;
}

export interface TelemetryItem {
  id: string;
  name: string;
  ioa: number;
  unit: string;
  value: number;
  scale_factor: number;
  min_value: number;
  max_value: number;
}

export type Item = CircuitBreakerItem | TeleSignalItem | TelemetryItem;

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
  const [isSBO, setIsSBO] = useState("false");
  const [isDoublePoint, setIsDoublePoint] = useState("false");
  const [commandAddress, setCommandAddress] = useState("");
  const [addressDP, setAddressDP] = useState("");
  const [commandAddressDP, setCommandAddressDP] = useState("");

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
      setIsSBO("false");
      setIsDoublePoint("false");
      setCommandAddress("");
      setAddressDP("");
      setCommandAddressDP("");
      setUnit("");
      setMinValue("");
      setMaxValue("");
      setErrors({});
      setValTelemetry("");
    }
  }, [isOpen, minValue, maxValue]);

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
      newErrors.address = "Address is required";
    } else if (isNaN(Number(address))) {
      newErrors.address = "Address must be a number";
    } else if (
      action === "add" &&
      itemType === "Circuit Breakers" &&
      items.some((item: any) => item.ioa_data === Number(address))
    ) {
      newErrors.address = "Address already in use";
    } else if (
      action === "add" &&
      itemType === "Telesignals" &&
      items.some((item: any) => item.ioa === Number(address))
    ) {
      newErrors.address = "Address already in use";
    } else if (
      action === "add" &&
      itemType === "Telemetry" &&
      items.some((item: any) => item.ioa === Number(address))
    ) {
      newErrors.address = "Address already in use";
    }

    if (!interval || isNaN(Number(interval)) || Number(interval) <= 0) {
      newErrors.interval = "Valid interval is required";
    }

    // Circuit breaker specific validations
    if (itemType === "Circuit Breakers") {
      if (!commandAddress) {
        newErrors.commandAddress = "Command address is required";
      } else if (isNaN(Number(commandAddress))) {
        newErrors.commandAddress = "Command address must be a number";
      } else if (
        action === "add" &&
        items.some((item: any) => item.ioa_command === Number(commandAddress))
      ) {
        newErrors.commandAddress = "Command address already in use";
      }

      if (isDoublePoint === "true") {
        if (!addressDP) {
          newErrors.addressDP = "Double point address is required";
        } else if (isNaN(Number(addressDP))) {
          newErrors.addressDP = "Double point address must be a number";
        } else if (
          action === "add" &&
          items.some((item: any) => item.ioa_data_dp === Number(addressDP))
        ) {
          newErrors.addressDP = "Double point address already in use";
        }

        if (!commandAddressDP) {
          newErrors.commandAddressDP = "Double point command address is required";
        } else if (isNaN(Number(commandAddressDP))) {
          newErrors.commandAddressDP = "Double point command address must be a number";
        } else if (
          action === "add" &&
          items.some((item: any) => item.ioa_command_dp === Number(commandAddressDP))
        ) {
          newErrors.commandAddressDP = "Double point command address already in use";
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
          ioa_data: parseInt(address),
          ioa_data_dp: isDP ? parseInt(addressDP) : undefined,
          ioa_command: parseInt(commandAddress),
          ioa_command_dp: isDP ? parseInt(commandAddressDP) : undefined,
          is_sbo: isSBO === "true",
          is_double_point: isDP,
          interval: parseInt(interval),
          value: 0,
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {action === "add" ? (
              <>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="name">Name</Label>
                  <input
                    type="text"
                    id="name"
                    className={`border rounded p-2 w-full ${errors.name ? "border-red-500" : ""}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                </div>

                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="interval">Interval (s)</Label>
                  <input
                    type="number"
                    id="interval"
                    className={`border rounded p-2 w-full ${errors.interval ? "border-red-500" : ""}`}
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                  />
                  {errors.interval && <p className="text-red-500 text-xs">{errors.interval}</p>}
                </div>

                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="address">
                    {itemType === "Circuit Breakers" ? "Data Address/IOA" : "Address/IOA"}
                  </Label>
                  <input
                    type="number"
                    id="address"
                    className={`border rounded p-2 w-full ${errors.address ? "border-red-500" : ""}`}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                  {errors.address && <p className="text-red-500 text-xs">{errors.address}</p>}
                </div>

                {itemType === "Circuit Breakers" && (
                  <>
                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor="address-command">Command Address/IOA</Label>
                      <input
                        type="number"
                        id="address-command"
                        className={`border rounded p-2 w-full ${errors.commandAddress ? "border-red-500" : ""}`}
                        value={commandAddress}
                        onChange={(e) => setCommandAddress(e.target.value)}
                      />
                      {errors.commandAddress && <p className="text-red-500 text-xs">{errors.commandAddress}</p>}
                    </div>

                    <div className="grid w-full items-center gap-1.5">
                      <Label>Double Point</Label>
                      <RadioGroup
                        value={isDoublePoint}
                        onValueChange={setIsDoublePoint}
                        defaultValue="false"
                      >
                        <div className="flex flex-row gap-6">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id="dp-yes" />
                            <Label htmlFor="dp-yes">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id="dp-no" />
                            <Label htmlFor="dp-no">No</Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor="is-sbo">SBO</Label>
                      <RadioGroup
                        value={isSBO}
                        onValueChange={setIsSBO}
                        defaultValue="false"
                      >
                        <div className="flex flex-row gap-6">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id="sbo-yes" />
                            <Label htmlFor="sbo-yes">Yes</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id="sbo-no" />
                            <Label htmlFor="sbo-no">No</Label>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    {isDoublePoint === "true" && (
                      <>
                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="address-dp">Double Point Address/IOA</Label>
                          <input
                            type="number"
                            id="address-dp"
                            className={`border rounded p-2 w-full ${errors.addressDP ? "border-red-500" : ""}`}
                            value={addressDP}
                            onChange={(e) => setAddressDP(e.target.value)}
                          />
                          {errors.addressDP && <p className="text-red-500 text-xs">{errors.addressDP}</p>}
                        </div>

                        <div className="grid w-full items-center gap-1.5">
                          <Label htmlFor="address-command-dp">Double Point Command Address/IOA</Label>
                          <input
                            type="number"
                            id="address-command-dp"
                            className={`border rounded p-2 w-full ${errors.commandAddressDP ? "border-red-500" : ""}`}
                            value={commandAddressDP}
                            onChange={(e) => setCommandAddressDP(e.target.value)}
                          />
                          {errors.commandAddressDP && <p className="text-red-500 text-xs">{errors.commandAddressDP}</p>}
                        </div>
                      </>
                    )}
                  </>
                )}

                {itemType === "Telesignals" && (
                  <div>
                    <Label htmlFor="value_telesignal">Value</Label>
                    <RadioGroup
                      value={valTelesignal}
                      onValueChange={setValTelesignal}
                      defaultValue="0"
                    >
                      <div className="flex flex-row gap-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1" id="on" />
                          <Label htmlFor="on">ON</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="0" id="off" />
                          <Label htmlFor="off">OFF</Label>
                        </div>
                      </div>
                    </RadioGroup>
                    {errors.valTelesignal && <p className="text-red-500 text-xs">{errors.valTelesignal}</p>}
                  </div>
                )}

                {itemType === "Telemetry" && (
                  <>
                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor="unit">Unit</Label>
                      <input
                        type="text"
                        id="unit"
                        className={`border rounded p-2 w-full ${errors.unit ? "border-red-500" : ""}`}
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                      />
                      {errors.unit && <p className="text-red-500 text-xs">{errors.unit}</p>}
                    </div>

                    <div>
                      <Label htmlFor="value_telemetry">Value</Label>
                      <input
                        type="number"
                        id="value_telemetry"
                        className={`border rounded p-2 w-full ${errors.unit ? "border-red-500" : ""}`}
                        value={valTelemetry}
                        onChange={(e) => setValTelemetry(e.target.value)}
                      />
                      {errors.valTelemetry && <p className="text-red-500 text-xs">{errors.valTelemetry}</p>}
                    </div>

                    <div className="grid w-full items-center gap-1.5"></div>
                    <Label htmlFor="scale-factor">Scale Factor</Label>
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
                    {errors.scaleFactor && <p className="text-red-500 text-xs">{errors.scaleFactor}</p>}

                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor="min-value">Min Value</Label>
                      <input
                        type="number"
                        id="min-value"
                        className={`border rounded p-2 w-full ${errors.minValue ? "border-red-500" : ""}`}
                        value={minValue}
                        onChange={(e) => setMinValue(e.target.value)}
                        step="any"
                      />
                      {errors.minValue && <p className="text-red-500 text-xs">{errors.minValue}</p>}
                    </div>

                    <div className="grid w-full items-center gap-1.5">
                      <Label htmlFor="max-value">Max Value</Label>
                      <input
                        type="number"
                        id="max-value"
                        className={`border rounded p-2 w-full ${errors.maxValue ? "border-red-500" : ""}`}
                        value={maxValue}
                        onChange={(e) => setMaxValue(e.target.value)}
                        step="any"
                      />
                      {errors.maxValue && <p className="text-red-500 text-xs">{errors.maxValue}</p>}
                    </div>

                    {errors.range && <p className="text-red-500 text-xs">{errors.range}</p>}
                  </>
                )}
              </>
            ) : (
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="item">Select {itemType} to remove</Label>
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
                {errors.selectedItem && <p className="text-red-500 text-xs">{errors.selectedItem}</p>}
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
    </>
  );
}