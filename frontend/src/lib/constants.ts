export const VIOLATION_TYPES = {
  no_face_detected: 'No Face Detected',
  multiple_faces: 'Multiple Faces Detected',
  phone_detected: 'Phone Detected',
  tab_switch: 'Tab Switch',
  window_blur: 'Window Blur',
  looking_away_excessive: 'Excessive Looking Away'
} as const

export const SEVERITY_COLORS = {
  low: 'text-yellow-500 bg-yellow-50',
  medium: 'text-orange-500 bg-orange-50',
  high: 'text-red-500 bg-red-50'
} as const

export const STATUS_COLORS = {
  in_progress: 'text-blue-500 bg-blue-50',
  completed: 'text-green-500 bg-green-50',
  flagged: 'text-red-500 bg-red-50',
  reviewed: 'text-gray-500 bg-gray-50'
} as const

export const MONITORING_INTERVAL = 5000 // 5 seconds
export const FRAME_SEND_INTERVAL = 1000 // 1 second
export const MAX_LOOKING_AWAY_SECONDS = 15
export const FACE_DETECTION_THRESHOLD = 10 // seconds
