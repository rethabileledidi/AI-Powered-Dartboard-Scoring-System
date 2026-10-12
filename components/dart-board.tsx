'use client'

import React, { useRef, useEffect, useState } from 'react'
import { calculateDartScore } from '@/lib/scoring-utils'

import { DartImpact } from '@/components/effects/dart-impact'

/** How long a landing animation stays on the board, in milliseconds. */
const IMPACT_MS = 1400

interface DartBoardProps {
  width?: number
  height?: number
  onDartClick?: (x: number, y: number, score: number) => void
  showNumbers?: boolean
  className?: string
}

interface DartHit {
  x: number
  y: number
  score: number
  timestamp: number
}

export const DartBoard: React.FC<DartBoardProps> = ({
  width = 400,
  height = 400,
  onDartClick,
  showNumbers = true,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [darts, setDarts] = useState<DartHit[]>([])
  const [impacts, setImpacts] = useState<DartHit[]>([])

  // Real dart board number layout (clockwise from top)
  const dartNumbers = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

  // Standard tournament dart board colors
  const colors = {
    outerSingle: '#000000', // Black
    innerSingle: '#F5F5DC', // Beige/Off-white
    outerDouble: '#FF0000', // Red
    innerDouble: '#2E8B57', // Seagreen
    outerTriple: '#FF0000', // Red
    innerTriple: '#2E8B57', // Seagreen
    bullOuter: '#2E8B57', // Seagreen (outer bull)
    bullInner: '#FF0000', // Red (inner bull)
    wire: '#C0C0C0', // Silver
    textOnBlack: '#FFFFFF', // White text on black segments
    textOnWhite: '#000000', // Black text on white segments
    background: '#8B4513' // SaddleBrown for cabinet look
  }

  const drawDartBoard = (ctx: CanvasRenderingContext2D) => {
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) / 2 - 10

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw outer circle (background)
    ctx.fillStyle = colors.background
    ctx.beginPath()
    ctx.arc(centerX, centerY, maxRadius, 0, 2 * Math.PI)
    ctx.fill()

    // Draw sections
    for (let i = 0; i < 20; i++) {
      const angle1 = (i * 18 - 90) * Math.PI / 180 // Start with 20 at top (0 degrees)
      const angle2 = ((i + 1) * 18 - 90) * Math.PI / 180
      
      // Outer single
      drawSection(ctx, centerX, centerY, maxRadius * 0.95, maxRadius * 0.85, angle1, angle2, 
        i % 2 === 0 ? colors.outerSingle : colors.innerSingle)
      
      // Outer double
      drawSection(ctx, centerX, centerY, maxRadius * 0.85, maxRadius * 0.75, angle1, angle2, 
        i % 2 === 0 ? colors.outerDouble : colors.innerDouble)
      
      // Inner single (outer)
      drawSection(ctx, centerX, centerY, maxRadius * 0.75, maxRadius * 0.45, angle1, angle2, 
        i % 2 === 0 ? colors.outerSingle : colors.innerSingle)
      
      // Outer triple
      drawSection(ctx, centerX, centerY, maxRadius * 0.45, maxRadius * 0.35, angle1, angle2, 
        i % 2 === 0 ? colors.outerTriple : colors.innerTriple)
      
      // Inner single (inner)
      drawSection(ctx, centerX, centerY, maxRadius * 0.35, maxRadius * 0.15, angle1, angle2, 
        i % 2 === 0 ? colors.outerSingle : colors.innerSingle)
    }

    // Draw bull's eye
    // Outer bull (25 points)
    ctx.fillStyle = colors.bullOuter
    ctx.beginPath()
    ctx.arc(centerX, centerY, maxRadius * 0.15, 0, 2 * Math.PI)
    ctx.fill()

    // Inner bull (50 points)
    ctx.fillStyle = colors.bullInner
    ctx.beginPath()
    ctx.arc(centerX, centerY, maxRadius * 0.08, 0, 2 * Math.PI)
    ctx.fill()

    // Draw wires (section dividers)
    ctx.strokeStyle = colors.wire
    ctx.lineWidth = 2
    for (let i = 0; i < 20; i++) {
      const angle = (i * 18 - 90) * Math.PI / 180 // Start with 20 at top
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(
        centerX + Math.cos(angle) * maxRadius * 0.95,
        centerY + Math.sin(angle) * maxRadius * 0.95
      )
      ctx.stroke()
    }

    // Draw circular wires
    const wireRadii = [0.95, 0.85, 0.75, 0.45, 0.35, 0.15, 0.08]
    wireRadii.forEach(radius => {
      ctx.beginPath()
      ctx.arc(centerX, centerY, maxRadius * radius, 0, 2 * Math.PI)
      ctx.stroke()
    })

    // Draw numbers with enhanced visibility and styling
    if (showNumbers) {
      ctx.font = 'bold 24px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Add text shadow for better visibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 3
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1
      
      for (let i = 0; i < 20; i++) {
        // Calculate the center angle of each segment (not the starting angle)
        const angle = (i * 18 - 90 + 9) * Math.PI / 180 // Start with 20 at top, offset by half segment (9°)
        // Position numbers in the outer ring area (outside the double ring)
        const numberRadius = maxRadius * 0.90
        const x = centerX + Math.cos(angle) * numberRadius
        const y = centerY + Math.sin(angle) * numberRadius
        
        // Set text color based on segment color with enhanced contrast
        if (i % 2 === 0) { // Black segments
          ctx.fillStyle = '#FFFFFF' // Pure white for black segments
        } else { // White segments
          ctx.fillStyle = '#000000' // Pure black for white segments
        }
        
        // Draw number outline for better visibility
        ctx.strokeStyle = i % 2 === 0 ? '#000000' : '#FFFFFF'
        ctx.lineWidth = 3
        ctx.strokeText(dartNumbers[i].toString(), x, y)
        
        // Draw filled number
        ctx.fillText(dartNumbers[i].toString(), x, y)
      }
      
      // Reset shadow
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    }

    // Draw dart hits
    darts.forEach(dart => {
      // Convert normalized coordinates (0-1) to canvas coordinates
      const canvasX = dart.x * width
      const canvasY = dart.y * height
      
      console.log(`Drawing dart at normalized: (${dart.x.toFixed(3)}, ${dart.y.toFixed(3)}) -> canvas: (${canvasX.toFixed(1)}, ${canvasY.toFixed(1)})`)
      
      // Draw dart
      ctx.fillStyle = '#ffff00'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, 4, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
      
      // Draw dart tip
      ctx.fillStyle = '#ff0000'
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, 2, 0, 2 * Math.PI)
      ctx.fill()
    })
  }

  const drawSection = (
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    outerRadius: number,
    innerRadius: number,
    angle1: number,
    angle2: number,
    color: string
  ) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(centerX, centerY, outerRadius, angle1, angle2)
    ctx.arc(centerX, centerY, innerRadius, angle2, angle1, true)
    ctx.closePath()
    ctx.fill()
  }

  const getScoreFromPosition = (x: number, y: number): number => {
    const result = calculateDartScore({ x, y })
    return result.score
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    
    // Calculate coordinates relative to canvas element (0 to 1)
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height

    console.log(`Click coordinates: clientX=${event.clientX}, clientY=${event.clientY}`)
    console.log(`Canvas rect: left=${rect.left}, top=${rect.top}, width=${rect.width}, height=${rect.height}`)
    console.log(`Normalized coordinates: x=${x.toFixed(3)}, y=${y.toFixed(3)}`)

    const score = getScoreFromPosition(x, y)
    
    const newDart: DartHit = {
      x,
      y,
      score,
      timestamp: Date.now()
    }

    setDarts(prev => [...prev, newDart])

    // Play the landing animation at this point, then tidy it away
    setImpacts(prev => [...prev, newDart])
    setTimeout(() => {
      setImpacts(prev => prev.filter(impact => impact.timestamp !== newDart.timestamp))
    }, IMPACT_MS)
    
    if (onDartClick) {
      onDartClick(x, y, score)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawDartBoard(ctx)
  }, [darts, width, height, showNumbers])

  const clearDarts = () => {
    setDarts([])
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative w-full aspect-square">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          className="w-full h-full rounded-xl border border-brass-500/40 cursor-crosshair shadow-[0_18px_40px_-18px_rgb(0_0_0/0.9)]"
        />
        {impacts.map(impact => (
          <DartImpact key={impact.timestamp} x={impact.x} y={impact.y} score={impact.score} />
        ))}
      </div>
      <button
        onClick={clearDarts}
        className="mt-4 w-full rounded-lg border border-baize-600 px-4 py-2.5 font-medium text-baize-200 transition-colors hover:border-bull-400 hover:text-bull-300"
      >
        Clear Darts
      </button>
    </div>
  )
}

export default DartBoard