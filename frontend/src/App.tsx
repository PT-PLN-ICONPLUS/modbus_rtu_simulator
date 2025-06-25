import { useState, useEffect } from 'react';
import socket from './socket';
import { CircuitBreaker } from './components/CircuitBreakerItem';
import { TeleSignal } from './components/TeleSignalItem';
import { Telemetry } from './components/TeleMetryItem';
import { CircuitBreakerItem, TapChangerItem, TeleSignalItem, TelemetryItem } from './lib/items';

import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './components/SortableItem';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import { Button } from './components/ui/button';

import { MdAdd, MdOutlineModeEditOutline, MdOutlineCheck } from "react-icons/md";
import { CgImport } from "react-icons/cg";
import { PiExportBold } from "react-icons/pi";
import { ManageItemDialog } from './components/ManageItemDialog';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { TbDragDrop } from "react-icons/tb";
import { TapChanger } from './components/TapChangerItem';

function App() {
  const [circuitBreakers, setCircuitBreakers] = useState<CircuitBreakerItem[]>([]);
  const [teleSignals, setTeleSignals] = useState<TeleSignalItem[]>([]);
  const [teleMetries, setTeleMetries] = useState<TelemetryItem[]>([]);
  const [tapChangers, setTapChangers] = useState<TapChangerItem[]>([]);

  const [combinedOrder, setCombinedOrder] = useState<{ id: string; type: string }[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedItemType, setSelectedItemType] = useState<'circuit_breaker' | 'telesignal' | 'telemetry' | 'tap_changer' | null>(null);
  const [selectedItemToEdit, setSelectedItemToEdit] = useState<unknown>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'circuit_breaker' | 'telesignal' | 'telemetry' | 'tap_changer' | null } | null>(null);

  useEffect(() => {
    // Emit 'get_initial_data' to request initial data
    socket.emit('get_initial_data');

    // Listen for the response
    socket.on('get_initial_data_response', (response: {
      circuit_breakers: CircuitBreakerItem[];
      telesignals: TeleSignalItem[];
      telemetries: TelemetryItem[];
      tap_changers: TapChangerItem[];
    }) => {
      console.log('Initial data received:', response);

      // Update state with initial data
      setCircuitBreakers(response.circuit_breakers || []);
      setTeleSignals(response.telesignals || []);
      setTeleMetries(response.telemetries || []);
      setTapChangers(response.tap_changers || []);

      // Initialize combined order properly
      const initialCombinedOrder = [
        ...(response.circuit_breakers || []).map(item => ({ id: item.id, type: 'circuit_breaker' })),
        ...(response.tap_changers || []).map(item => ({ id: item.id, type: 'tap_changer' }))
      ];
      setCombinedOrder(initialCombinedOrder);
    });

    // Handle errors
    socket.on('get_initial_data_error', (error: unknown) => {
      console.error('Error fetching initial data:', error);
      alert('Failed to fetch initial data. Please check the console for details.');
    });

    // Cleanup listeners on unmount
    return () => {
      socket.off('get_initial_data_response');
      socket.off('get_initial_data_error');
    };
  }, []);

  useEffect(() => {
    socket.on('circuit_breakers', (data: CircuitBreakerItem[]) => {
      console.log('Received circuit breakers update:', data);
      setCircuitBreakers(data);
    });

    socket.on('telesignals', (data: TeleSignalItem[]) => {
      console.log('Received telesignals update:', data);
      setTeleSignals(data);
    });

    socket.on('telemetries', (data: TelemetryItem[]) => {
      console.log('Received telemetry update:', data);
      setTeleMetries(data);
    });

    socket.on('tap_changers', (data: TapChangerItem[]) => {
      console.log('Received tap changers update:', data);
      setTapChangers(data);
    });

    return () => {
      socket.off('circuit_breakers');
      socket.off('telesignals');
      socket.off('telemetries');
      socket.off('tap_changers');
    };
  }, []);

  const handleEditClick = () => {
    setIsEditing(!isEditing);
  };

  const handleDragNDropClick = () => {
    setIsDragging(!isDragging);
  }

  const openAddDialog = () => {
    setSelectedItemType(null);
    setSelectedItemToEdit(null);
    setAddDialogOpen(true);
  };

  // When closing the dialog, reset the edit state
  const closeDialog = () => {
    setAddDialogOpen(false);
    setSelectedItemType(null);
    setSelectedItemToEdit(null);
  };

  const handleEditItem = (id: string, type: 'circuit_breaker' | 'telesignal' | 'telemetry' | 'tap_changer') => {
    // Find the item to edit
    let itemToEdit;
    if (type === 'circuit_breaker') {
      itemToEdit = circuitBreakers.find(item => item.id === id);
    } else if (type === 'telesignal') {
      itemToEdit = teleSignals.find(item => item.id === id);
    } else if (type === 'telemetry') {
      itemToEdit = teleMetries.find(item => item.id === id);
    } else {
      itemToEdit = tapChangers.find(item => item.id === id);
    }

    if (itemToEdit) {
      // Set up the edit dialog with the item's data
      setSelectedItemType(type);
      setSelectedItemToEdit(itemToEdit);
      setAddDialogOpen(true);
    }
  };

  const handleDeleteItem = (id: string, type: 'circuit_breaker' | 'telesignal' | 'telemetry' | 'tap_changer') => {
    // Set up the delete dialog with the item's data
    setItemToDelete({ id, type });
    setDeleteDialogOpen(true);
  };

  const getItemToDeleteName = () => {
    if (!itemToDelete) return "";

    if (itemToDelete.type === 'circuit_breaker') {
      return circuitBreakers.find(item => item.id === itemToDelete.id)?.name || "";
    } else if (itemToDelete.type === 'telesignal') {
      return teleSignals.find(item => item.id === itemToDelete.id)?.name || "";
    } else if (itemToDelete.type === 'telemetry') {
      return teleMetries.find(item => item.id === itemToDelete.id)?.name || "";
    } else {
      return tapChangers.find(item => item.id === itemToDelete.id)?.name || "";
    }
  };

  // Add this new function to handle the actual deletion
  const confirmDelete = () => {
    if (itemToDelete) {
      if (itemToDelete.type === 'circuit_breaker') {
        socket.emit('remove_circuit_breaker', { id: itemToDelete.id });
      } else if (itemToDelete.type === 'telesignal') {
        socket.emit('remove_telesignal', { id: itemToDelete.id });
      } else if (itemToDelete.type === 'telemetry') {
        socket.emit('remove_telemetry', { id: itemToDelete.id });
      } else {
        socket.emit('remove_tap_changer', { id: itemToDelete.id });
      }
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  // Add this function to close the delete dialog without deleting
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const addComponent = (data: CircuitBreakerItem | TeleSignalItem | TelemetryItem | TapChangerItem) => {
    if ('ioa_cb_status' in data) {
      addCircuitBreaker(data as CircuitBreakerItem);
    } else if ('ioa' in data && !('unit' in data)) {
      addTeleSignal(data as TeleSignalItem);
    } else if ('ioa' in data && 'unit' in data) {
      addTelemetry(data as TelemetryItem);
    } else {
      addTapChanger(data as TapChangerItem);
    }
  };

  const updateComponent = (data: CircuitBreakerItem | TeleSignalItem | TelemetryItem | TapChangerItem) => {
    if ('ioa_cb_status' in data) {
      console.log("CB!");
      console.log(data);
      // Update circuit breaker - find the original item first
      const originalItem = circuitBreakers.find(item => item.id === data.id);
      if (originalItem) {
        // Merge the original item with the updated data
        const updatedItem = { ...originalItem, ...data };

        console.log(updatedItem);

        // Send the complete updated item to the server
        socket.emit('update_circuit_breaker', updatedItem);

        // Update the local state
        setCircuitBreakers(prev => prev.map(item =>
          item.id === data.id ? updatedItem : item
        ));
      }
    } else if ('ioa' in data && !('unit' in data)) {
      console.log("TELESIGNAL!");
      console.log(data);
      // Update telesignal - find the original item first
      const originalItem = teleSignals.find(item => item.id === data.id);
      if (originalItem) {
        // Merge the original item with the updated data
        const updatedItem = { ...originalItem, ...data };

        console.log(updatedItem);

        // Send the complete updated item to the server
        socket.emit('update_telesignal', updatedItem);

        // Update the local state
        setTeleSignals(prev => prev.map(item =>
          item.id === data.id ? updatedItem : item
        ));
      }
    } else if ('ioa' in data && 'unit' in data) {
      console.log("TELEMETRY!");
      console.log(data);
      // Update telemetry - find the original item first
      const originalItem = teleMetries.find(item => item.id === data.id);
      if (originalItem) {
        // Merge the original item with the updated data
        const updatedItem = { ...originalItem, ...data };

        console.log(updatedItem);

        // Send the complete updated item to the server
        socket.emit('update_telemetry', updatedItem);

        // Update the local state
        setTeleMetries(prev => prev.map(item =>
          item.id === data.id ? updatedItem : item
        ));
      } else {
        const originalItem = tapChangers.find(item => item.id === data.id);
        if (originalItem) {
          // Merge the original item with the updated data
          const updatedItem = { ...originalItem, ...data };

          console.log(updatedItem);

          // Send the complete updated item to the server
          socket.emit('update_tap_changer', updatedItem);

          // Update the local state
          setTapChangers(prev => prev.map(item =>
            item.id === data.id ? updatedItem : item
          ));
        }
      }
    }
  };

  const addCircuitBreaker = (data: CircuitBreakerItem) => {
    const newItem: CircuitBreakerItem = {
      id: Date.now().toString(),
      name: data.name,
      ioa_cb_status: data.ioa_cb_status,
      ioa_cb_status_close: data.ioa_cb_status_close,
      ioa_control_open: data.ioa_control_open,
      ioa_control_close: data.ioa_control_close,
      ioa_cb_status_dp: data.ioa_cb_status_dp,
      ioa_control_dp: data.ioa_control_dp,
      ioa_local_remote_sp: data.ioa_local_remote_sp,
      ioa_local_remote_dp: data.ioa_local_remote_dp,
      is_sbo: false,
      has_double_point: data.has_double_point || false,
      is_dp_mode: false,
      is_sdp_mode: false,
      has_local_remote_dp: data.has_local_remote_dp || false,
      is_local_remote_dp_mode: false,
      remote_sp: 1,
      remote_dp: 2,
      cb_status_open: 0,
      cb_status_close: 0,
      cb_status_dp: 0,
      control_open: 0,
      control_close: 0,
      control_dp: 0,
    };

    // Send to backend
    if (socket) {
      socket.emit('add_circuit_breaker', newItem, (response: unknown) => {
        console.log('Add circuit breaker response:', response);
      });
    }
  };

  const addTeleSignal = (data: TeleSignalItem) => {
    const newItem: TeleSignalItem = {
      id: Date.now().toString(),
      name: data.name,
      ioa: data.ioa,
      value: data.value,
      min_value: 0,
      max_value: 1,
      interval: data.interval,
      auto_mode: false, // default to manual mode
    };

    if (socket) {
      socket.emit('add_telesignal', newItem, (response: unknown) => {
        console.log('Add tele signal response:', response);
      });
    }
  };

  const addTelemetry = (data: TelemetryItem) => {
    const newItem: TelemetryItem = {
      id: Date.now().toString(),
      name: data.name,
      ioa: data.ioa,
      unit: data.unit || 'Unit',
      value: data.value,
      scale_factor: parseFloat(data.scale_factor?.toString() || "1"),
      min_value: data.min_value,
      max_value: data.max_value,
      interval: data.interval,
      auto_mode: false, // default to manual mode
    };

    if (socket) {
      socket.emit('add_telemetry', newItem, (response: unknown) => {
        console.log('Add telemetry response:', response);
      });
    }
  };

  const addTapChanger = (data: TapChangerItem) => {
    const newItem: TapChangerItem = {
      id: Date.now().toString(),
      name: data.name,
      ioa_value: data.ioa_value,
      value: data.value,
      value_high_limit: data.value_high_limit,
      value_low_limit: data.value_low_limit,
      ioa_high_limit: data.ioa_high_limit,
      ioa_low_limit: data.ioa_low_limit,
      interval: data.interval,
      auto_mode: false,
      ioa_status_auto_manual: data.ioa_status_auto_manual,
      ioa_command_auto_manual: data.ioa_command_auto_manual,
      ioa_command_raise_lower: data.ioa_command_raise_lower,
      ioa_status_raise_lower: data.ioa_status_raise_lower,
      is_local_remote: 1,
      ioa_local_remote: data.ioa_local_remote
    };

    if (socket) {
      socket.emit('add_tap_changer', newItem, (response: unknown) => {
        console.log('Add tap changer response:', response);
      });

      setTapChangers((prev) => [...prev, newItem]);
    }
  };

  const exportData = () => {
    socket.emit('export_data');

    socket.on('export_data_response', (data) => {
      console.log('Exported data:', data);

      // Validate the structure of the data
      if (!data.circuit_breakers || !data.telesignals || !data.telemetries || !data.tap_changers) {
        alert('Invalid data structure received from the server');
        return;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'exported_data.json';
      link.click();
    });

    socket.on('export_data_error', (error) => {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please check the console for details.');
    });
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        socket.emit('import_data', data);

        socket.on('import_data_response', (response) => {
          console.log('Import successful:', response);
          alert('Data imported successfully');
        });

        socket.on('import_data_error', (error) => {
          console.error('Error importing data:', error);
          alert('Failed to import data. Please check the console for details.');
        });
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  const handleDragEndCombined = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Get the current order or create it from existing items
    const currentOrder = combinedOrder.length > 0
      ? combinedOrder
      : [
        ...circuitBreakers.map(item => ({ id: item.id, type: 'circuit_breaker' })),
        ...tapChangers.map(item => ({ id: item.id, type: 'tap_changer' }))
      ];

    const activeIndex = currentOrder.findIndex(item => item.id === active.id);
    const overIndex = currentOrder.findIndex(item => item.id === over.id);

    if (activeIndex !== -1 && overIndex !== -1) {
      // Reorder the combined array
      const reorderedItems = arrayMove(currentOrder, activeIndex, overIndex);

      // Split back into separate arrays while maintaining original item data
      const newCircuitBreakers: CircuitBreakerItem[] = [];
      const newTapChangers: TapChangerItem[] = [];

      reorderedItems.forEach(orderItem => {
        if (orderItem.type === 'circuit_breaker') {
          const originalItem = circuitBreakers.find(cb => cb.id === orderItem.id);
          if (originalItem) {
            newCircuitBreakers.push(originalItem);
          }
        } else if (orderItem.type === 'tap_changer') {
          const originalItem = tapChangers.find(tc => tc.id === orderItem.id);
          if (originalItem) {
            newTapChangers.push(originalItem);
          }
        }
      });

      // Update all states in the correct order
      setCombinedOrder(reorderedItems);
      setCircuitBreakers(newCircuitBreakers);
      setTapChangers(newTapChangers);

      // Emit the new combined order to backend
      socket.emit('update_order', {
        type: 'combined',
        items: reorderedItems
      });
    }
  };

  const handleDragEndTeleSignals = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTeleSignals((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Emit the new order to backend if needed
        socket.emit('update_order', {
          type: 'telesignals',
          items: newItems.map(item => item.id)
        });

        return newItems;
      });
    }
  };

  const handleDragEndTeleMetries = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTeleMetries((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Emit the new order to backend if needed
        socket.emit('update_order', {
          type: 'telemetries',
          items: newItems.map(item => item.id)
        });

        return newItems;
      });
    }
  };

  return (
    <div className="min-w-screen fixed">
      <div className="flex justify-between items-center py-3 px-4 border-b">
        <div className="flex items-center space-x-2">
          <img src="/modbus-logo.ico" alt="Modbus Icon" className="w-6 h-6" />
          <p className="text-2xl font-bold">Modbus RTU Simulator</p>
        </div>
        <div className="flex space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="px-2 py-1 rounded border border-black hover:bg-gray-300 bg-white text-black"
                  onClick={openAddDialog}
                  disabled={isDragging || isEditing}
                >
                  <MdAdd />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add New Item</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={`px-2 py-1 rounded border border-black hover:bg-gray-300 bg-white text-black ${isEditing ? 'bg-blue-400' : ''}`}
                  onClick={handleEditClick}
                  disabled={isDragging}
                >
                  {isEditing ? <MdOutlineCheck /> : <MdOutlineModeEditOutline />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isEditing ? 'Done' : 'Edit Mode'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={`px-2 py-1 rounded border border-black hover:bg-gray-300 bg-white text-black ${isDragging ? 'bg-blue-400' : ''}`}
                  onClick={handleDragNDropClick}
                  disabled={isEditing}
                >
                  {isDragging ? <MdOutlineCheck /> : <TbDragDrop />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isDragging ? 'Done' : 'Drag and Drop Mode'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="px-2 py-1 rounded border border-black hover:bg-gray-300 bg-white text-black"
                  onClick={exportData}
                  disabled={isEditing || isDragging}
                >
                  <PiExportBold />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export Data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="px-2 py-1 rounded border border-black hover:bg-gray-300 bg-white text-black"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (event) => {
                      const file = (event.target as HTMLInputElement).files?.[0];
                      if (file) {
                        importData(file);
                      }
                    };
                    input.click();
                  }}
                  disabled={isEditing || isDragging}
                >
                  <CgImport />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Import Data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

        </div>
      </div>

      <div className="flex flex-row w-full">

        {/* Circuit Breaker and Tap Changer Section */}
        <div className="w-1/3 border-2 flex flex-col h-[95vh]">
          <div className="flex flex-row border-b-2 justify-center">
            <h2 className="text-xl font-semibold m-2">Circuit Breakers & Tap Changers</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndCombined}
            >
              <SortableContext
                items={combinedOrder.length > 0 ? combinedOrder.map(item => item.id) : [...circuitBreakers.map(item => item.id), ...tapChangers.map(item => item.id)]}
                strategy={verticalListSortingStrategy}
              >
                {(combinedOrder.length > 0 ? combinedOrder : [
                  ...circuitBreakers.map(item => ({ id: item.id, type: 'circuit_breaker' })),
                  ...tapChangers.map(item => ({ id: item.id, type: 'tap_changer' }))
                ]).map(orderItem => {
                  if (orderItem.type === 'circuit_breaker') {
                    const item = circuitBreakers.find(cb => cb.id === orderItem.id);
                    return item ? (
                      <SortableItem
                        key={item.id}
                        id={item.id}
                        isDraggingEnabled={isDragging}
                      >
                        <CircuitBreaker
                          key={item.id}
                          {...item}
                          isEditing={isEditing}
                          onEdit={(id) => handleEditItem(id, 'circuit_breaker')}
                          onDelete={(id) => handleDeleteItem(id, 'circuit_breaker')}
                        />
                      </SortableItem>
                    ) : null;
                  } else if (orderItem.type === 'tap_changer') {
                    const item = tapChangers.find(tc => tc.id === orderItem.id);
                    return item ? (
                      <SortableItem
                        key={item.id}
                        id={item.id}
                        isDraggingEnabled={isDragging}
                      >
                        <TapChanger
                          key={item.id}
                          {...item}
                          isEditing={isEditing}
                          onEdit={(id) => handleEditItem(id, 'tap_changer')}
                          onDelete={(id) => handleDeleteItem(id, 'tap_changer')}
                        />
                      </SortableItem>
                    ) : null;
                  }
                  return null;
                })}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Telesignal Section */}
        <div className="w-1/3 border-2 flex flex-col h-[95vh]">
          <div className="flex flex-row border-b-2 justify-center">
            <h2 className="text-xl font-semibold m-2">Telesignals</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndTeleSignals}
            >
              <SortableContext
                items={teleSignals.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {teleSignals.map(item => (
                  <SortableItem
                    key={item.id}
                    id={item.id}
                    isDraggingEnabled={isDragging}
                  >
                    <TeleSignal
                      key={item.id}
                      {...item}
                      isEditing={isEditing}
                      onEdit={(id) => handleEditItem(id, 'telesignal')}
                      onDelete={(id) => handleDeleteItem(id, 'telesignal')}
                    />
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Telemetry Section */}
        <div className="w-1/3 border-2 flex flex-col h-[95vh]">
          <div className="flex flex-row border-b-2 justify-center">
            <h2 className="text-xl font-semibold m-2">Telemetries</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEndTeleMetries}
            >
              <SortableContext
                items={teleMetries.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {teleMetries.map(item => (
                  <SortableItem
                    key={item.id}
                    id={item.id}
                    isDraggingEnabled={isDragging}
                  >
                    <Telemetry
                      key={item.id}
                      {...item}
                      isEditing={isEditing}
                      onEdit={(id) => handleEditItem(id, 'telemetry')}
                      onDelete={(id) => handleDeleteItem(id, 'telemetry')}
                    />
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </div>

      <ManageItemDialog
        isOpen={addDialogOpen}
        onClose={closeDialog}
        title={selectedItemToEdit ? `Edit ${selectedItemType}` : `Add New Component`}
        action={selectedItemToEdit ? "edit" : "add"}
        items={selectedItemType === 'circuit_breaker' ? circuitBreakers :
          selectedItemType === 'telesignal' ? teleSignals :
            selectedItemType === 'telemetry' ? teleMetries :
              selectedItemType === 'tap_changer' ? tapChangers : []}
        itemToEdit={selectedItemToEdit}
        onSubmit={selectedItemToEdit ? updateComponent : addComponent}
      />

      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        itemName={getItemToDeleteName()}
      />
    </div>
  );
}

export default App;