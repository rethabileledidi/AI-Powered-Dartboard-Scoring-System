// Game configuration constants
export const GAME_TYPES = {
  FIVE_ZERO_ONE: '501',
  CRICKET: 'cricket',
  AROUND_THE_CLOCK: 'around_the_clock'
} as const;

export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;
export const MAX_THROWS_PER_TURN = 3;

// Dartboard configuration - Standard dartboard dimensions
export const DARTBOARD_CONFIG = {
  // Radius values as fractions of board size (0-1 where 1 is board edge)
  BULLSEYE_RADIUS: 0.03,           // Inner bullseye (50 points) - ~6.35mm radius
  OUTER_BULL_RADIUS: 0.06,        // Outer bullseye (25 points) - ~15.9mm radius
  TRIPLE_INNER_RADIUS: 0.27,      // Inner edge of triple ring - ~99mm radius
  TRIPLE_OUTER_RADIUS: 0.32,      // Outer edge of triple ring - ~107mm radius
  DOUBLE_INNER_RADIUS: 0.47,      // Inner edge of double ring - ~162mm radius
  DOUBLE_OUTER_RADIUS: 0.50,      // Outer edge of double ring (board edge) - ~170mm radius
  // Standard dartboard number sequence (clockwise from top)
  NUMBERS: [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]
};

// Detection configuration
export const DETECTION_CONFIG = {
  DARKNESS_THRESHOLD: 100,
  MIN_RADIUS: 5,
  MAX_RADIUS: 20,
  SCAN_STEP: 10,
  MIN_DARK_PIXEL_RATIO: 0.6
};

// Camera configuration
export const CAMERA_CONFIG = {
  IDEAL_WIDTH: 1280,
  IDEAL_HEIGHT: 720,
  FACING_MODE: 'environment'
};