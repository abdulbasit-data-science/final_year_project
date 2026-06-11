from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID
from enum import Enum


class ViolationType(str, Enum):
    NO_FACE_DETECTED = "no_face_detected"
    MULTIPLE_FACES = "multiple_faces"
    PHONE_DETECTED = "phone_detected"
    TAB_SWITCH = "tab_switch"
    WINDOW_BLUR = "window_blur"
    LOOKING_AWAY_EXCESSIVE = "looking_away_excessive"


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ViolationCreate(BaseModel):
    attempt_id: UUID
    violation_type: ViolationType
    severity: Severity = Severity.MEDIUM
    description: Optional[str] = None
    frame_snapshot_url: Optional[str] = None


class ViolationResponse(BaseModel):
    id: UUID
    attempt_id: UUID
    violation_type: ViolationType
    severity: Severity
    description: Optional[str] = None
    frame_snapshot_url: Optional[str] = None
    detected_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
