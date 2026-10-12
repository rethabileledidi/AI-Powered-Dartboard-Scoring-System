'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DartDetection } from '@/lib/dart-detection-pc'
import { DartBoard } from '@/components/dart-board'
import { Target, Circle } from 'lucide-react'

interface DartboardVisualizationProps {
  detections: DartDetection[]
  className?: string
}

export function DartboardVisualization({ detections, className = '' }: DartboardVisualizationProps) {
  // Convert detection coordinates to dart board format
  const getDartboardPosition = (detection: DartDetection) => {
    // Normalize coordinates to -1 to 1 range with center at 0,0
    const x = (detection.x - 0.5) * 2
    const y = (detection.y - 0.5) * 2
    
    // Calculate distance from center (0 to 1)
    const distance = Math.sqrt(x * x + y * y)
    
    // Calculate angle in degrees (0 to 360)
    let angle = Math.atan2(y, x) * (180 / Math.PI)
    if (angle < 0) angle += 360
    
    // Rotate angle by 90 degrees to align with dartboard (20 at top)
    angle = (angle + 90) % 360
    
    return { x, y, distance, angle }
  }

  // Get dartboard segment from angle
  const getSegmentFromAngle = (angle: number) => {
    const dartboardNumbers = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 20]
    const segmentAngle = 360 / 20 // 18 degrees per segment
    const segmentIndex = Math.floor(angle / segmentAngle)
    return dartboardNumbers[segmentIndex]
  }

  // Get multiplier from distance
  const getMultiplierFromDistance = (distance: number) => {
    if (distance < 0.05) return 'bull' // Bullseye
    if (distance < 0.1) return 'outer-bull' // Outer bull
    if (distance > 0.8 && distance < 0.9) return 'triple'
    if (distance > 0.95) return 'double'
    return 'single'
  }

  // Handle dart click (for display purposes only - no actual scoring)
  const handleDartClick = (x: number, y: number, score: number) => {
    // This is just for display - we don't need to handle actual clicks in visualization
    console.log(`Dart clicked at (${x}, ${y}) with score ${score}`)
  }

  return (
    <Card className={`bg-baize-800/50 border-baize-700 h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-chalk flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-mint-400" />
          Dartboard Visualization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow flex flex-col">
        {/* Dartboard Display */}
        <div className="flex-grow flex items-center justify-center bg-baize-900/50 rounded-lg border border-baize-600 p-2 min-h-[300px]">
          <div className="w-full max-w-md mx-auto relative">
            <DartBoard
              width={400}
              height={400}
              onDartClick={handleDartClick}
              showNumbers={true}
              className="w-full"
            />
            
            {/* Overlay dart positions */}
            {detections.map((detection, index) => (
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
        </div>

        {/* Detection Details */}
        {detections.length > 0 && (
          <div className="space-y-3 flex-shrink-0 max-h-[200px]">
            <h4 className="text-chalk font-medium flex items-center gap-2">
              <Circle className="h-4 w-4" />
              Detection Details
            </h4>
            <div className="space-y-2 max-h-[150px] overflow-y-auto">
              {detections.map((detection, index) => {
                const pos = getDartboardPosition(detection)
                const segment = getSegmentFromAngle(pos.angle)
                const multiplier = getMultiplierFromDistance(pos.distance)
                
                return (
                  <div key={index} className="flex items-center justify-between p-2 bg-baize-700/30 rounded border border-baize-600/50">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-brass-500 text-black text-xs">
                        {index + 1}
                      </Badge>
                      <span className="text-chalk text-sm">
                        {segment} {multiplier !== 'single' ? `(${multiplier})` : ''}
                      </span>
                    </div>
                    <div className="text-xs text-baize-400">
                      {detection.score} pts
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* No detections message */}
        {detections.length === 0 && (
          <div className="flex-grow flex items-center justify-center text-baize-400 min-h-[200px]">
            <div className="text-center p-4">
              <Target className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Scan darts to see positions</p>
              <p className="text-xs mt-1">Dartboard will show dart locations</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}