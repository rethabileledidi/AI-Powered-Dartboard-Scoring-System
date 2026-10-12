// Demo detection module - simulates dart detection for testing
import { DartDetection } from './dart-detection-pc'

export interface DetectionResult {
  darts: DartDetection[]
  processingTime: number
  success: boolean
}

export async function detectFromCanvas(canvas: HTMLCanvasElement | HTMLImageElement): Promise<DetectionResult> {
  const startTime = performance.now()
  
  try {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Simulate finding 1-3 darts in realistic positions
    const numDarts = Math.floor(Math.random() * 3) + 1
    const detections: DartDetection[] = []

    for (let i = 0; i < numDarts; i++) {
      // Generate realistic dart positions
      const detection = generateRealisticDartDetection()
      detections.push(detection)
    }
    
    const processingTime = performance.now() - startTime
    
    return {
      darts: detections,
      processingTime,
      success: true
    }
  } catch (error) {
    console.error('Demo detection failed:', error)
    return {
      darts: [],
      processingTime: performance.now() - startTime,
      success: false
    }
  }
}

function generateRealisticDartDetection(): DartDetection {
  // Generate positions that are more realistic for dart throws
  const centerX = 0.5
  const centerY = 0.5
  
  // Most darts land in the scoring area with some randomness
  const angle = Math.random() * 2 * Math.PI
  const distance = Math.random() * 0.3 + 0.1 // Mostly in scoring area
  
  const x = centerX + Math.cos(angle) * distance
  const y = centerY + Math.sin(angle) * distance
  
  // Calculate score based on position
  const pixelDistance = distance * 200 // Convert to pixel coordinates
  let score = 0
  let multiplier = 1
  let className = 'miss'
  
  if (pixelDistance < 20) {
    // Bullseye
    score = 50
    className = 'bullseye'
  } else if (pixelDistance < 40) {
    // Outer bull
    score = 25
    className = 'outer_bull'
  } else if (pixelDistance > 80 && pixelDistance < 90) {
    // Triple ring
    const segment = Math.floor(Math.random() * 20) + 1
    score = segment * 3
    multiplier = 3
    className = `triple_${segment}`
  } else if (pixelDistance > 120 && pixelDistance < 130) {
    // Double ring
    const segment = Math.floor(Math.random() * 20) + 1
    score = segment * 2
    multiplier = 2
    className = `double_${segment}`
  } else if (pixelDistance < 160) {
    // Single scoring area
    const segment = Math.floor(Math.random() * 20) + 1
    score = segment
    className = `single_${segment}`
  }
  
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
    score,
    multiplier,
    confidence: 0.7 + Math.random() * 0.3, // High confidence for demo
    className,
    bbox: [
      x * 640 - 15, // Convert to pixel coordinates
      y * 480 - 15,
      30,
      30
    ]
  }
}