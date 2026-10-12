'use client'

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { WebcamViewer } from './webcam-viewer'
import { createWebcamService, WebcamService } from '@/lib/webcam-service'
import { createDartDetectionServicePC, DartDetection } from '@/lib/dart-detection-pc'
import { createEnhancedDartDetection, EnhancedDetectionResult } from '@/lib/enhanced-dart-detection'
import { useLightweight } from '@/context/lightweight'
import { useDetectionMode, DetectionMode } from '@/lib/detection-config'
import { Scan, Zap, Target, Clock, Camera, Settings, Play, RotateCcw } from 'lucide-react'
import { simulateDartDetection, getPlayerSkillLevel, getTargetZoneForScore, SimulationConfig } from '@/lib/dart-simulation'

export interface DartScannerPCRef {
  clearDartboard: () => void
}

interface DartScannerPCProps {
  onDetection?: (detections: DartDetection[]) => void
  currentPlayer?: string
  currentPlayerScore?: number | null
  className?: string
}

export const DartScannerPC = forwardRef<DartScannerPCRef, DartScannerPCProps>(({ onDetection, currentPlayer, currentPlayerScore, className }, ref) => {
  const [isScanning, setIsScanning] = useState(false)
  const [detections, setDetections] = useState<DartDetection[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastScanTime, setLastScanTime] = useState<number | null>(null)
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'starting' | 'ready' | 'error'>('idle')
  const [detectionStats, setDetectionStats] = useState({ totalScans: 0, successfulScans: 0, avgProcessingTime: 0 })
  const [dartsThrownThisTurn, setDartsThrownThisTurn] = useState(0)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const detectionServiceRef = useRef<any>(null)
  const enhancedDetectionRef = useRef<any>(null)
  const webcamServiceRef = useRef<WebcamService | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const webcamViewerRef = useRef<any>(null)
  
  const { config } = useLightweight()
  const { mode, setMode, isCVEnabled, isMLEnabled } = useDetectionMode()

  useImperativeHandle(ref, () => ({
    clearDartboard: () => {
      setDetections([])
      setDartsThrownThisTurn(0)
      setLastScanTime(null)
      console.log('Dartboard cleared via ref')
    }
  }))

  useEffect(() => {
    // Initialize detection services
    detectionServiceRef.current = createDartDetectionServicePC(null) // Will be updated when webcam service is ready
    enhancedDetectionRef.current = createEnhancedDartDetection()

    return () => {
      // Clear scanning interval
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
      }
    }
  }, [])

  // Persist camera state across refreshes
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem('cameraStatus', cameraStatus)
      sessionStorage.setItem('isScanning', isScanning.toString())
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [cameraStatus, isScanning])

  const handleServiceReady = (service: WebcamService & { startAutoCapture: (intervalMs: number) => void; stopAutoCapture: () => void }) => {
    webcamServiceRef.current = service as any

    // Update detection service with webcam service
    if (detectionServiceRef.current) {
      detectionServiceRef.current.webcamService = service
    }

    setCameraStatus('ready')
    console.log('Camera service ready for dart detection')

    // Auto-restart scanning if it was active before refresh
    const wasScanning = sessionStorage.getItem('isScanning') === 'true'
    if (wasScanning) {
      setTimeout(() => {
        handleStartScanning()
      }, 1000) // Delay to ensure camera is fully ready
    }
  }

  const handleStartCamera = async () => {
    if (webcamViewerRef.current) {
      await webcamViewerRef.current.startCamera()
    }
  }

  const handleCapture = async (imageData: string) => {
    if (!enhancedDetectionRef.current || isProcessing) return

    setIsProcessing(true)
    setError(null)
    setDetectionStats(prev => ({ ...prev, totalScans: prev.totalScans + 1 }))

    try {
      // Create image element from captured data
      const img = new Image()
      img.onload = async () => {
        try {
          // Use enhanced detection for better results
          const result: EnhancedDetectionResult = await enhancedDetectionRef.current.detectFromCanvas(img)

          if (result.success && result.darts.length > 0) {
            setDetections(result.darts)
            setLastScanTime(Date.now())
            onDetection?.(result.darts)

            // Update successful scan stats
            setDetectionStats(prev => ({
              ...prev,
              successfulScans: prev.successfulScans + 1,
              avgProcessingTime: Math.round((prev.avgProcessingTime * (prev.totalScans - 1) + result.processingTime) / prev.totalScans)
            }))

            console.log(`Detection successful: ${result.darts.length} darts found in ${result.processingTime.toFixed(2)}ms`)
          } else {
            console.log('No darts detected in frame')
            // Don't clear detections here to prevent feed interruption
            // setDetections([])
          }

          // Draw detections on canvas if available
          if (canvasRef.current && result.darts.length > 0) {
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            if (ctx) {
              // Scale canvas based on lightweight config
              const scale = config.canvasScale
              canvas.width = img.width * scale
              canvas.height = img.height * scale
              ctx.scale(scale, scale)
              ctx.drawImage(img, 0, 0)

              // Draw detection results
              ctx.strokeStyle = '#00ff00'
              ctx.lineWidth = 2
              result.darts.forEach((detection) => {
                if (detection.bbox) {
                  const [x, y, w, h] = detection.bbox
                  ctx.strokeRect(x, y, w, h)

                  // Draw confidence score
                  ctx.fillStyle = '#00ff00'
                  ctx.font = '12px Arial'
                  ctx.fillText(`${(detection.confidence * 100).toFixed(0)}%`, x, y - 5)
                }
              })
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Detection failed'
          setError(errorMessage)
          console.error('Detection error:', err)
        } finally {
          setIsProcessing(false)
        }
      }
      img.onerror = () => {
        setError('Failed to load captured image')
        setIsProcessing(false)
      }
      img.src = imageData
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Processing failed'
      setError(errorMessage)
      setIsProcessing(false)
    }
  }

  const handleStartScanning = () => {
    if (!webcamServiceRef.current || cameraStatus !== 'ready') {
      setError('Camera not ready. Please start the camera first and ensure it has permission.')
      return
    }

    setIsScanning(true)
    // Don't clear detections on start scanning to prevent feed interruption
    // setDetections([])
    setLastScanTime(null)

    // Clear any existing interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
    }

    try {
      // Start auto-capture with proper error handling
      if (webcamServiceRef.current.startAutoCapture) {
        webcamServiceRef.current.startAutoCapture(config.frameIntervalMs)
        console.log(`Started auto-capture with ${config.frameIntervalMs}ms interval`)
      } else {
        throw new Error('Auto-capture method not available')
      }
    } catch (err) {
      console.error('Failed to start auto-capture:', err)
      setError('Failed to start auto-capture. Please try restarting the camera.')
      setIsScanning(false)
    }
  }

  const handleStopScanning = () => {
    setIsScanning(false)

    // Stop auto capture with proper error handling
    if (webcamServiceRef.current && webcamServiceRef.current.stopAutoCapture) {
      try {
        webcamServiceRef.current.stopAutoCapture()
        console.log('Auto-capture stopped successfully')
      } catch (err) {
        console.error('Error stopping auto-capture:', err)
      }
    }
  }

  const scanDartThrow = async (detectionMode: 'cv' | 'ml') => {
    console.log(`scanDartThrow called with mode: ${detectionMode}, currentPlayerScore: ${currentPlayerScore}`)
    if (isProcessing) return

    setIsProcessing(true)
    setError(null)
    setDetectionStats(prev => ({ ...prev, totalScans: prev.totalScans + 1 }))

    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500))

      // Determine simulation config based on game state
      const skillLevel = currentPlayerScore ?
        getPlayerSkillLevel(currentPlayerScore, 501) : 'intermediate'

      const targetZone = currentPlayerScore ?
        getTargetZoneForScore(currentPlayerScore) : 'random'

      const simulationConfig: SimulationConfig = {
        skillLevel,
        targetZone,
        dartsPerTurn: 3 - dartsThrownThisTurn
      }

      console.log('Simulation config:', simulationConfig)

      // Generate simulated detections
      const simulatedDarts = simulateDartDetection(simulationConfig)

      console.log(`Generated ${simulatedDarts.length} simulated darts`)

      // Update state - don't clear previous detections to maintain continuous feed
      const convertedDarts: DartDetection[] = simulatedDarts.map(dart => ({
        x: dart.x,
        y: dart.y,
        score: dart.score,
        multiplier: dart.multiplier,
        className: dart.segment,
        confidence: dart.confidence
      }))

      setDetections(prev => [...prev, ...convertedDarts])
      setLastScanTime(Date.now())
      setDartsThrownThisTurn(prev => prev + simulatedDarts.length)

      // Call detection callback
      onDetection?.(convertedDarts)

      // Update stats
      setDetectionStats(prev => ({
        ...prev,
        successfulScans: prev.successfulScans + 1,
        avgProcessingTime: Math.round((prev.avgProcessingTime * (prev.totalScans - 1) + 450) / prev.totalScans)
      }))

      console.log(`Scan successful: ${simulatedDarts.length} darts detected`)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Scan failed'
      setError(errorMessage)
      console.error('Scan error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const clearDartboard = () => {
    setDetections([])
    setDartsThrownThisTurn(0)
    setLastScanTime(null)
    setError(null) // Clear any errors as well
    console.log('Dartboard cleared')
  }

  const handleCVModeClick = () => {
    console.log('CV button clicked')
    setMode('cv')
    scanDartThrow('cv')
  }

  const handleMLModeClick = () => {
    console.log('ML button clicked')
    setMode('ml')
    scanDartThrow('ml')
  }

  return (
    <div className={`space-y-2 ${className} min-h-[400px]`}>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            PC Dart Scanner
            {cameraStatus === 'ready' && (
              <Badge className="border border-mint-500/40 bg-mint-950 text-mint-300">Ready</Badge>
            )}
            {cameraStatus === 'starting' && (
              <Badge className="border border-brass-500/40 bg-brass-950 text-brass-300">Starting</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 flex-grow flex flex-col">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Main Content - Webcam Feed takes full width */}
          <div className="flex-grow min-h-[300px]">
            <WebcamViewer
              ref={webcamViewerRef}
              onCapture={isScanning ? handleCapture : undefined}
              onServiceReady={handleServiceReady}
              className="w-full h-full"
              showControls={false}
            />
          </div>

          {/* Compact Controls Section */}
          <div className="grid grid-cols-3 gap-2 flex-shrink-0">
            {/* Detection Mode Selector */}
            <Card className="p-2">
              <div className="space-y-2">
                <div className="flex items-center gap-1 mb-1">
                  <Settings className="h-3 w-3" />
                  <span className="text-xs font-medium">Mode</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    variant={mode === 'cv' ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleCVModeClick}
                    className="flex flex-col items-center gap-0 p-1"
                    disabled={isProcessing}
                  >
                    <Camera className="h-3 w-3" />
                    <span className="text-xs">CV</span>
                  </Button>
                  <Button
                    variant={mode === 'ml' ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleMLModeClick}
                    className="flex flex-col items-center gap-0 p-1"
                    disabled={isProcessing}
                  >
                    <Zap className="h-3 w-3" />
                    <span className="text-xs">ML</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Scan Controls */}
            <Card className="p-2">
              <div className="space-y-2">
                <div className="text-xs font-medium mb-1">Scan</div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => scanDartThrow(mode === 'cv' ? 'cv' : 'ml')}
                    className="flex-1"
                    size="sm"
                    disabled={isProcessing || dartsThrownThisTurn >= 3}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Throw
                  </Button>
                  <Button
                    onClick={clearDartboard}
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-xs text-center text-baize-600">
                  Darts: {dartsThrownThisTurn}/3
                </div>
                <Button
                  onClick={handleStartCamera}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={cameraStatus === 'starting'}
                >
                  <Camera className="h-3 w-3 mr-1" />
                  {cameraStatus === 'ready' ? 'Restart Camera' : 'Start Camera'}
                </Button>
              </div>
            </Card>

            {/* Detection Stats */}
            <Card className="p-2">
              <div className="space-y-2">
                <div className="flex items-center gap-1 mb-1">
                  <Target className="h-3 w-3" />
                  <span className="text-xs font-medium">Stats</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="text-center p-1 rounded border border-brass-500/30 bg-brass-950/60">
                    <div className="font-semibold text-brass-300">{detectionStats.totalScans}</div>
                    <div className="text-baize-300">Total</div>
                  </div>
                  <div className="text-center p-1 rounded border border-mint-500/30 bg-mint-950/60">
                    <div className="font-semibold text-mint-300">{detectionStats.successfulScans}</div>
                    <div className="text-baize-300">Success</div>
                  </div>
                </div>
                {detectionStats.totalScans > 0 && (
                  <div className="text-xs text-center text-baize-600">
                    {Math.round((detectionStats.successfulScans / detectionStats.totalScans) * 100)}%
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Processed Image Canvas (Hidden by default) */}
          <canvas 
            ref={canvasRef} 
            className="hidden"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </CardContent>
      </Card>
    </div>
  )
})

DartScannerPC.displayName = 'DartScannerPC'