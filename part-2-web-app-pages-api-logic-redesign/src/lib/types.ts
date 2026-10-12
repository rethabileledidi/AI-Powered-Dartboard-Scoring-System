export interface DartPosition {
  x: number;
  y: number;
  confidence: number;
}

export interface DetectedDart {
  position: DartPosition;
  zone: string;
  score: number;
  multiplier: 'single' | 'double' | 'triple' | 'bullseye' | 'outer_bull';
}

// Database Player interface
export interface Player {
  id: string;
  name: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    games: number;
    throws: number;
  };
}

// Game Player interface (for game logic)
export interface GamePlayer {
  id: string;
  name: string;
  score: number;
  throws: DetectedDart[];
  currentTurn: boolean;
}

export interface GameState {
  gameType: 'cricket' | '501' | 'around_the_clock';
  players: GamePlayer[];
  currentPlayerIndex: number;
  currentThrow: number; // 1-3
  gameStarted: boolean;
  gameEnded: boolean;
  winner?: string;
}

export interface CricketScore {
  [key: number]: number; // number -> hits count
}

export interface CameraState {
  isActive: boolean;
  stream?: MediaStream;
  error?: string;
}

export interface DetectionResult {
  darts: DetectedDart[];
  confidence: number;
  processingTime: number;
}

// YOLO class mapping based on the uploaded model
export const YOLO_CLASSES = {
  0: { zone: 'bullseye', score: 50, multiplier: 'bullseye' as const },
  1: { zone: 'double_1', score: 1, multiplier: 'double' as const },
  2: { zone: 'double_10', score: 10, multiplier: 'double' as const },
  3: { zone: 'double_11', score: 11, multiplier: 'double' as const },
  4: { zone: 'double_12', score: 12, multiplier: 'double' as const },
  5: { zone: 'double_13', score: 13, multiplier: 'double' as const },
  6: { zone: 'double_14', score: 14, multiplier: 'double' as const },
  7: { zone: 'double_15', score: 15, multiplier: 'double' as const },
  8: { zone: 'double_16', score: 16, multiplier: 'double' as const },
  9: { zone: 'double_17', score: 17, multiplier: 'double' as const },
  10: { zone: 'double_18', score: 18, multiplier: 'double' as const },
  11: { zone: 'double_19', score: 19, multiplier: 'double' as const },
  12: { zone: 'double_2', score: 2, multiplier: 'double' as const },
  13: { zone: 'double_20', score: 20, multiplier: 'double' as const },
  14: { zone: 'double_3', score: 3, multiplier: 'double' as const },
  15: { zone: 'double_4', score: 4, multiplier: 'double' as const },
  16: { zone: 'double_5', score: 5, multiplier: 'double' as const },
  17: { zone: 'double_6', score: 6, multiplier: 'double' as const },
  18: { zone: 'double_7', score: 7, multiplier: 'double' as const },
  19: { zone: 'double_8', score: 8, multiplier: 'double' as const },
  20: { zone: 'double_9', score: 9, multiplier: 'double' as const },
  21: { zone: 'miss', score: 0, multiplier: 'single' as const },
  22: { zone: 'single_1', score: 1, multiplier: 'single' as const },
  23: { zone: 'single_10', score: 10, multiplier: 'single' as const },
  24: { zone: 'single_11', score: 11, multiplier: 'single' as const },
  25: { zone: 'single_12', score: 12, multiplier: 'single' as const },
  26: { zone: 'single_13', score: 13, multiplier: 'single' as const },
  27: { zone: 'single_14', score: 14, multiplier: 'single' as const },
  28: { zone: 'single_15', score: 15, multiplier: 'single' as const },
  29: { zone: 'single_16', score: 16, multiplier: 'single' as const },
  30: { zone: 'single_17', score: 17, multiplier: 'single' as const },
  31: { zone: 'single_18', score: 18, multiplier: 'single' as const },
  32: { zone: 'single_20', score: 20, multiplier: 'single' as const },
  33: { zone: 'single_3', score: 3, multiplier: 'single' as const },
  34: { zone: 'single_4', score: 4, multiplier: 'single' as const },
  35: { zone: 'single_5', score: 5, multiplier: 'single' as const },
  36: { zone: 'single_6', score: 6, multiplier: 'single' as const },
  37: { zone: 'single_7', score: 7, multiplier: 'single' as const },
  38: { zone: 'single_8', score: 8, multiplier: 'single' as const },
  39: { zone: 'single_9', score: 9, multiplier: 'single' as const },
  40: { zone: 'triple_double_19', score: 19, multiplier: 'double' as const },
  41: { zone: 'triple_1', score: 1, multiplier: 'triple' as const },
  42: { zone: 'triple_12', score: 12, multiplier: 'triple' as const },
  43: { zone: 'triple_13', score: 13, multiplier: 'triple' as const },
  44: { zone: 'triple_15', score: 15, multiplier: 'triple' as const },
  45: { zone: 'triple_16', score: 16, multiplier: 'triple' as const },
  46: { zone: 'triple_17', score: 17, multiplier: 'triple' as const },
  47: { zone: 'triple_18', score: 18, multiplier: 'triple' as const },
  48: { zone: 'triple_19', score: 19, multiplier: 'triple' as const },
  49: { zone: 'triple_2', score: 2, multiplier: 'triple' as const },
  50: { zone: 'triple_20', score: 20, multiplier: 'triple' as const },
  51: { zone: 'triple_3', score: 3, multiplier: 'triple' as const },
  52: { zone: 'triple_5', score: 5, multiplier: 'triple' as const },
  53: { zone: 'triple_6', score: 6, multiplier: 'triple' as const },
  54: { zone: 'triple_7', score: 7, multiplier: 'triple' as const },
  55: { zone: 'triple_8', score: 8, multiplier: 'triple' as const },
  56: { zone: 'triple_9', score: 9, multiplier: 'triple' as const }
} as const;