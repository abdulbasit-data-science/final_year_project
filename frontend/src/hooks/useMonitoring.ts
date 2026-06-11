'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { ViolationType } from '@/lib/types'
import { MONITORING_INTERVAL, FRAME_SEND_INTERVAL, MAX_LOOKING_AWAY_SECONDS } from '@/lib/constants'

interface MonitoringState {
  isMonitoring: boolean
  isWebcamActive: boolean
  violations: ViolationType[]
  lastViolation: ViolationType | null
  lookingAwayTime: number
  tabSwitchCount: number
}

interface UseMonitoringReturn extends MonitoringState {
  startMonitoring: () => Promise<void>
  stopMonitoring: () => void
  sendViolation: (type: ViolationType, attemptId: string) => Promise<void>
}

export function useMonitoring(attemptId: string): UseMonitoringReturn {
  const [state, setState] = useState<MonitoringState>({
    isMonitoring: false,
    isWebcamActive: false,
    violations: [],
    lastViolation: null,
    lookingAwayTime: 0,
    tabSwitchCount: 0
  })

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lookingAwayIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFrameTimeRef = useRef<number>(0)

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setState(prev => ({ ...prev, isWebcamActive: true }))
      return true
    } catch (err) {
      console.error('Webcam access denied:', err)
      return false
    }
  }, [])

  const sendViolation = useCallback(async (type: ViolationType, attemptId: string) => {
    const severity = type === 'multiple_faces' || type === 'phone_detected' || type === 'no_face_detected'
      ? 'high'
      : type === 'window_blur'
      ? 'medium'
      : 'low'

    try {
      const response = await fetch('http://localhost:8000/api/violations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attempt_id: attemptId,
          violation_type: type,
          severity,
          description: `Detected ${type} violation`,
          frame_snapshot_url: null
        })
      })

      if (response.ok) {
        setState(prev => ({
          ...prev,
          violations: [...prev.violations, type],
          lastViolation: type
        }))
      }
    } catch (err) {
      console.error('Failed to log violation to backend:', err)
    }
  }, [])

  const heartbeat = useCallback(async () => {
    const supabase = createClient()
    await supabase.from('exam_sessions').upsert({
      attempt_id: attemptId,
      is_active: true,
      session_start: new Date().toISOString()
    }, {
      onConflict: 'attempt_id'
    })
  }, [attemptId])

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return null

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    return canvas.toDataURL('image/jpeg', 0.5)
  }, [])

  const startMonitoring = useCallback(async () => {
    const webcamStarted = await startWebcam()
    if (!webcamStarted) return

    setState(prev => ({ ...prev, isMonitoring: true }))

    heartbeatIntervalRef.current = setInterval(heartbeat, MONITORING_INTERVAL)

    frameIntervalRef.current = setInterval(async () => {
      const now = Date.now()
      if (now - lastFrameTimeRef.current >= FRAME_SEND_INTERVAL) {
        const frame = captureFrame()
        if (frame) {
          lastFrameTimeRef.current = now
          try {
            const response = await fetch('http://localhost:8000/api/monitoring/analyze', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                frame_data: frame,
                attempt_id: attemptId
              }),
            })
            
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.violations && data.violations.length > 0) {
                for (const violation of data.violations) {
                  await sendViolation(violation.type as ViolationType, attemptId)
                }
              }
            }
          } catch (err) {
            console.error('Error analyzing frame:', err)
          }
        }
      }
    }, 500)

    lookingAwayIntervalRef.current = setInterval(() => {
      setState(prev => {
        const newLookingAwayTime = prev.lookingAwayTime + 1
        if (newLookingAwayTime >= MAX_LOOKING_AWAY_SECONDS) {
          sendViolation('looking_away_excessive', attemptId)
          return { ...prev, lookingAwayTime: 0 }
        }
        return { ...prev, lookingAwayTime: newLookingAwayTime }
      })
    }, 1000)
  }, [startWebcam, heartbeat, captureFrame, sendViolation, attemptId])

  const stopMonitoring = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }

    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }

    if (lookingAwayIntervalRef.current) {
      clearInterval(lookingAwayIntervalRef.current)
      lookingAwayIntervalRef.current = null
    }

    setState(prev => ({
      ...prev,
      isMonitoring: false,
      isWebcamActive: false,
      lookingAwayTime: 0
    }))
  }, [])

  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [stopMonitoring])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && state.isMonitoring) {
        sendViolation('tab_switch', attemptId)
        setState(prev => ({ ...prev, tabSwitchCount: prev.tabSwitchCount + 1 }))
      }
    }

    const handleBlur = () => {
      if (state.isMonitoring) {
        sendViolation('window_blur', attemptId)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
    }
  }, [state.isMonitoring, sendViolation, attemptId])

  return {
    ...state,
    startMonitoring,
    stopMonitoring,
    sendViolation
  }
}
