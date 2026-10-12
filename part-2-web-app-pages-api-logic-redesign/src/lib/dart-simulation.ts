/**
 * Dart Simulation Utility
 * Generates realistic dart positions and scores for gameplay simulation
 */

export interface SimulatedDart {
  x: number
  y: number
  score: number
  multiplier: number
  segment: string
  confidence: number
}

export interface SimulationConfig {
  skillLevel: 'beginner' | 'intermediate' | 'expert'
  targetZone?: 'bullseye' | 'triple' | 'double' | 'single' | 'random'
  dartsPerTurn: number
}

/**
 * Generate simulated dart detection results
 */
export function simulateDartDetection(config: SimulationConfig): SimulatedDart[] {
  const darts: SimulatedDart[] = []
  
  for (let i = 0; i < config.dartsPerTurn; i++) {
    darts.push(generateSingleDart(config))
  }
  
  return darts
}

/**
 * Generate a single simulated dart
 */
function generateSingleDart(config: SimulationConfig): SimulatedDart {
  const { skillLevel, targetZone = 'random' } = config
  
  // Base accuracy based on skill level
  const accuracyMap = {
    beginner: 0.6,
    intermediate: 0.8,
    expert: 0.95
  }
  
  const accuracy = accuracyMap[skillLevel]
  
  // Generate position based on target zone
  const position = generatePosition(targetZone, accuracy)
  
  // Calculate score and segment based on position
  const scoreInfo = calculateScoreFromPosition(position.x, position.y)
  
  return {
    x: position.x,
    y: position.y,
    score: scoreInfo.score,
    multiplier: scoreInfo.multiplier,
    segment: scoreInfo.segment,
    confidence: 0.91 + Math.random() * 0.06 // 91-97% confidence, centered around 94%
  }
}

/**
 * Generate dart position based on target zone and accuracy
 */
function generatePosition(targetZone: string, accuracy: number): { x: number, y: number } {
  const centerX = 0.5
  const centerY = 0.5
  
  switch (targetZone) {
    case 'bullseye':
      // Target inner bullseye (50 points)
      return generateAroundPoint(centerX, centerY, 0.02, accuracy)
    
    case 'triple':
      // Triple ring is between 0.27 and 0.32 radius from center
      const angle = Math.random() * 2 * Math.PI
      const tripleRadius = 0.295 // Middle of triple ring
      const targetX = centerX + Math.cos(angle) * tripleRadius
      const targetY = centerY + Math.sin(angle) * tripleRadius
      return generateAroundPoint(targetX, targetY, 0.02, accuracy)
    
    case 'double':
      // Double ring is between 0.47 and 0.50 radius from center
      const doubleAngle = Math.random() * 2 * Math.PI
      const doubleRadius = 0.485 // Middle of double ring
      const doubleTargetX = centerX + Math.cos(doubleAngle) * doubleRadius
      const doubleTargetY = centerY + Math.sin(doubleAngle) * doubleRadius
      return generateAroundPoint(doubleTargetX, doubleTargetY, 0.02, accuracy)
    
    case 'single':
      // Single scoring area (between outer bull and triple ring)
      const singleAngle = Math.random() * 2 * Math.PI
      const singleRadius = 0.15 + Math.random() * 0.10 // 0.15-0.25 (avoiding bullseye and triple)
      const singleTargetX = centerX + Math.cos(singleAngle) * singleRadius
      const singleTargetY = centerY + Math.sin(singleAngle) * singleRadius
      return generateAroundPoint(singleTargetX, singleTargetY, 0.03, accuracy)
    
    default: // random
      const randomAngle = Math.random() * 2 * Math.PI
      const randomRadius = Math.random() * 0.49 // Keep within board
      const randomTargetX = centerX + Math.cos(randomAngle) * randomRadius
      const randomTargetY = centerY + Math.sin(randomAngle) * randomRadius
      return generateAroundPoint(randomTargetX, randomTargetY, 0.04, accuracy)
  }
}

/**
 * Generate position around a target point with accuracy-based spread
 */
function generateAroundPoint(targetX: number, targetY: number, maxSpread: number, accuracy: number): { x: number, y: number } {
  const spread = maxSpread * (1 - accuracy)
  const angle = Math.random() * 2 * Math.PI
  const distance = Math.random() * spread
  
  const x = Math.max(0.02, Math.min(0.98, targetX + Math.cos(angle) * distance))
  const y = Math.max(0.02, Math.min(0.98, targetY + Math.sin(angle) * distance))
  
  return { x, y }
}

/**
 * Calculate score and segment from position - Standard dartboard scoring
 */
function calculateScoreFromPosition(x: number, y: number): { score: number, multiplier: number, segment: string } {
  const centerX = 0.5
  const centerY = 0.5
  const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2))
  
  // Bullseye zones (50 and 25 points)
  if (distance <= 0.03) { // Inner bullseye
    return { score: 50, multiplier: 1, segment: 'bullseye' }
  }
  if (distance <= 0.06) { // Outer bullseye
    return { score: 25, multiplier: 1, segment: 'outer_bull' }
  }
  
  // Miss (outside the double ring)
  if (distance > 0.50) {
    return { score: 0, multiplier: 1, segment: 'miss' }
  }
  
  // Calculate angle for number determination
  const angle = Math.atan2(y - centerY, x - centerX)
  const degrees = (angle * 180 / Math.PI + 360 + 9) % 360 // Offset by 9 degrees for dartboard orientation (20 at top)
  const segmentIndex = Math.floor(degrees / 18) // 360/20 = 18 degrees per segment
  
  // Standard dartboard numbers in clockwise order starting from top (20)
  const dartboardNumbers = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]
  const number = dartboardNumbers[segmentIndex]
  
  // Determine multiplier based on distance zones
  if (distance >= 0.47 && distance <= 0.50) {
    // Double ring (outer ring)
    return { score: number * 2, multiplier: 2, segment: `double_${number}` }
  } else if (distance >= 0.27 && distance <= 0.32) {
    // Triple ring (inner ring)
    return { score: number * 3, multiplier: 3, segment: `triple_${number}` }
  } else if (distance <= 0.50) {
    // Single scoring area
    return { score: number, multiplier: 1, segment: `single_${number}` }
  }
  
  // Fallback for any edge cases
  return { score: 0, multiplier: 1, segment: 'miss' }
}

/**
 * Get player skill level based on game progress
 */
export function getPlayerSkillLevel(currentScore: number, startingScore: number): 'beginner' | 'intermediate' | 'expert' {
  const progress = 1 - (currentScore / startingScore)
  
  if (progress < 0.3) return 'beginner'
  if (progress < 0.7) return 'intermediate'
  return 'expert'
}

/**
 * Get appropriate target zone based on remaining score (for 501/301 games)
 */
export function getTargetZoneForScore(remainingScore: number): 'bullseye' | 'triple' | 'double' | 'single' | 'random' {
  if (remainingScore <= 50) return 'double' // Need double to finish
  if (remainingScore <= 100) return 'triple' // High scoring needed
  if (remainingScore <= 200) return 'single' // Consistent scoring
  return 'random' // Early game, mix of targets
}