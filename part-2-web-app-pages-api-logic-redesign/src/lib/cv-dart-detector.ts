/**
 * Traditional Computer Vision Dart Detector
 * Uses OpenCV techniques without machine learning
 */

export interface CVDartDetection {
  x: number
  y: number
  score: number
  multiplier: number
  confidence: number
  className: string
  bbox?: [number, number, number, number]
}

export interface DartboardInfo {
  center: { x: number; y: number }
  radius: number
  innerBullRadius: number
  outerBullRadius: number
  tripleInnerRadius: number
  tripleOuterRadius: number
  doubleInnerRadius: number
  doubleOuterRadius: number
  detected: boolean
}

export class CVDartDetector {
  private dartboardInfo: DartboardInfo | null = null

  /**
   * Detect dartboard in the image
   */
  async detectDartboard(imageData: ImageData): Promise<DartboardInfo> {
    const width = imageData.width
    const height = imageData.height
    const data = imageData.data

    // Convert to grayscale for processing
    const gray = new Uint8Array(width * height)
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    }

    // Find circles using Hough Circle Detection (simplified)
    const circles = this.findCircles(gray, width, height)

    if (circles.length > 0) {
      // Find the largest circle (dartboard outer edge)
      const largestCircle = circles.reduce((prev, current) => 
        prev.radius > current.radius ? prev : current
      )

      // Calculate dartboard regions based on standard proportions
      const dartboardInfo: DartboardInfo = {
        center: { x: largestCircle.x, y: largestCircle.y },
        radius: largestCircle.radius,
        innerBullRadius: largestCircle.radius * 0.05,   // 5% of total radius
        outerBullRadius: largestCircle.radius * 0.1,   // 10% of total radius
        tripleInnerRadius: largestCircle.radius * 0.4,  // 40% of total radius
        tripleOuterRadius: largestCircle.radius * 0.45, // 45% of total radius
        doubleInnerRadius: largestCircle.radius * 0.6,  // 60% of total radius
        doubleOuterRadius: largestCircle.radius * 0.65, // 65% of total radius
        detected: true
      }

      this.dartboardInfo = dartboardInfo
      return dartboardInfo
    }

    // Fallback: assume dartboard is centered
    const fallbackInfo: DartboardInfo = {
      center: { x: width / 2, y: height / 2 },
      radius: Math.min(width, height) * 0.4,
      innerBullRadius: Math.min(width, height) * 0.02,
      outerBullRadius: Math.min(width, height) * 0.04,
      tripleInnerRadius: Math.min(width, height) * 0.16,
      tripleOuterRadius: Math.min(width, height) * 0.18,
      doubleInnerRadius: Math.min(width, height) * 0.24,
      doubleOuterRadius: Math.min(width, height) * 0.26,
      detected: false
    }

