from pydantic import BaseModel
from typing import Optional, Any


class ApiResponse(BaseModel):
    success: bool = True
    data: Optional[Any] = None
    error: Optional[str] = None


class ModuleMetadata(BaseModel):
    id: str
    name: str
    icon: str = "box"
    description: str = ""
    order: int = 99
