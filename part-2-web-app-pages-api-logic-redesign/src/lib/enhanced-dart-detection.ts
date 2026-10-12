'use client'

import { DartDetection } from './dart-detection-pc'

export interface EnhancedDetectionResult {
  darts: DartDetection[]
  processingTime: number
  success: boolean
  debugInfo?: {
    frameSize: { width: number; height: number }
    detectionMethod: string
    confidence: number
  }
}

/**
 * Enhanced dart detection that works with real camera input
 * This provides a more realistic detection simulation that can be replaced
 * with actual computer vision algorithms
 */
export class EnhancedDartDetection {
  private lastFrameTime = 0
  private frameBuffer: ImageData[] = []
  private maxBufferSize = 5

  async detectFromCanvas(canvas: HTMLCanvasElement | HTMLImageElement): Promise<EnhancedDetectionResult> {
    const startTime = performance.now()
    
    try {
      // Create a temporary canvas for processing
      const tempCanvas = document.createElement('canvas')
      const ctx = tempCanvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      // Set canvas dimensions
      tempCanvas.width = canvas.width || 640
      tempCanvas.height = canvas.height || 480
      
      // Draw the image/canvas to our temp canvas
      ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height)
      
      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
      
      // Add to frame buffer for temporal analysis
      this.addToBuffer(imageData)
      
      // Perform detection
      const detections = await this.performDetection(imageData, tempCanvas.width, tempCanvas.height)
      
      const processingTime = performance.now() - startTime
      
      return {
        darts: detections,
        processingTime,
        success: true,
        debugInfo: {
          frameSize: { width: tempCanvas.width, height: tempCanvas.height },
          detectionMethod: 'enhanced-simulation',
          confidence: detections.length > 0 ? Math.max(...detections.map(d => d.confidence)) : 0
        }
      }
    } catch (error) {
      console.error('Enhanced detection failed:', error)
      return {
        darts: [],
        processingTime: performance.now() - startTime,
        success: false
      }
    }
  }

  private addToBuffer(imageData: ImageData): void {
    this.frameBuffer.push(imageData)
    if (this.frameBuffer.length > this.maxBufferSize) {
      this.frameBuffer.shift()
    }
  }

  private async performDetection(imageData: ImageData, width: number, height: number): Promise<DartDetection[]> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100))
    
    const detections: DartDetection[] = []
    
    // Analyze the image data to simulate realistic detection
    const center = { x: width / 2, y: height / 2 }
    const maxRadius = Math.min(width, height) / 2
    
    // Generate 1-3 darts with realistic positioning
    const numDarts = Math.floor(Math.random() * 3) + 1
    
    for (let i = 0; i < numDarts; i++) {
      const detection = this.generateRealisticDetection(center, maxRadius, width, height)
      detections.push(detection)
    }
    
    // Sort by confidence (highest first)
    return detections.sort((a, b) => b.confidence - a.confidence)
  }

  private generateRealisticDetection(center: { x: number; y: number }, maxRadius: number, width: number, height: number): DartDetection {
    // Generate position with bias toward center (more realistic for dart throws)
    const angle = Math.random() * 2 * Math.PI
    const distance = this.gaussianRandom() * (maxRadius * 0.3) + (maxRadius * 0.1) // Most darts land in middle area
    
    const x = center.x + Math.cos(angle) * distance
    const y = center.y + Math.sin(angle) * distance
    
    // Calculate dartboard position and score
    const normalizedDistance = distance / maxRadius
    const dartAngle = Math.atan2(y - center.y, x - center.x)
    
    // Convert to dartboard coordinates (0-20 segments)
    let segment = Math.floor(((dartAngle + Math.PI) / (2 * Math.PI)) * 20)
    segment = ((segment + 18) % 20) + 1 // Dartboard numbering starts at top (6 o'clock position)
    
    // Determine score and multiplier based on position
    let score = 0
    let multiplier = 1
    let className = 'miss'
    let confidence = 0.6 + Math.random() * 0.4 // Base confidence
    
    // Dartboard zones (from center outward)
    if (normalizedDistance < 0.05) {
      // Inner bull (50 points)
      score = 50
      className = 'bullseye'
      confidence += 0.2
    } else if (normalizedDistance < 0.1) {
      // Outer bull (25 points)
      score = 25
      className = 'outer_bull'
      confidence += 0.15
    } else if (normalizedDistance < 0.35) {
      // Single scoring area
      score = segment
      className = `single_${segment}`
      confidence += 0.1
    } else if (normalizedDistance < 0.4) {
      // Triple ring
      score = segment * 3
      multiplier = 3
      className = `triple_${segment}`
      confidence += 0.25
    } else if (normalizedDistance < 0.7) {
      // Single scoring area (outer)
      score = segment
      className = `single_${segment}`
    } else if (normalizedDistance < 0.75) {
      // Double ring
      score = segment * 2
      multiplier = 2
      className = `double_${segment}`
      confidence += 0.2
    }
    // Outside this radius is a miss
    
    // Ensure coordinates are within bounds
    const clampedX = Math.max(0, Math.min(1, x / width))
    const clampedY = Math.max(0, Math.min(1, y / height))
    
    // Generate bounding box (approximate dart size)
    const dartSize = 20 + Math.random() * 10
    const bbox: [number, number, number, number] = [
      x - dartSize / 2,
      y - dartSize / 2,
      dartSize,
      dartSize
    ]
    
    return {
      x: clampedX,
      y: clampedY,
      score: score * multiplier,
      multiplier,
      confidence: Math.min(1.0, confidence),
      className,
      bbox
    }
  }

  // Generate random number with Gaussian distribution (more realistic for dart throws)
  private gaussianRandom(): number {
    let u = 0, v = 0
    while(u === 0) u = Math.random() // Converting [0,1) to (0,1)
    while(v === 0) v = Math.random()
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  }

  // Method to detect if image quality is sufficient for detection
  checkImageQuality(imageData: ImageData): { isGood: boolean; reasons: string[] } {
    const reasons: string[] = []
    let isGood = true
    
    // Check brightness (simple average)
    let totalBrightness = 0
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i]
      const g = imageData.data[i + 1]
      const b = imageData.data[i + 2]
      totalBrightness += (r + g + b) / 3
    }
    const avgBrightness = totalBrightness / (imageData.data.length / 4)
    
    if (avgBrightness < 50) {
      reasons.push('Image too dark')
      isGood = false
    } else if (avgBrightness > 200) {
      reasons.push('Image too bright')
      isGood = false
    }
    
    // Check contrast (simplified)
    const contrast = this.calculateContrast(imageData)
    if (contrast < 30) {
      reasons.push('Low contrast')
      isGood = false
    }
    
    return { isGood, reasons }
  }

  private calculateContrast(imageData: ImageData): number {
    // Simplified contrast calculation
    let minBrightness = 255
    let maxBrightness = 0
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i]
      const g = imageData.data[i + 1]
      const b = imageData.data[i + 2]
      const brightness = (r + g + b) / 3
      
      minBrightness = Math.min(minBrightness, brightness)
      maxBrightness = Math.max(maxBrightness, brightness)
    }
    
    return maxBrightness - minBrightness
  }
}

// Factory function
export function createEnhancedDartDetection(): EnhancedDartDetection {
  return new EnhancedDartDetection()
}

// Standalone function for direct use
export async function detectFromCanvasEnhanced(canvas: HTMLCanvasElement | HTMLImageElement): Promise<EnhancedDetectionResult> {
  const detector = createEnhancedDartDetection()
  return detector.detectFromCanvas(canvas)
}