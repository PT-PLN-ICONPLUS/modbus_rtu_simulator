from pydantic import BaseModel
from typing import Optional

class CircuitBreakerItem(BaseModel):
    id: str
    name: str
    ioa_cb_status: int           # CB Status Single (Discrete Input)
    ioa_cb_status_dp: Optional[int] = None  # CB Status Double (Input Register)
    ioa_control_open: int        # Control Open (Coil)
    ioa_control_close: int       # Control Close (Coil)  
    ioa_local_remote: int        # Local/Remote Position (Coil)
    is_sbo: bool
    is_double_point: bool
    remote: int = 0
    value: int = 0
    min_value: int = 0
    max_value: int = 3
    interval: int = 5
    
class TeleSignalItem(BaseModel):
    id: str
    name: str
    ioa: int
    value: int = 0
    min_value: int = 0
    max_value: int = 1
    interval: int = 10
    auto_mode: bool = True

class TelemetryItem(BaseModel):
    id: str
    name: str
    ioa: int
    unit: str
    value: float
    scale_factor: float
    min_value: float
    max_value: float
    interval: int = 2
    auto_mode: bool = True    


    # Export all classes
    __all__ = [
      'CircuitBreakerItem',
      'TeleSignalItem',
      'TelemetryItem'
    ]