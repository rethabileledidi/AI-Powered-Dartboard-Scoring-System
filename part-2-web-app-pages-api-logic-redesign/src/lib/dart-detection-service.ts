import { cameraService, CameraFrame } from './camera-service'
import { dartDetectionService as newDartDetectionService } from './dart-detection'
import { DetectedDart, DetectionResult as NewDetectionResult } from './types'

export interface DetectionResult {
  darts: DetectedDart[]
  frameProcessed: boolean
  processingTime: number
  timestamp: number
}

export interface DetectionConfig {
  enableEdgeDetection: boolean
  edgeThreshold: number
  minConfidence: number
  maxDarts: number
  enableRealTime: boolean
  fps: number
}

export class DartDetectionService {
  private isDetecting = false
  private onDetectionCallback?: (result: DetectionResult) => void
  private config: DetectionConfig
  private detectionInterval?: NodeJS.Timeout

  constructor(config: DetectionConfig = {
    enableEdgeDetection: true,
    edgeThreshold: 100,
    minConfidence: 0.3,
    maxDarts: 10,
    enableRealTime: false,
    fps: 2
  }) {
    this.config = config
  }

  /**
   * Initialize the dart detection service
   */
  async initialize(): Promise<boolean> {
    try {
      // Initialize the new dart detection service
      const modelLoaded = await newDartDetectionService.loadModel()
      if (!modelLoaded) {
        console.warn('Failed to load dart detection model, but service will continue')
      }
      
      // Test camera connection
      const cameraTest = await cameraService.test()
      if (!cameraTest) {
        console.warn('Camera test failed, but detection service will continue')
      }
      
      console.log('Dart detection service initialized successfully')
      return true
    } catch (error) {
      console.error('Failed to initialize dart detection service:', error)
      return false
    }
  }

  /**
   * Start dart detection
   */
  async startDetection(): Promise<boolean> {
    try {
      // Start camera if not already active
      if (!cameraService.getStatus().isActive) {
        const cameraStarted = await cameraService.start()
        if (!cameraStarted) {
          console.error('Failed to start camera')
          return false
        }
      }

      this.isDetecting = true

      if (this.config.enableRealTime) {
        // Start real-time detection
        this.startRealTimeDetection()
      }

      console.log('Dart detection started')
      return true
    } catch (error) {
      console.error('Failed to start dart detection:', error)
      return false
    }
  }

  /**
   * Stop dart detection
   */
  async stopDetection(): Promise<void> {
    try {
      this.isDetecting = false

      // Stop real-time detection if running
      if (this.detectionInterval) {
        clearInterval(this.detectionInterval)
        this.detectionInterval = undefined
      }

      // Stop camera
      await cameraService.stop()

      console.log('Dart detection stopped')
    } catch (error) {
      console.error('Failed to stop dart detection:', error)
    }
  }

  /**
   * Start real-time dart detection
   */
  private startRealTimeDetection(): void {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval)
    }

    this.detectionInterval = setInterval(async () => {
      if (!this.isDetecting) {
        return
      }

      const result = await this.detectDarts()
      if (result && this.onDetectionCallback) {
        this.onDetectionCallback(result)
      }
    }, 1000 / this.config.fps)
  }

  /**
   * Perform single dart detection
   */
  async detectDarts(): Promise<DetectionResult | null> {
    if (!this.isDetecting) {
      return null
    }

    const startTime = performance.now()
    
    try {
      // Capture frame from camera
      const frame = await cameraService.captureFrame()
      if (!frame) {
        console.warn('Failed to capture frame from camera')
        return null
      }

      // Convert frame to ImageData for detection
      const imageData = this.createImageDataFromFrame(frame)
      
      // Detect darts using new service
      const detectionResult: NewDetectionResult = await newDartDetectionService.detectDarts(imageData)

      const processingTime = performance.now() - startTime

      const result: DetectionResult = {
        darts: detectionResult.darts,
        frameProcessed: true,
        processingTime,
        timestamp: Date.now()
      }

      return result
    } catch (error) {
      console.error('Error during dart detection:', error)
      return null
    }
  }

  /**
   * Create ImageData from camera frame
   */
  private createImageDataFromFrame(frame: CameraFrame): ImageData {
    // Create canvas to convert frame data
    const canvas = document.createElement('canvas')
    canvas.width = frame.width
    canvas.height = frame.height
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      // Create ImageData from frame data
      const imageData = ctx.createImageData(frame.width, frame.height)
      imageData.data.set(frame.data)
      return imageData
    }
    
    // Fallback: create empty ImageData
    return new ImageData(frame.width, frame.height)
  }

  /**
   * Set detection callback
   */
  setDetectionCallback(callback: (result: DetectionResult) => void): void {
    this.onDetectionCallback = callback
  }

  /**
   * Capture and save current frame
   */
  async captureFrame(filename?: string, saveToDataset: boolean = false): Promise<string | null> {
    return await cameraService.captureImage(filename, saveToDataset)
  }

  /**
   * Get detection status
   */
  getStatus(): { isDetecting: boolean; config: DetectionConfig } {
    return {
      isDetecting: this.isDetecting,
      config: this.config
    }
  }

  /**
   * Update detection configuration
   */
  updateConfig(newConfig: Partial<DetectionConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart real-time detection if enabled and running
    if (this.config.enableRealTime && this.isDetecting) {
      if (this.detectionInterval) {
        clearInterval(this.detectionInterval)
      }
      this.startRealTimeDetection()
    }
  }
}

// Singleton instance
export const dartDetectionService = new DartDetectionService()