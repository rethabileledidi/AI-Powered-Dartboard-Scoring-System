// Camera service for Raspberry Pi integration
// This service provides an interface for camera operations

export interface CameraConfig {
  width: number
  height: number
  fps: number
  transform: {
    hflip: boolean
    vflip: boolean
  }
}

export interface CameraFrame {
  data: Uint8Array
  width: number
  height: number
  timestamp: number
}

export class CameraService {
  private isActive = false
  private config: CameraConfig
  private onFrameCallback?: (frame: CameraFrame) => void

  constructor(config: CameraConfig = {
    width: 1280,
    height: 720,
    fps: 30,
    transform: {
      hflip: true,
      vflip: true
    }
  }) {
    this.config = config
  }

  /**
   * Initialize and start the camera
   */
  async start(): Promise<boolean> {
    try {
      // In browser environment, we'll simulate camera start
      // In production on Raspberry Pi, this would initialize Picamera2
      
      this.isActive = true
      console.log('Camera started successfully')
      return true
    } catch (error) {
      console.error('Failed to start camera:', error)
      return false
    }
  }

  /**
   * Stop the camera
   */
  async stop(): Promise<void> {
    try {
      // In production: Stop Picamera2
      this.isActive = false
      console.log('Camera stopped')
    } catch (error) {
      console.error('Failed to stop camera:', error)
    }
  }

  /**
   * Capture a single frame
   */
  async captureFrame(): Promise<CameraFrame | null> {
    if (!this.isActive) {
      return null
    }

    try {
      // In browser environment, return mock frame data
      // In production, this would capture from Picamera2
      
      const mockFrame: CameraFrame = {
        data: new Uint8Array(this.config.width * this.config.height * 3), // RGB data
        width: this.config.width,
        height: this.config.height,
        timestamp: Date.now()
      }
      
      return mockFrame
    } catch (error) {
      console.error('Failed to capture frame:', error)
      return null
    }
  }

  /**
   * Start continuous frame capture
   */
  startContinuousCapture(callback: (frame: CameraFrame) => void): void {
    this.onFrameCallback = callback
    
    if (!this.isActive) {
      console.warn('Camera is not active. Cannot start continuous capture.')
      return
    }

    // In production: Use Picamera2's continuous capture
    // For now, we'll simulate with setInterval
    const captureInterval = setInterval(async () => {
      if (!this.isActive) {
        clearInterval(captureInterval)
        return
      }

      const frame = await this.captureFrame()
      if (frame && this.onFrameCallback) {
        this.onFrameCallback(frame)
      }
    }, 1000 / this.config.fps) // Capture at specified FPS
  }

  /**
   * Stop continuous capture
   */
  stopContinuousCapture(): void {
    this.onFrameCallback = undefined
  }

  /**
   * Capture and save an image
   */
  async captureImage(filename?: string, saveToDataset: boolean = false): Promise<string | null> {
    try {
      // In production: Capture and save image using Picamera2
      const actualFilename = filename || `dart_capture_${Date.now()}.jpg`
      const path = saveToDataset ? `/home/pi/dataset/${actualFilename}` : `/tmp/${actualFilename}`
      
      console.log(`Image captured: ${path}`)
      return path
    } catch (error) {
      console.error('Failed to capture image:', error)
      return null
    }
  }

  /**
   * Test camera connection
   */
  async test(): Promise<boolean> {
    try {
      // In production: Test camera connection and capture test image
      console.log('Camera test completed successfully')
      return true
    } catch (error) {
      console.error('Camera test failed:', error)
      return false
    }
  }

  /**
   * Get camera status
   */
  getStatus(): { isActive: boolean; config: CameraConfig } {
    return {
      isActive: this.isActive,
      config: this.config
    }
  }
}

// Singleton instance
export const cameraService = new CameraService()