    this.dartboardInfo = fallbackInfo
    return fallbackInfo
  }

  /**
   * Find circles using simplified Hough Circle Detection
   */
  private findCircles(gray: Uint8Array, width: number, height: number): Array<{x: number, y: number, radius: number}> {
    const circles: Array<{x: number, y: number, radius: number}> = []
    
    // Edge detection (simplified Sobel)
    const edges = this.sobelEdgeDetection(gray, width, height)
    
    // Accumulator for Hough transform
    const accumulator: {[key: string]: number} = {}
    
    // Vote for circles
    for (let y = 0; y < height; y += 2) { // Skip pixels for performance
      for (let x = 0; x < width; x += 2) {
        if (edges[y * width + x] > 128) { // Edge pixel
          // Try different radii
          for (let r = 30; r <= Math.min(width, height) / 2; r += 10) {
            for (let theta = 0; theta < 360; theta += 10) {
              const centerX = Math.round(x + r * Math.cos(theta * Math.PI / 180))
              const centerY = Math.round(y + r * Math.sin(theta * Math.PI / 180))
              
              if (centerX >= 0 && centerX < width && centerY >= 0 && centerY < height) {
                const key = `${centerX},${centerY},${r}`
                accumulator[key] = (accumulator[key] || 0) + 1
              }
            }
          }
        }
      }
    }
    
    // Find circles with enough votes
    Object.entries(accumulator).forEach(([key, votes]) => {
      if (votes > 20) { // Threshold
        const [x, y, r] = key.split(',').map(Number)
        circles.push({ x, y, radius: r })
      }
    })
    
    return circles
  }

  /**
   * Sobel edge detection
   */
  private sobelEdgeDetection(gray: Uint8Array, width: number, height: number): Uint8Array {
    const edges = new Uint8Array(width * height)
    
    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let pixelX = 0
        let pixelY = 0
        
        // Apply Sobel kernels
        for (let j = -1; j <= 1; j++) {
          for (let i = -1; i <= 1; i++) {
            const idx = (y + j) * width + (x + i)
            const kernelIdx = (j + 1) * 3 + (i + 1)
            
            pixelX += gray[idx] * sobelX[kernelIdx]
            pixelY += gray[idx] * sobelY[kernelIdx]
          }
        }
        
        // Calculate gradient magnitude
        const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY)
        edges[y * width + x] = Math.min(255, magnitude)
      }
    }
    
    return edges
  }

  /**
   * Detect darts using contour analysis
   */
  async detectDarts(imageData: ImageData): Promise<CVDartDetection[]> {
    if (!this.dartboardInfo) {
      await this.detectDartboard(imageData)
    }

    const width = imageData.width
    const height = imageData.height
    const data = imageData.data

    // Convert to grayscale
    const gray = new Uint8Array(width * height)
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    }

    // Find dart-like objects using contour analysis
    const contours = this.findContours(gray, width, height)
    const detections: CVDartDetection[] = []

    contours.forEach(contour => {
      if (this.isValidDartContour(contour)) {
        const center = this.getContourCenter(contour)
        const detection = this.calculateDartScore(center.x, center.y)
        
        if (detection.score > 0) { // Only valid scores
          detections.push({
            ...detection,
            bbox: this.getContourBoundingBox(contour)
          })
        }
      }
    })

    return detections
  }

  /**
   * Find contours using simplified Moore boundary tracing
   */
  private findContours(gray: Uint8Array, width: number, height: number): Array<Array<{x: number, y: number}>> {
    const contours: Array<Array<{x: number, y: number}>> = []
    const visited = new Set<string>()
    
    // Threshold the image
    const threshold = 128
    const binary = new Uint8Array(width * height)
    for (let i = 0; i < gray.length; i++) {
      binary[i] = gray[i] > threshold ? 255 : 0
    }
    
    // Find contour starting points
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const key = `${x},${y}`
        
        if (binary[idx] > 0 && !visited.has(key)) {
          const contour = this.traceContour(binary, width, height, x, y, visited)
          if (contour.length > 10) { // Minimum contour size
            contours.push(contour)
          }
        }
      }
    }
    
    return contours
  }

  /**
   * Trace a single contour
   */
  private traceContour(binary: Uint8Array, width: number, height: number, startX: number, startY: number, visited: Set<string>): Array<{x: number, y: number}> {
    const contour: Array<{x: number, y: number}> = []
    const stack = [{x: startX, y: startY}]
    
    while (stack.length > 0) {
      const current = stack.pop()!
      const key = `${current.x},${current.y}`
      
      if (visited.has(key)) continue
      visited.add(key)
      
      contour.push(current)
      
      // Check 8-connected neighbors
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          
          const nx = current.x + dx
          const ny = current.y + dy
          const nkey = `${nx},${ny}`
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && 
              binary[ny * width + nx] > 0 && !visited.has(nkey)) {
            stack.push({x: nx, y: ny})
          }
        }
      }
    }
    
    return contour
  }

  /**
   * Check if contour is a valid dart
   */
  private isValidDartContour(contour: Array<{x: number, y: number}>): boolean {
    if (contour.length < 10 || contour.length > 100) return false
    
    // Calculate contour properties
    const area = this.calculateContourArea(contour)
    const perimeter = this.calculateContourPerimeter(contour)
    
    if (perimeter === 0) return false
    
    // Circularity (4π * Area / Perimeter²)
    const circularity = (4 * Math.PI * area) / (perimeter * perimeter)
    
    // Darts are typically somewhat circular/elongated
    return circularity > 0.3 && circularity < 0.9
  }

  /**
   * Calculate contour area using shoelace formula
   */
  private calculateContourArea(contour: Array<{x: number, y: number}>): number {
    let area = 0
    const n = contour.length
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      area += contour[i].x * contour[j].y
      area -= contour[j].x * contour[i].y
    }
    
    return Math.abs(area) / 2
  }

  /**
   * Calculate contour perimeter
   */
  private calculateContourPerimeter(contour: Array<{x: number, y: number}>): number {
    let perimeter = 0
    
    for (let i = 0; i < contour.length; i++) {
      const j = (i + 1) % contour.length
      const dx = contour[j].x - contour[i].x
      const dy = contour[j].y - contour[i].y
      perimeter += Math.sqrt(dx * dx + dy * dy)
    }
    
    return perimeter
  }

  /**
   * Get contour center
   */
  private getContourCenter(contour: Array<{x: number, y: number}>): {x: number, y: number} {
    let sumX = 0
    let sumY = 0
    
    contour.forEach(point => {
      sumX += point.x
      sumY += point.y
    })
    
    return {
      x: sumX / contour.length,
      y: sumY / contour.length
    }
  }

  /**
   * Get contour bounding box
   */
  private getContourBoundingBox(contour: Array<{x: number, y: number}>): [number, number, number, number] {
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    
    contour.forEach(point => {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    })
    
    return [minX, minY, maxX - minX, maxY - minY]
  }

  /**
   * Calculate dart score based on position
   */
  private calculateDartScore(x: number, y: number): CVDartDetection {
    if (!this.dartboardInfo) {
      return {
        x: x / 640, // Normalize
        y: y / 480, // Normalize
        score: 0,
        multiplier: 1,
        confidence: 0,
        className: 'miss'
      }
    }

    const board = this.dartboardInfo
    const dx = x - board.center.x
    const dy = y - board.center.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Check if dart is outside dartboard
    if (distance > board.radius) {
      return {
        x: x / 640,
        y: y / 480,
        score: 0,
        multiplier: 1,
        confidence: 0.5,
        className: 'miss'
      }
    }

    // Calculate angle for segment determination
    let angle = Math.atan2(dy, dx) + Math.PI // Convert to 0-2π
    angle = (angle + Math.PI / 20) % (2 * Math.PI) // Adjust for dartboard orientation
    
    const segment = Math.floor(angle / (2 * Math.PI / 20)) + 1
    const segmentNumber = segment > 20 ? 1 : segment

    let score = 0
    let multiplier = 1
    let className = 'miss'

    // Determine scoring region
    if (distance <= board.innerBullRadius) {
      // Inner bull (50 points)
      score = 50
      className = 'bullseye'
    } else if (distance <= board.outerBullRadius) {
      // Outer bull (25 points)
      score = 25
      className = 'outer_bull'
    } else if (distance >= board.tripleInnerRadius && distance <= board.tripleOuterRadius) {
      // Triple ring
      score = segmentNumber * 3
      multiplier = 3
      className = `triple_${segmentNumber}`
    } else if (distance >= board.doubleInnerRadius && distance <= board.doubleOuterRadius) {
      // Double ring
      score = segmentNumber * 2
      multiplier = 2
      className = `double_${segmentNumber}`
    } else if (distance <= board.radius) {
      // Single scoring area
      score = segmentNumber
      className = `single_${segmentNumber}`
    }

    // Calculate confidence based on how well-centered the detection is
    const confidence = Math.max(0.3, 1 - (distance / board.radius) * 0.5)

    return {
      x: x / 640, // Normalize to 0-1
      y: y / 480, // Normalize to 0-1
      score,
      multiplier,
      confidence,
      className
    }
  }
}

// Factory function
export function createCVDartDetector(): CVDartDetector {
  return new CVDartDetector()
}