'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DartDetection } from '@/lib/dart-detection-pc'
import { Target, User, Trophy } from 'lucide-react'

interface DartVisualizationProps {
  detections: DartDetection[]
  currentPlayer?: string
  className?: string
}

export function DartVisualization({ detections, currentPlayer, className = '' }: DartVisualizationProps) {
  const getScoreColor = (score: number) => {
    if (score >= 50) return 'bg-bull-500'
    if (score >= 25) return 'bg-mint-500'
    if (score >= 20) return 'bg-brass-500'
    return 'bg-baize-500'
  }

  const getMultiplierText = (detection: DartDetection) => {
    if (detection.className?.toLowerCase().includes('triple')) return 'Triple'
    if (detection.className?.toLowerCase().includes('double')) return 'Double'
    if (detection.className?.toLowerCase().includes('bull')) return 'Bull'
    return 'Single'
  }

  return (
    <Card className={`bg-baize-800/50 border-baize-700 h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-chalk flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-brass-400" />
          Dart Detection Box
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow flex flex-col">
        {/* Current Player */}
        {currentPlayer && (
          <div className="flex items-center gap-3 p-3 bg-baize-700/50 rounded-lg border border-baize-600">
            <User className="h-4 w-4 text-brass-400" />
            <span className="text-chalk font-medium">{currentPlayer}</span>
          </div>
        )}

        {/* Darts List */}
        {detections.length > 0 ? (
          <div className="space-y-3 flex-grow overflow-y-auto max-h-96">
            {detections.map((detection, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-baize-700/30 rounded-lg border border-baize-600/50">
                <div className="flex items-center gap-3 mb-2 sm:mb-0">
                  <span className="text-chalk font-medium">Dart {index + 1}</span>
                  <Badge className={`${getScoreColor(detection.score)} text-chalk px-3 py-1.5`}>
                    {detection.score}
                  </Badge>
                  <Badge variant="outline" className="border-baize-600 text-baize-300 text-sm">
                    {getMultiplierText(detection)}
                  </Badge>
                </div>
                <div className="text-sm text-baize-400">
                  ({(detection.x * 100).toFixed(0)}%, {(detection.y * 100).toFixed(0)}%)
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center text-baize-400">
            <div className="text-center">
              <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No darts detected</p>
              <p className="text-base mt-2">Start scanning to see results</p>
            </div>
          </div>
        )}

        {/* Total Score */}
        {detections.length > 0 && (
          <div className="flex-shrink-0">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-brass-600/20 to-ember-600/20 rounded-lg border border-brass-500/30">
              <span className="text-chalk text-lg font-bold">Total Score:</span>
              <Badge className="bg-gradient-to-r from-brass-600 to-ember-600 text-chalk px-4 py-2 text-lg font-bold">
                {detections.reduce((sum, d) => sum + d.score, 0)}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}