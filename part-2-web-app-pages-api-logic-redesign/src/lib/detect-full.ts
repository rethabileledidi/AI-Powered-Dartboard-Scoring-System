// Full detection module for dart detection
import { DartDetection } from './dart-detection-pc'

export interface DetectionResult {
  darts: DartDetection[]
  processingTime: number
  success: boolean
}

export async function detectFromCanvas(canvas: HTMLCanvasElement | HTMLImageElement): Promise<DetectionResult> {
  const startTime = performance.now()
  
  try {
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
    
    // Simulate dart detection (in real implementation, this would use YOLO)
    const detections = await simulateDartDetection(imageData, processingCanvas.width, processingCanvas.height)
    
    const processingTime = performance.now() - startTime
    
    return {
      darts: detections,
      processingTime,
      success: true
    }
  } catch (error) {
    console.error('Detection failed:', error)
    return {
      darts: [],
      processingTime: performance.now() - startTime,
      success: false
    }
  }
}

async function simulateDartDetection(imageData: ImageData, width: number, height: number): Promise<DartDetection[]> {
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
      className,
      bbox: [x - 10, y - 10, 20, 20] // Add bounding box for visualization
    })
  }

  return detections
}