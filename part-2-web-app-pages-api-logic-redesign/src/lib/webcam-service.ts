'use client'

export interface WebcamService {
  startCamera(): Promise<MediaStream | null>
  stopCamera(): void
  captureFrame(): HTMLCanvasElement | null
  isSupported(): boolean
  getVideoElement(): HTMLVideoElement | null
}

class PCWebcamService implements WebcamService {
  private stream: MediaStream | null = null
  private videoElement: HTMLVideoElement | null = null
  private isInitialized = false

  constructor() {
    // Only access document in browser environment
    if (typeof document !== 'undefined') {
      this.videoElement = document.createElement('video')
      this.videoElement.autoplay = true
      this.videoElement.muted = true
      this.videoElement.playsInline = true
      this.videoElement.style.display = 'none'
      document.body.appendChild(this.videoElement)
    }
  }

  isSupported(): boolean {
    // Only check in browser environment
    if (typeof navigator === 'undefined') {
      return false
    }
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }

  async startCamera(): Promise<MediaStream | null> {
    if (!this.isSupported()) {
      throw new Error('WebRTC is not supported in this browser')
    }

    try {
      console.log('Requesting camera access...')
      
      // Request access to the webcam with specific constraints for Chrome
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'environment',
          frameRate: { ideal: 30 }
        },
        audio: false
      })

      console.log('Camera access granted, setting up video element...')

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream
        
        // Wait for video to be ready and playing
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video element timeout'))
          }, 10000)

          this.videoElement!.onloadedmetadata = () => {
            clearTimeout(timeout)
            this.videoElement!.play().then(resolve).catch(reject)
          }
          
          this.videoElement!.onerror = () => {
            clearTimeout(timeout)
            reject(new Error('Video element error'))
          }
        })

        this.isInitialized = true
        console.log('Camera initialized successfully')
        return this.stream
      }
    } catch (error) {
      console.error('Error accessing webcam:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to access webcam'
      
      if (errorMessage.includes('NotAllowedError')) {
        throw new Error('Camera access denied. Please allow camera permissions and refresh the page.')
      } else if (errorMessage.includes('NotFoundError')) {
        throw new Error('No camera found. Please connect a camera and try again.')
      } else {
        throw new Error(`Failed to access webcam: ${errorMessage}`)
      }
    }
    
    return null
  }

  stopCamera(): void {
    console.log('Stopping camera...')
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop()
        console.log(`Stopped track: ${track.kind}`)
      })
      this.stream = null
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null
      this.videoElement.pause()
    }
    
    this.isInitialized = false
    console.log('Camera stopped')
  }

  captureFrame(): HTMLCanvasElement | null {
    if (!this.videoElement || !this.isInitialized || this.videoElement.readyState < 2) {
      console.warn('Video element not ready for capture')
      return null
    }

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    
    if (!context) {
      console.error('Failed to get canvas context')
      return null
    }

    // Set canvas dimensions to match video
    canvas.width = this.videoElement.videoWidth
    canvas.height = this.videoElement.videoHeight

    console.log(`Capturing frame: ${canvas.width}x${canvas.height}`)

    // Draw the current video frame to canvas
    context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height)

    return canvas
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement
  }

  isReady(): boolean {
    return this.isInitialized && this.videoElement !== null && this.videoElement.readyState >= 2
  }
}

// Factory function to create webcam service
export function createWebcamService(): WebcamService {
  return new PCWebcamService()
}

// Hook for React components
export function useWebcam() {
  const webcamService = createWebcamService()
  
  return {
    startCamera: () => webcamService.startCamera(),
    stopCamera: () => webcamService.stopCamera(),
    captureFrame: () => webcamService.captureFrame(),
    isSupported: () => webcamService.isSupported(),
    getVideoElement: () => webcamService.getVideoElement(),
    isReady: () => (webcamService as any).isReady?.() || false
  }
}