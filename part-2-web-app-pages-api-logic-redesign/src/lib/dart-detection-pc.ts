'use client'

import { WebcamService } from './webcam-service'

export interface DartDetection {
  x: number
  y: number
  score: number
  multiplier: number
  confidence: number
  className: string
  bbox?: [number, number, number, number] // Optional bounding box [x, y, width, height]
}

export interface DetectionResult {
  detections: DartDetection[]
  processingTime: number
  imageWidth: number
  imageHeight: number
}

export class DartDetectionServicePC {
  private webcamService: WebcamService
  private isInitialized = false

  constructor(webcamService: WebcamService) {
    this.webcamService = webcamService
  }

  async initialize(): Promise<boolean> {
    try {
      // For PC implementation, we'll use a simplified detection approach
      // In a real implementation, this would load a YOLO model
      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Failed to initialize dart detection:', error)
      return false
    }
  }

  async detectDarts(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<DetectionResult> {
    if (!this.isInitialized) {
      throw new Error('Detection service not initialized')
    }

    const startTime = performance.now()
    
    // Create canvas for processing
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }

    // Set canvas dimensions
    canvas.width = imageElement.width || 640
    canvas.height = imageElement.height || 480

    // Draw image to canvas
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height)

    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // Simulate dart detection (in real implementation, this would use YOLO)
    const detections = await this.simulateDartDetection(imageData, canvas.width, canvas.height)
    
    const processingTime = performance.now() - startTime

    return {
      detections,
      processingTime,
      imageWidth: canvas.width,
      imageHeight: canvas.height
    }
  }

  private async simulateDartDetection(imageData: ImageData, width: number, height: number): Promise<DartDetection[]> {
    // This is a simplified simulation for demonstration
    // In a real implementation, this would process the image through YOLO
    
    // Simulate finding 1-3 darts in random positions
    const numDarts = Math.floor(Math.random() * 3) + 1
    const detections: DartDetection[] = []

    for (let i = 0; i < numDarts; i++) {
      // Random position within the image
      const x = Math.random() * width
      const y = Math.random() * height
      
      // Calculate distance from center for scoring
      const centerX = width / 2
      const centerY = height / 2
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
      
      // Determine score based on distance (simplified)
      const maxRadius = Math.min(width, height) / 2
      const normalizedDistance = distance / maxRadius
      
      let score = 0
      let multiplier = 1
      let className = 'miss'
      
      if (normalizedDistance < 0.1) {
        // Bullseye
        score = 50
        className = 'bullseye'
      } else if (normalizedDistance < 0.2) {
        // Outer bull
        score = 25
        className = 'outer_bull'
      } else if (normalizedDistance < 0.8) {
        // Regular scoring area
        const angle = Math.atan2(y - centerY, x - centerX)
        const segment = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 20) + 1
        score = segment
        
        // Determine if in double or triple ring
        if (normalizedDistance > 0.6 && normalizedDistance < 0.65) {
          multiplier = 2
          className = `double_${segment}`
        } else if (normalizedDistance > 0.4 && normalizedDistance < 0.45) {
          multiplier = 3
          className = `triple_${segment}`
        } else {
          className = `single_${segment}`
        }
      }

      detections.push({
        x: x / width, // Normalize to 0-1
        y: y / height, // Normalize to 0-1
        score: score * multiplier,
        multiplier,
        confidence: 0.8 + Math.random() * 0.2, // Simulate confidence
        className
      })
    }

    return detections
  }

  // Method to process webcam frame directly
  async processWebcamFrame(): Promise<DetectionResult> {
    const canvas = this.webcamService.captureFrame()
    if (!canvas) {
      throw new Error('Failed to capture frame from webcam')
    }

    return this.detectDarts(canvas)
  }

  // Utility method to draw detections on canvas
  drawDetections(canvas: HTMLCanvasElement, detections: DartDetection[]): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    detections.forEach(detection => {
      const x = detection.x * width
      const y = detection.y * height

      // Draw bounding box
      ctx.strokeStyle = detection.confidence > 0.8 ? '#00ff00' : '#ffff00'
      ctx.lineWidth = 2
      ctx.strokeRect(x - 10, y - 10, 20, 20)

      // Draw label
      ctx.fillStyle = ctx.strokeStyle
      ctx.font = '14px Arial'
      const label = `${detection.className} (${detection.score})`
      ctx.fillText(label, x - 30, y - 15)
    })
  }
}

// Factory function
export function createDartDetectionServicePC(webcamService: WebcamService): DartDetectionServicePC {
  return new DartDetectionServicePC(webcamService)
}