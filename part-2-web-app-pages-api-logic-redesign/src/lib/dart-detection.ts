import { DetectedDart, DetectionResult, DartPosition, YOLO_CLASSES } from '@/lib/types';
import { DETECTION_CONFIG } from '@/lib/constants';
import { calculateDistance, calculateAngle, getSegmentNumber, getDartboardZone } from '@/utils/dartboardUtils';

interface YOLOModel {
  predict: (input: ImageData) => Promise<DetectionResult>;
  load: () => Promise<void>;
}

export class DartDetectionService {
  private model: YOLOModel | null = null;
  private isLoaded = false;
  private useYOLO = false; // Flag to toggle between YOLO and fallback detection

  async loadModel(): Promise<boolean> {
    try {
      console.log('Loading YOLO model...');
      
      // Try to load YOLO model first
      if (await this.loadYOLOModel()) {
        this.useYOLO = true;
        this.isLoaded = true;
        console.log('YOLO model loaded successfully');
        return true;
      }
      
      // Fallback to simulation mode
      console.log('YOLO model not available, using fallback detection');
      this.useYOLO = false;
      this.isLoaded = true;
      return true;
    } catch (error) {
      console.error('Error loading model:', error);
      this.useYOLO = false;
      this.isLoaded = true; // Still allow fallback detection
      return true;
    }
  }

  private async loadYOLOModel(): Promise<boolean> {
    try {
      // In a real implementation, this would load the actual YOLO model
      // For now, we'll simulate the loading process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if model files exist (in a real implementation)
      // This would involve checking for the .pt files in the weights directory
      const modelExists = await this.checkModelFiles();
      
      if (!modelExists) {
        console.warn('YOLO model files not found, using fallback detection');
        return false;
      }
      
      // Initialize YOLO model (placeholder for actual implementation)
      this.model = {
        predict: async (input: ImageData): Promise<DetectionResult> => {
          return await this.predictWithYOLO(input);
        },
        load: async (): Promise<void> => {
          // Load model weights and configuration
          console.log('Loading YOLO model weights...');
        }
      };
      
      await this.model.load();
      return true;
    } catch (error) {
      console.error('Failed to load YOLO model:', error);
      return false;
    }
  }

  private async checkModelFiles(): Promise<boolean> {
    // In a real implementation, this would check for the existence of model files
    // For now, we'll return false to simulate missing model files
    return false;
  }

  async detectDarts(imageData: ImageData): Promise<DetectionResult> {
    const startTime = performance.now();
    
    if (!this.isLoaded) {
      await this.loadModel();
    }

    try {
      let darts: DetectedDart[];
      
      if (this.useYOLO && this.model) {
        // Use YOLO model for detection
        const result = await this.model.predict(imageData);
        darts = result.darts;
      } else {
        // Use fallback detection
        darts = await this.simulateDetection(imageData);
      }
      
      const processingTime = performance.now() - startTime;
      
      return {
        darts,
        confidence: darts.length > 0 ? 0.85 : 0,
        processingTime
      };
    } catch (error) {
      console.error('Detection error:', error);
      return {
        darts: [],
        confidence: 0,
        processingTime: performance.now() - startTime
      };
    }
  }

  private async predictWithYOLO(imageData: ImageData): Promise<DetectionResult> {
    // This is a placeholder for actual YOLO prediction
    // In a real implementation, this would use the loaded YOLO model
    
    // Simulate YOLO detection with random results
    const mockDetections = this.generateMockYOLODetections();
    
    return {
      darts: mockDetections,
      confidence: 0.9,
      processingTime: 50 // Simulate faster processing with YOLO
    };
  }

