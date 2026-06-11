import cv2
import numpy as np
from typing import List, Tuple, Optional


class FaceDetector:
    def __init__(self, config: Optional[dict] = None):
        self.config = config or {}
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        self.min_face_size = self.config.get('min_face_size', 30)
        self.scale_factor = self.config.get('scale_factor', 1.1)
        self.min_neighbors = self.config.get('min_neighbors', 5)

    def detect(self, frame: np.ndarray) -> Tuple[int, List[Tuple[int, int, int, int]]]:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=self.scale_factor,
            minNeighbors=self.min_neighbors,
            minSize=(self.min_face_size, self.min_face_size)
        )
        return len(faces), faces.tolist() if len(faces) > 0 else []

    def get_face_regions(self, frame: np.ndarray, faces: List) -> List[np.ndarray]:
        face_regions = []
        for (x, y, w, h) in faces:
            face_roi = frame[y:y+h, x:x+w]
            face_regions.append(face_roi)
        return face_regions


class ObjectDetector:
    def __init__(self, config: Optional[dict] = None):
        self.config = config or {}
        self.class_ids_to_detect = [67]  # Cell phone in COCO dataset
        self.confidence_threshold = self.config.get('confidence_threshold', 0.5)
        self._initialize_net()

    def _initialize_net(self):
        try:
            self.net = cv2.dnn.readNetFromDarknet(
                'config/yolov3.cfg',
                'models/yolov3.weights'
            )
            self.ln = self.net.getLayerNames()
            self.out_layers = [self.ln[i[0] - 1] for i in self.net.getUnconnectedOutLayers()]
            self.initialized = True
        except:
            self.initialized = False

    def detect(self, frame: np.ndarray) -> Tuple[bool, List[dict]]:
        if not self.initialized:
            return False, []

        blob = cv2.dnn.blobFromImage(frame, 1/255.0, (416, 416), swapRB=True, crop=False)
        self.net.setInput(blob)

        outputs = self.net.forward(self.out_layers)

        detections = []
        phone_detected = False

        for output in outputs:
            for detection in output:
                scores = detection[5:]
                class_id = np.argmax(scores)
                confidence = scores[class_id]

                if confidence > self.confidence_threshold and class_id in self.class_ids_to_detect:
                    phone_detected = True
                    center_x = int(detection[0] * frame.shape[1])
                    center_y = int(detection[1] * frame.shape[0])
                    w = int(detection[2] * frame.shape[1])
                    h = int(detection[3] * frame.shape[0])
                    detections.append({
                        'class': 'phone',
                        'confidence': float(confidence),
                        'bbox': [center_x - w//2, center_y - h//2, w, h]
                    })

        return phone_detected, detections


class BehaviorAnalyzer:
    def __init__(self, config: Optional[dict] = None):
        self.config = config or {}
        self.looking_away_threshold = self.config.get('looking_away_threshold', 15)
        self.face_history = []
        self.max_history = 30

    def analyze(self, faces: List, frame_shape: Tuple[int, int]) -> bool:
        if not faces or len(faces) == 0:
            self.face_history.append(False)
        else:
            (x, y, w, h) = faces[0]
            face_center_x = x + w // 2
            face_center_y = y + h // 2
            frame_center_x = frame_shape[1] // 2
            frame_center_y = frame_shape[0] // 2

            offset_x = abs(face_center_x - frame_center_x) / frame_shape[1]
            offset_y = abs(face_center_y - frame_center_y) / frame_shape[0]

            looking_away = offset_x > 0.3 or offset_y > 0.3
            self.face_history.append(looking_away)

        if len(self.face_history) > self.max_history:
            self.face_history.pop(0)

        recent_looking_away = sum(1 for x in self.face_history[-self.looking_away_threshold:] if x)
        return recent_looking_away >= self.looking_away_threshold

    def reset(self):
        self.face_history = []
