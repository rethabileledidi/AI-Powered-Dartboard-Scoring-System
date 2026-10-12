// Computer Vision-based detection module (no ML)
import { createCVDartDetector, CVDartDetection } from './cv-dart-detector'
import { DartDetection } from './dart-detection-pc'

export interface DetectionResult {
  darts: DartDetection[]
  processingTime: number
  success: boolean
}

// Global detector instance
let detector: any = null

export async function detectFromCanvas(canvas: HTMLCanvasElement | HTMLImageElement): Promise<DetectionResult> {
  const startTime = performance.now()
  
  try {
    // Initialize detector if not already done
    if (!detector) {
      detector = createCVDartDetector()
    }
    
    // Create a canvas for processing
    const processingCanvas = document.createElement('canvas')
    const ctx = processingCanvas.getContext('2d')
    
    if (!ctx) {
      throw new Error('Failed to get canvas context')
    }
    
    // Set canvas dimensions
    processingCanvas.width = canvas.width || 640
    processingCanvas.height = canvas.height || 480
    
    // Draw the source image/canvas to our processing canvas
    ctx.drawImage(canvas, 0, 0, processingCanvas.width, processingCanvas.height)
    
    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, processingCanvas.width, processingCanvas.height)
    
    // First, detect the dartboard
    const dartboardInfo = await detector.detectDartboard(imageData)
    
    // Then detect darts
    const cvDetections = await detector.detectDarts(imageData)
    
    // Convert CV detections to our format
    const detections: DartDetection[] = cvDetections.map(cvDetection => ({
      x: cvDetection.x,
      y: cvDetection.y,
      score: cvDetection.score,
      multiplier: cvDetection.multiplier,
      confidence: cvDetection.confidence,
      className: cvDetection.className,
      bbox: cvDetection.bbox
    }))
    
    const processingTime = performance.now() - startTime
    
    return {
      darts: detections,
      processingTime,
      success: dartboardInfo.detected
    }
  } catch (error) {
    console.error('CV Detection failed:', error)
    return {
      darts: [],
      processingTime: performance.now() - startTime,
      success: false
    }
  }
}

// Lightweight version (same as full for CV, but can be optimized further)
export async function detectFromCanvasLightweight(canvas: HTMLCanvasElement | HTMLImageElement): Promise<DetectionResult> {
  return detectFromCanvas(canvas)
}