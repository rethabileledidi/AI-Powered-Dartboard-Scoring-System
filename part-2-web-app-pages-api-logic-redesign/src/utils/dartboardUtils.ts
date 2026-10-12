import { DARTBOARD_CONFIG } from '@/lib/constants';

export const calculateDistance = (x: number, y: number, centerX = 0.5, centerY = 0.5): number => {
  const dx = x - centerX;
  const dy = y - centerY;
  return Math.sqrt(dx * dx + dy * dy);
};

export const calculateAngle = (x: number, y: number, centerX = 0.5, centerY = 0.5): number => {
  const dx = x - centerX;
  const dy = y - centerY;
  let angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  return (angle + 90) % 360; // Adjust to match dartboard layout (20 at top)
};

export const getSegmentNumber = (angle: number): number => {
  const segmentAngle = 360 / 20;
  const segmentIndex = Math.floor(angle / segmentAngle);
  return DARTBOARD_CONFIG.NUMBERS[segmentIndex % 20];
};

export const getDartboardZone = (distance: number): 'bullseye' | 'outer_bull' | 'triple' | 'double' | 'single' | 'miss' => {
  if (distance <= DARTBOARD_CONFIG.BULLSEYE_RADIUS) return 'bullseye';        // 50 points
  if (distance <= DARTBOARD_CONFIG.OUTER_BULL_RADIUS) return 'outer_bull';    // 25 points
  if (distance >= DARTBOARD_CONFIG.TRIPLE_INNER_RADIUS && distance <= DARTBOARD_CONFIG.TRIPLE_OUTER_RADIUS) return 'triple';
  if (distance >= DARTBOARD_CONFIG.DOUBLE_INNER_RADIUS && distance <= DARTBOARD_CONFIG.DOUBLE_OUTER_RADIUS) return 'double';
  if (distance <= DARTBOARD_CONFIG.DOUBLE_OUTER_RADIUS) return 'single';        // Anywhere inside double ring
  return 'miss';
};

export const getGameDescription = (gameType: string): string => {
  switch (gameType) {
    case '501':
      return 'Start with 501 points. Reduce to exactly 0. Must finish with double or bullseye.';
    case 'cricket':
      return 'Hit numbers 15-20 and bullseye three times each. Score points after closing.';
    case 'around_the_clock':
      return 'Hit numbers 1-20 in sequence. First to complete the sequence wins.';
    default:
      return '';
  }
};

export const validatePlayerName = (name: string): boolean => {
  return name.trim().length > 0 && name.trim().length <= 20;
};

export const generatePlayerId = (index: number): string => {
  return `player_${index}_${Date.now()}`;
};