  private generateMockYOLODetections(): DetectedDart[] {
    // Generate mock detections that match YOLO classes
    const detections: DetectedDart[] = [];
    const numDarts = Math.floor(Math.random() * 3) + 1; // 1-3 darts
    
    for (let i = 0; i < numDarts; i++) {
      // Random position within dartboard
      const x = 0.3 + Math.random() * 0.4; // 0.3-0.7
      const y = 0.3 + Math.random() * 0.4; // 0.3-0.7
      
      // Random YOLO class (0-56)
      const classId = Math.floor(Math.random() * 57);
      const yoloClass = YOLO_CLASSES[classId as keyof typeof YOLO_CLASSES];
      
      detections.push({
        position: {
          x,
          y,
          confidence: 0.8 + Math.random() * 0.2
        },
        zone: yoloClass.zone,
        score: yoloClass.score,
        multiplier: yoloClass.multiplier
      });
    }
    
    return detections;
  }

  private async simulateDetection(imageData: ImageData): Promise<DetectedDart[]> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    const detectedDarts: DetectedDart[] = [];

    // Scan for dark circular objects
    for (let y = DETECTION_CONFIG.MAX_RADIUS; y < imageData.height - DETECTION_CONFIG.MAX_RADIUS; y += DETECTION_CONFIG.SCAN_STEP) {
      for (let x = DETECTION_CONFIG.MAX_RADIUS; x < imageData.width - DETECTION_CONFIG.MAX_RADIUS; x += DETECTION_CONFIG.SCAN_STEP) {
        if (this.isDarkCircle(imageData, x, y, DETECTION_CONFIG.MIN_RADIUS, DETECTION_CONFIG.DARKNESS_THRESHOLD)) {
          const dartPosition: DartPosition = {
            x: x / imageData.width,
            y: y / imageData.height,
            confidence: 0.8
          };

          const detectedDart = this.mapPositionToScore(dartPosition);
          if (detectedDart) {
            detectedDarts.push(detectedDart);
          }
        }
      }
    }

    return detectedDarts.slice(0, 3); // Max 3 darts per throw
  }

  private isDarkCircle(imageData: ImageData, centerX: number, centerY: number, radius: number, threshold: number): boolean {
    const data = imageData.data;
    const width = imageData.width;
    let darkPixels = 0;
    let totalPixels = 0;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const x = centerX + dx;
          const y = centerY + dy;
          
          if (x >= 0 && x < width && y >= 0 && y < imageData.height) {
            const index = (y * width + x) * 4;
            const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
            
            if (brightness < threshold) {
              darkPixels++;
            }
            totalPixels++;
          }
        }
      }
    }

    return totalPixels > 0 && (darkPixels / totalPixels) > DETECTION_CONFIG.MIN_DARK_PIXEL_RATIO;
  }

  private mapPositionToScore(position: DartPosition): DetectedDart | null {
    const distance = calculateDistance(position.x, position.y);
    const angle = calculateAngle(position.x, position.y);
    const score = this.calculateScore(distance, angle);
    
    if (score) {
      return {
        position,
        zone: score.zone,
        score: score.finalScore,
        multiplier: score.multiplier
      };
    }
    
    return null;
  }

  private calculateScore(distance: number, angle: number): { zone: string; finalScore: number; multiplier: 'single' | 'double' | 'triple' | 'bullseye' | 'outer_bull' } | null {
    const zone = getDartboardZone(distance);
    
    if (zone === 'bullseye') {
      return { zone: 'bullseye', finalScore: 50, multiplier: 'bullseye' };
    } else if (zone === 'outer_bull') {
      return { zone: 'outer_bull', finalScore: 25, multiplier: 'outer_bull' };
    } else if (zone === 'miss') {
      return { zone: 'miss', finalScore: 0, multiplier: 'single' };
    }
    
    const number = getSegmentNumber(angle);
    
    switch (zone) {
      case 'triple':
        return { zone: `triple_${number}`, finalScore: number * 3, multiplier: 'triple' };
      case 'double':
        return { zone: `double_${number}`, finalScore: number * 2, multiplier: 'double' };
      case 'single':
        return { zone: `single_${number}`, finalScore: number, multiplier: 'single' };
      default:
        return null;
    }
  }

  isModelLoaded(): boolean {
    return this.isLoaded;
  }

  isUsingYOLO(): boolean {
    return this.useYOLO;
  }

  getDetectionMode(): string {
    return this.useYOLO ? 'YOLO Model' : 'Fallback Detection';
  }
}

export const dartDetectionService = new DartDetectionService();