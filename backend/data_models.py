from pydantic import BaseModel
from typing import Optional

class CircuitBreakerItem(BaseModel):
    id: str
    name: str
    ioa_data: int
    ioa_data_dp: Optional[int] = None
    ioa_command: int
    ioa_command_dp: Optional[int] = None
    is_sbo: bool
    is_double_point: bool
    remote: bool = False
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