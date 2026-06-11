import base64
import io
import numpy as np
import cv2
from typing import List, Optional
from datetime import datetime

from app.services.detectors import FaceDetector, ObjectDetector, BehaviorAnalyzer
from app.schemas.monitoring import ViolationType, Severity


class FrameProcessor:
    def __init__(self, config: Optional[dict] = None):
        self.config = config or {}
        self.face_detector = FaceDetector({
            'min_face_size': 30,
            'scale_factor': 1.1,
            'min_neighbors': 5
        })
        self.object_detector = ObjectDetector({
            'confidence_threshold': 0.5
        })
        self.behavior_analyzer = BehaviorAnalyzer({
            'looking_away_threshold': 15
        })
        self.no_face_start_time: Optional[float] = None
        self.no_face_threshold = 10

    def process_frame(self, frame_data: str, attempt_id: str) -> dict:
        frame = self._decode_frame(frame_data)
        if frame is None:
            return {
                'success': False,
                'violations': [],
                'processed': False
            }

        violations = []
        frame_height, frame_width = frame.shape[:2]

        face_count, faces = self.face_detector.detect(frame)
        phone_detected, phone_detections = self.object_detector.detect(frame)
        looking_away = self.behavior_analyzer.analyze(faces, (frame_height, frame_width))

        current_time = datetime.now().timestamp()

        if face_count == 0:
            if self.no_face_start_time is None:
                self.no_face_start_time = current_time
            elif current_time - self.no_face_start_time >= self.no_face_threshold:
                violations.append({
                    'type': ViolationType.NO_FACE_DETECTED.value,
                    'severity': Severity.HIGH.value,
                    'description': 'No face detected for more than 10 seconds',
                    'timestamp': current_time,
                    'attempt_id': attempt_id
                })
                self.no_face_start_time = None
        else:
            self.no_face_start_time = None

        if face_count > 1:
            violations.append({
                'type': ViolationType.MULTIPLE_FACES.value,
                'severity': Severity.HIGH.value,
                'description': f'Multiple faces detected: {face_count}',
                'timestamp': current_time,
                'attempt_id': attempt_id
            })

        if phone_detected:
            violations.append({
                'type': ViolationType.PHONE_DETECTED.value,
                'severity': Severity.HIGH.value,
                'description': 'Mobile phone detected in frame',
                'timestamp': current_time,
                'attempt_id': attempt_id,
                'confidence': phone_detections[0]['confidence'] if phone_detections else 0.5
            })

        if looking_away:
            violations.append({
                'type': ViolationType.LOOKING_AWAY_EXCESSIVE.value,
                'severity': Severity.LOW.value,
                'description': 'Excessive looking away from screen',
                'timestamp': current_time,
                'attempt_id': attempt_id
            })

        return {
            'success': True,
            'violations': violations,
            'processed': True,
            'stats': {
                'face_count': face_count,
                'phone_detected': phone_detected,
                'looking_away': looking_away
            }
        }

    def _decode_frame(self, frame_data: str) -> Optional[np.ndarray]:
        try:
            if ',' in frame_data:
                frame_data = frame_data.split(',')[1]

            image_data = base64.b64decode(frame_data)
            nparr = np.frombuffer(image_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return frame
        except Exception as e:
            print(f"Error decoding frame: {e}")
            return None

    def reset(self):
        self.no_face_start_time = None
        self.behavior_analyzer.reset()
