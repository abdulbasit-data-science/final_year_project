from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class ViolationType(str, Enum):
    NO_FACE_DETECTED = "no_face_detected"
    MULTIPLE_FACES = "multiple_faces"
    PHONE_DETECTED = "phone_detected"
    LOOKING_AWAY_EXCESSIVE = "looking_away_excessive"


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class DetectionResult(BaseModel):
    face_count: int
    faces_detected: bool
    phone_detected: bool
    looking_away: bool
    violations: List[dict]
    confidence: float


class FrameAnalysisRequest(BaseModel):
    frame_data: str  # Base64 encoded frame
    attempt_id: str
    timestamp: Optional[float] = None


class FrameAnalysisResponse(BaseModel):
    success: bool
    violations: List[dict]
    processed: bool
