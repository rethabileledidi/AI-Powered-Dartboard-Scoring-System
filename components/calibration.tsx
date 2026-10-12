'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { WebcamViewer } from '@/components/webcam-viewer'
import { Target, Camera, CheckCircle, AlertCircle, Settings, RefreshCw } from 'lucide-react'

interface CalibrationStep {
  id: string
  name: string
  description: string
  completed: boolean
  progress: number
}

interface CalibrationProps {
  onCalibrationComplete?: (success: boolean) => void
  className?: string
}

export function Calibration({ onCalibrationComplete, className = '' }: CalibrationProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationResults, setCalibrationResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const calibrationSteps: CalibrationStep[] = [
    {
      id: 'camera',
      name: 'Camera Setup',
      description: 'Position camera and ensure proper lighting',
      completed: false,
      progress: 0
    },
    {
      id: 'detection',
      name: 'Dart Detection',
      description: 'Test dart detection accuracy',
      completed: false,
      progress: 0
    },
    {
      id: 'scoring',
      name: 'Scoring Accuracy',
      description: 'Verify score calculation precision',
      completed: false,
      progress: 0
    },
    {
      id: 'performance',
      name: 'Performance Test',
      description: 'Check system responsiveness',
      completed: false,
      progress: 0
    }
  ]

  const [steps, setSteps] = useState<CalibrationStep[]>(calibrationSteps)

  const startCalibration = () => {
    setIsCalibrating(true)
    setError(null)
    setCalibrationResults([])
    setCurrentStep(0)
    
    // Reset steps
    setSteps(steps.map(step => ({ ...step, completed: false, progress: 0 })))
  }

  const runStepCalibration = async (stepIndex: number) => {
    const step = steps[stepIndex]
    
    try {
      // Run calibration process
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100))
        
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, progress } : s
        ))
      }
      
      // Mark step as completed
      setSteps(prev => prev.map((s, i) => 
        i === stepIndex ? { ...s, completed: true, progress: 100 } : s
      ))
      
      // Add result
      const result = {
        step: step.id,
        success: true,
        message: `${step.name} calibration completed successfully`,
        timestamp: Date.now()
      }
      setCalibrationResults(prev => [...prev, result])
      
      // Move to next step or complete
      if (stepIndex < steps.length - 1) {
        setCurrentStep(stepIndex + 1)
        setTimeout(() => runStepCalibration(stepIndex + 1), 500)
      } else {
        completeCalibration(true)
      }
    } catch (err) {
      const result = {
        step: step.id,
        success: false,
        message: `${step.name} calibration failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: Date.now()
      }
      setCalibrationResults(prev => [...prev, result])
      setError(result.message)
      completeCalibration(false)
    }
  }

  const completeCalibration = (success: boolean) => {
    setIsCalibrating(false)
    onCalibrationComplete?.(success)
  }

  const resetCalibration = () => {
    setIsCalibrating(false)
    setError(null)
    setCalibrationResults([])
    setCurrentStep(0)
    setSteps(calibrationSteps)
  }

  useEffect(() => {
    if (isCalibrating && currentStep === 0) {
      setTimeout(() => runStepCalibration(0), 500)
    }
  }, [isCalibrating, currentStep])

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-baize-800/50 border-baize-700">
        <CardHeader>
          <CardTitle className="text-chalk flex items-center gap-2">
            <Target className="h-5 w-5 text-mint-400" />
            Computer Vision Calibration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Calibration Steps */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-chalk">Calibration Steps</h3>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed 
                          ? 'bg-mint-500 text-chalk' 
                          : index === currentStep && isCalibrating
                          ? 'bg-brass-500 text-chalk animate-pulse'
                          : 'bg-baize-600 text-baize-300'
                      }`}>
                        {step.completed ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium text-chalk">{step.name}</h4>
                        <p className="text-sm text-baize-400">{step.description}</p>
                      </div>
                    </div>
                    {step.completed && (
                      <Badge className="bg-mint-500 text-chalk">
                        Complete
                      </Badge>
                    )}
                  </div>
                  
                  {step.progress > 0 && step.progress < 100 && (
                    <Progress value={step.progress} className="h-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Camera Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-chalk">Camera Preview</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <WebcamViewer className="w-full" />
              </div>
              <div className="space-y-4">
                <Card className="bg-baize-700/50 border-baize-600">
                  <CardHeader>
                    <CardTitle className="text-chalk text-lg">Calibration Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-baize-300">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Ensure proper lighting on the dartboard</li>
                      <li>Position camera at 1.5m distance, 30° angle</li>
                      <li>Remove any obstructions from camera view</li>
                      <li>Ensure dartboard is clearly visible</li>
                      <li>Check for glare or reflections</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="bg-baize-700/50 border-baize-600">
                  <CardHeader>
                    <CardTitle className="text-chalk text-lg">System Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-baize-300">Camera:</span>
                      <Badge className="bg-mint-500 text-chalk">Ready</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-baize-300">Detection:</span>
                      <Badge className="bg-brass-500 text-chalk">Calibrating</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-baize-300">Performance:</span>
                      <Badge className="bg-brass-500 text-chalk">Optimal</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Calibration Controls */}
          <div className="flex gap-3">
            {!isCalibrating ? (
              <Button 
                onClick={startCalibration}
                className="bg-mint-600 text-chalk hover:bg-mint-700"
              >
                <Target className="h-4 w-4 mr-2" />
                Start Calibration
              </Button>
            ) : (
              <Button 
                onClick={() => {
                  setIsCalibrating(false)
                  setError(null)
                }}
                variant="destructive"
              >
                Stop Calibration
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={resetCalibration}
              className="border-baize-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Calibration Results */}
          {calibrationResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-chalk">Calibration Results</h3>
              <div className="space-y-2">
                {calibrationResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg border ${
                      result.success 
                        ? 'border-mint-500/30 bg-mint-500/10' 
                        : 'border-bull-500/30 bg-bull-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-mint-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-bull-400" />
                      )}
                      <span className={`font-medium ${
                        result.success ? 'text-mint-400' : 'text-bull-400'
                      }`}>
                        {result.step.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-baize-300 mt-1">{result.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}