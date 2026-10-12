'use client'

import React, { useCallback, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DartBoard } from '@/components/dart-board'
import { TurnCallout } from '@/components/effects/turn-callout'
import { DartDetection } from '@/lib/dart-detection-pc'
import { Target, Zap, CheckCircle, AlertCircle, Brain, Calculator } from 'lucide-react'

interface ManualDetectionProps {
  onManualDetection: (detections: DartDetection[]) => void
  currentGame?: any
  className?: string
}

export function ManualDetection({ onManualDetection, currentGame, className = '' }: ManualDetectionProps) {
  const [manualDetections, setManualDetections] = useState<DartDetection[]>([])
  const [isAssisting, setIsAssisting] = useState(false)
  const [isAIAssisting, setIsAIAssisting] = useState(false)
  const [aiScore, setAIScore] = useState<number | null>(null)
  const [calledTotal, setCalledTotal] = useState<number | null>(null)
  const clearCallout = useCallback(() => setCalledTotal(null), [])

  const handleDartClick = (x: number, y: number, score: number) => {
    const detection: DartDetection = {
      x,
      y,
      score,
      multiplier: 1,
      className: 'Single',
      confidence: 1.0
    }
    
    const newDetections = [...manualDetections, detection]
    setManualDetections(newDetections)
    
    // Update AI score if AI assistance is active
    if (isAIAssisting) {
      const totalScore = newDetections.reduce((sum, d) => sum + d.score, 0)
      setAIScore(totalScore)
    }
    
    // If we have 3 darts, process them
    if (newDetections.length >= 3) {
      // Announce the three-dart total over the board
      setCalledTotal(newDetections.reduce((sum, d) => sum + d.score, 0))
      setTimeout(() => {
        onManualDetection(newDetections)
        setManualDetections([])
        setAIScore(null)
      }, 500)
    }
  }

  const clearManualDetections = () => {
    setManualDetections([])
    setAIScore(null)
  }

  const toggleAssistance = () => {
    setIsAssisting(!isAssisting)
  }

  const toggleAIAssistance = () => {
    setIsAIAssisting(!isAIAssisting)
    if (!isAIAssisting && manualDetections.length > 0) {
      // Calculate AI score
      const totalScore = manualDetections.reduce((sum, d) => sum + d.score, 0)
      setAIScore(totalScore)
    } else {
      setAIScore(null)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 50) return 'bg-bull-500'
    if (score >= 25) return 'bg-mint-500'
    if (score >= 20) return 'bg-brass-500'
    return 'bg-baize-500'
  }

  return (
    <Card className={`bg-baize-800/50 border-baize-700 ${className}`}>
      <CardHeader>
        <CardTitle className="text-chalk flex items-center gap-2">
          <Target className="h-5 w-5 text-mint-400" />
          Manual Detection Assistant
          {isAssisting && (
            <Badge className="bg-mint-600 text-chalk">
              <Zap className="h-3 w-3 mr-1" />
              Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={toggleAssistance}
            variant={isAssisting ? "default" : "outline"}
            className={isAssisting ? "bg-mint-600 text-chalk hover:bg-mint-700" : "border-baize-600"}
          >
            <Zap className="h-4 w-4 mr-2" />
            {isAssisting ? 'Assisting' : 'Assist CV'}
          </Button>
          <Button 
            onClick={toggleAIAssistance}
            variant={isAIAssisting ? "default" : "outline"}
            className={isAIAssisting ? "bg-ember-600 text-chalk hover:bg-ember-700" : "border-baize-600"}
          >
            <Brain className="h-4 w-4 mr-2" />
            {isAIAssisting ? 'AI Active' : 'AI Assist'}
          </Button>
          <Button 
            variant="outline" 
            onClick={clearManualDetections}
            disabled={manualDetections.length === 0}
            className="border-baize-600"
          >
            Clear
          </Button>
        </div>

        {/* Status */}
        <div className="flex flex-wrap gap-2 text-sm">
          {isAssisting ? (
            <>
              <CheckCircle className="h-4 w-4 text-mint-400" />
              <span className="text-mint-400">Manual detection assistance enabled</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-brass-400" />
              <span className="text-brass-400">Click to enable manual detection assistance</span>
            </>
          )}
          {isAIAssisting && (
            <>
              <Brain className="h-4 w-4 text-ember-400" />
              <span className="text-ember-400">AI assistance active</span>
            </>
          )}
        </div>

        {/* Dartboard and Score Display */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Dartboard - Takes 2 columns on large screens */}
          <div className="xl:col-span-2 relative">
            <div className="w-full max-w-md mx-auto">
              <DartBoard
                width={400}
                height={400}
                onDartClick={handleDartClick}
                showNumbers={true}
                className="w-full"
              />
            </div>

            {calledTotal !== null && <TurnCallout total={calledTotal} onDone={clearCallout} />}
            
            {/* Manual Darts Overlay */}
            {manualDetections.map((detection, index) => (
              <div
                key={index}
                className="absolute w-4 h-4 bg-brass-400 rounded-full border-2 border-white shadow-lg"
                style={{
                  left: `calc(50% + ${(detection.x - 0.5) * 400}px - 8px)`,
                  top: `calc(50% + ${(detection.y - 0.5) * 400}px - 8px)`,
                  zIndex: 10
                }}
              />
            ))}
          </div>

          {/* AI Score Display - Takes 1 column on large screens */}
          <div className="space-y-4">
            {/* AI Score Card */}
            {isAIAssisting && (
              <Card className="bg-ember-900/30 border-ember-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-chalk text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-ember-400" />
                    AI Score Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aiScore !== null ? (
                    <div className="text-center">
                      <div className="text-4xl font-bold text-ember-400 mb-2">
                        {aiScore}
                      </div>
                      <div className="text-sm text-ember-300">Total Score</div>
                      <div className="mt-4 space-y-2">
                        {manualDetections.map((detection, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-baize-300">Dart {index + 1}:</span>
                            <Badge className={getScoreColor(detection.score)}>
                              {detection.score}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-ember-300">
                      <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-base">Add darts to see AI analysis</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            {manualDetections.length > 0 && (
              <Card className="bg-baize-700/30 border-baize-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-chalk text-sm">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-baize-300">Darts:</span>
                    <Badge variant="outline" className="border-baize-600 text-baize-300">
                      {manualDetections.length}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-baize-300">Average:</span>
                    <Badge variant="outline" className="border-baize-600 text-baize-300">
                      {(manualDetections.reduce((sum, d) => sum + d.score, 0) / manualDetections.length).toFixed(1)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-baize-300">Highest:</span>
                    <Badge className={getScoreColor(Math.max(...manualDetections.map(d => d.score)))}>
                      {Math.max(...manualDetections.map(d => d.score))}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Current Darts */}
        {manualDetections.length > 0 && (
          <div className="space-y-3 p-4 bg-baize-700/30 rounded-lg border border-baize-600">
            <h4 className="text-base font-medium text-chalk">Current Darts:</h4>
            <div className="flex gap-3 flex-wrap">
              {manualDetections.map((detection, index) => (
                <Badge key={index} className={`chip-pop font-display ${getScoreColor(detection.score)} text-chalk px-3 py-1.5 text-base tracking-wide`}>
                  Dart {index + 1}: {detection.score}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-baize-400">
              {manualDetections.length < 3 
                ? `Add ${3 - manualDetections.length} more dart${manualDetections.length < 2 ? 's' : ''} to complete turn`
                : 'Processing complete turn...'
              }
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-baize-400 space-y-1">
          <p><strong>How to use:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Enable "Assist CV" to help computer vision</li>
            <li>Enable "AI Assist" for machine learning analysis</li>
            <li>Click on dartboard where darts landed</li>
            <li>AI calculates and displays scores on the side</li>
            <li>3 darts automatically process the turn</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}