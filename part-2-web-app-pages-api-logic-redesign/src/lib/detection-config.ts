// Detection mode configuration
export type DetectionMode = 'demo' | 'cv' | 'ml'

export interface DetectionConfig {
  mode: DetectionMode
  cvEnabled: boolean
  mlEnabled: boolean
  demoEnabled: boolean
}

export class DetectionModeManager {
  private static instance: DetectionModeManager
  private config: DetectionConfig

  private constructor() {
    this.config = {
      mode: 'cv', // Default to CV mode for real computer vision
      cvEnabled: true,
      mlEnabled: false, // ML disabled by default since it requires training
      demoEnabled: false // Demo mode disabled
    }
  }

  static getInstance(): DetectionModeManager {
    if (!DetectionModeManager.instance) {
      DetectionModeManager.instance = new DetectionModeManager()
    }
    return DetectionModeManager.instance
  }

  setMode(mode: DetectionMode): void {
    this.config.mode = mode
  }

  getMode(): DetectionMode {
    return this.config.mode
  }

  getConfig(): DetectionConfig {
    return { ...this.config }
  }

  isCVEnabled(): boolean {
    return this.config.cvEnabled && this.config.mode === 'cv'
  }

  isMLEnabled(): boolean {
    return this.config.mlEnabled && this.config.mode === 'ml'
  }

  isDemoEnabled(): boolean {
    return this.config.demoEnabled && this.config.mode === 'demo'
  }

  getDetectionModule() {
    switch (this.config.mode) {
      case 'cv':
        return import('@/lib/detect-cv')
      case 'ml':
        return import('@/lib/detect-full') // Fallback to ML simulation
      case 'demo':
      default:
        return import('@/lib/detect-demo')
    }
  }
}

// Hook for React components
export function useDetectionMode() {
  const manager = DetectionModeManager.getInstance()
  return {
    mode: manager.getMode(),
    setMode: (mode: DetectionMode) => manager.setMode(mode),
    isCVEnabled: manager.isCVEnabled(),
    isMLEnabled: manager.isMLEnabled(),
    isDemoEnabled: manager.isDemoEnabled(),
    config: manager.getConfig()
  }
}