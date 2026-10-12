'use client'

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createWebcamService, WebcamService } from '@/lib/webcam-service'
import { Camera, CameraOff, CameraIcon } from 'lucide-react'

interface WebcamViewerProps {
  onCapture?: (imageData: string) => void
  onServiceReady?: (service: WebcamService & { startAutoCapture: (intervalMs: number) => void; stopAutoCapture: () => void }) => void
  className?: string
  showControls?: boolean
}

export interface WebcamViewerRef {
  startCamera: () => Promise<void>
  stopCamera: () => void
  captureFrame: () => void
}

export const WebcamViewer = forwardRef<WebcamViewerRef, WebcamViewerProps>(({ onCapture, onServiceReady, className, showControls = true }, ref) => {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const webcamService = useRef<WebcamService | null>(null)
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const serviceReadyRef = useRef(false)

  const startAutoCapture = useCallback((intervalMs: number) => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current)
    }

    captureIntervalRef.current = setInterval(() => {
      handleCapture()
    }, intervalMs)
  }, [])

  const stopAutoCapture = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current)
      captureIntervalRef.current = null
    }
  }, [])

  useImperativeHandle(ref, () => ({
    startCamera: handleStartCamera,
    stopCamera: handleStopCamera,
    captureFrame: handleCapture
  }))

  const handleCapture = useCallback(() => {
    if (!webcamService.current) return

    const canvas = webcamService.current.captureFrame()
    if (canvas) {
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      onCapture?.(imageData)
    } else {
      console.warn('Failed to capture frame - canvas is null')
    }
  }, [onCapture])

  useEffect(() => {
    // Initialize webcam service
    webcamService.current = createWebcamService()

    // Notify parent component that service is ready with auto-capture methods
    if (webcamService.current && onServiceReady && !serviceReadyRef.current) {
      const enhancedService = {
        ...webcamService.current,
        startAutoCapture,
        stopAutoCapture
      }
      onServiceReady(enhancedService)
      serviceReadyRef.current = true
    }

    return () => {
      // Cleanup on unmount
      if (webcamService.current) {
        try {
          webcamService.current.stopCamera()
        } catch (err) {
          console.error('Error stopping camera on cleanup:', err)
        }
      }
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current)
      }
    }
  }, [startAutoCapture, stopAutoCapture, onServiceReady])

  // Auto-restart camera on page refresh if it was previously streaming
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Store camera state in sessionStorage
      sessionStorage.setItem('cameraWasStreaming', isStreaming.toString())
    }

    const handleLoad = () => {
      // Check if camera was streaming before refresh
      const wasStreaming = sessionStorage.getItem('cameraWasStreaming') === 'true'
      if (wasStreaming && !isStreaming && webcamService.current) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          handleStartCamera()
        }, 500) // Increased delay for better reliability
      }
    }

    // Check immediately on mount as well
    const wasStreaming = sessionStorage.getItem('cameraWasStreaming') === 'true'
    if (wasStreaming && !isStreaming && webcamService.current) {
      setTimeout(() => {
        handleStartCamera()
      }, 200)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('load', handleLoad)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('load', handleLoad)
    }
  }, [isStreaming])

  const handleStartCamera = async () => {
    if (!webcamService.current) return
    
    try {
      setError(null)
      const stream = await webcamService.current.startCamera()
      if (stream && videoRef.current) {
        // Set the stream directly to our video element
        videoRef.current.srcObject = stream
        setIsStreaming(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start camera')
    }
  }

  const handleStopCamera = () => {
    if (webcamService.current) {
      try {
        webcamService.current.stopCamera()
      } catch (err) {
        console.error('Error stopping camera:', err)
      }
    }
    setIsStreaming(false)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current)
      captureIntervalRef.current = null
    }
  }

  if (!webcamService.current || !webcamService.current.isSupported()) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>
              Your browser does not support webcam access. Please use a modern browser like Chrome, Firefox, or Edge.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${className} h-full flex flex-col`}>
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Webcam Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow flex flex-col">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex-grow relative aspect-square overflow-hidden rounded-xl border border-dashed border-baize-600 bg-baize-950">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ display: isStreaming ? 'block' : 'none' }}
          />

          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center text-baize-400">
              <div className="text-center">
                <Camera className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg">Camera is off</p>
              </div>
            </div>
          )}
        </div>

        {showControls && (
          <div className="flex gap-2 justify-center flex-shrink-0">
            {!isStreaming ? (
              <Button onClick={handleStartCamera} className="flex items-center gap-2 px-6 py-3">
                <Camera className="h-5 w-5" />
                Start Camera
              </Button>
            ) : (
              <>
                <Button onClick={handleCapture} variant="outline" className="flex items-center gap-2 px-6 py-3">
                  <CameraIcon className="h-5 w-5" />
                  Capture Frame
                </Button>
                <Button onClick={handleStopCamera} variant="destructive" className="flex items-center gap-2 px-6 py-3">
                  <CameraOff className="h-5 w-5" />
                  Stop Camera
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
})

WebcamViewer.displayName = 'WebcamViewer'