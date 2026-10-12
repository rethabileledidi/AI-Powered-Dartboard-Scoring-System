/**
 * Standard Dartboard Scoring Utilities
 * Implements official dartboard scoring rules and calculations
 */

import { DARTBOARD_CONFIG } from './constants'

export interface DartPosition {
  x: number
  y: number
}

export interface ScoreResult {
  score: number
  multiplier: number
  segment: string
  zone: string
  isValid: boolean
}

export interface GameScore {
  totalScore: number
  darts: ScoreResult[]
  isBust: boolean
  isWinner: boolean
  remainingScore: number
  message: string
}

/**
 * Calculate score from dart position using standard dartboard rules
 */
export function calculateDartScore(position: DartPosition): ScoreResult {
  const { x, y } = position
  
  // Calculate distance from center (0.5, 0.5)
  const distance = Math.sqrt(Math.pow(x - 0.5, 2) + Math.pow(y - 0.5, 2))
  
  // Check if dart is outside the board
  if (distance > DARTBOARD_CONFIG.DOUBLE_OUTER_RADIUS) {
    return {
      score: 0,
      multiplier: 1,
      segment: 'miss',
      zone: 'miss',
      isValid: false
    }
  }
  
  // Calculate angle for segment determination
  const angle = Math.atan2(y - 0.5, x - 0.5)
  const degrees = (angle * 180 / Math.PI + 360 + 9) % 360 // Offset for dartboard orientation
  const segmentIndex = Math.floor(degrees / 18) // 20 segments, 18 degrees each
  
  // Get the number for this segment
  const segmentNumber = DARTBOARD_CONFIG.NUMBERS[segmentIndex]
  
  // Determine zone and calculate score
  if (distance <= DARTBOARD_CONFIG.BULLSEYE_RADIUS) {
    // Inner bullseye (50 points)
    return {
      score: 50,
      multiplier: 1,
      segment: 'bullseye',
      zone: 'bullseye',
      isValid: true
    }
  } else if (distance <= DARTBOARD_CONFIG.OUTER_BULL_RADIUS) {
    // Outer bullseye (25 points)
    return {
      score: 25,
      multiplier: 1,
      segment: 'outer_bull',
      zone: 'outer_bull',
      isValid: true
    }
  } else if (distance >= DARTBOARD_CONFIG.TRIPLE_INNER_RADIUS && 
             distance <= DARTBOARD_CONFIG.TRIPLE_OUTER_RADIUS) {
    // Triple ring
    const score = segmentNumber * 3
    return {
      score,
      multiplier: 3,
      segment: `triple_${segmentNumber}`,
      zone: 'triple',
      isValid: true
    }
  } else if (distance >= DARTBOARD_CONFIG.DOUBLE_INNER_RADIUS && 
             distance <= DARTBOARD_CONFIG.DOUBLE_OUTER_RADIUS) {
    // Double ring
    const score = segmentNumber * 2
    return {
      score,
      multiplier: 2,
      segment: `double_${segmentNumber}`,
      zone: 'double',
      isValid: true
    }
  } else {
    // Single scoring area
    return {
      score: segmentNumber,
      multiplier: 1,
      segment: `single_${segmentNumber}`,
      zone: 'single',
      isValid: true
    }
  }
}

/**
 * Calculate 501 game score with proper bust rules
 */
export function calculate501Score(
  currentScore: number,
  dartScores: ScoreResult[]
): GameScore {
  const totalScore = dartScores.reduce((sum, dart) => sum + dart.score, 0)
  const potentialScore = currentScore - totalScore
  
  // Check for bust conditions
  if (potentialScore < 0) {
    return {
      totalScore,
      darts: dartScores,
      isBust: true,
      isWinner: false,
      remainingScore: currentScore,
      message: `Bust! Score went below zero. Remaining: ${currentScore}`
    }
  }
  
  if (potentialScore === 1) {
    return {
      totalScore,
      darts: dartScores,
      isBust: true,
      isWinner: false,
      remainingScore: currentScore,
      message: `Bust! Cannot finish with 1 point. Remaining: ${currentScore}`
    }
  }
  
  // Check for winning condition (must finish with double or bullseye)
  if (potentialScore === 0) {
    const lastDart = dartScores[dartScores.length - 1]
    const isValidFinish = lastDart && (
      lastDart.multiplier === 2 || 
      lastDart.segment === 'bullseye'
    )
    
    if (!isValidFinish) {
      return {
        totalScore,
        darts: dartScores,
        isBust: true,
        isWinner: false,
        remainingScore: currentScore,
        message: `Bust! Must finish with double or bullseye. Remaining: ${currentScore}`
      }
    }
    
    return {
      totalScore,
      darts: dartScores,
      isBust: false,
      isWinner: true,
      remainingScore: 0,
      message: `🎉 Winner! Finished with ${lastDart.segment}`
    }
  }
  
  // Normal scoring
  return {
    totalScore,
    darts: dartScores,
    isBust: false,
    isWinner: false,
    remainingScore: potentialScore,
    message: `Scored ${totalScore}. Remaining: ${potentialScore}`
  }
}

/**
 * Calculate Cricket game score
 */
export function calculateCricketScore(
  currentMarks: Record<number, number>,
  dartScores: ScoreResult[]
): { marks: Record<number, number>; points: number } {
  const newMarks = { ...currentMarks }
  let points = 0
  
  const cricketNumbers = [15, 16, 17, 18, 19, 20, 25] // 25 = bullseye
  
  dartScores.forEach(dart => {
    const number = getNumberFromSegment(dart.segment)
    if (cricketNumbers.includes(number)) {
      newMarks[number] = Math.min(newMarks[number] + dart.multiplier, 3)
      
      // Calculate points if this number is closed (3 marks)
      if (newMarks[number] >= 3) {
        const excessMarks = newMarks[number] - 3
        points += number * excessMarks
      }
    }
  })
  
  return { marks: newMarks, points }
}

/**
 * Get segment number from segment string
 */
export function getNumberFromSegment(segment: string): number {
  if (segment === 'bullseye' || segment === 'outer_bull') {
    return 25
  }
  
  const match = segment.match(/(?:single|double|triple)_(\d+)/)
  if (match) {
    return parseInt(match[1])
  }
  
  return 0
}

/**
 * Check if a throw is a valid finish for 501
 */
export function isValidFinish(
  remainingScore: number,
  dartScore: ScoreResult
): boolean {
  if (remainingScore - dartScore.score !== 0) {
    return false
  }
  
  // Must finish with double or bullseye
  return dartScore.multiplier === 2 || dartScore.segment === 'bullseye'
}

/**
 * Calculate average score and statistics
 */
export function calculateScoreStats(scores: number[]): {
  average: number
  highest: number
  lowest: number
  total: number
  count: number
} {
  if (scores.length === 0) {
    return {
      average: 0,
      highest: 0,
      lowest: 0,
      total: 0,
      count: 0
    }
  }
  
  const total = scores.reduce((sum, score) => sum + score, 0)
  const average = total / scores.length
  const highest = Math.max(...scores)
  const lowest = Math.min(...scores)
  
  return {
    average: Number(average.toFixed(2)),
    highest,
    lowest,
    total,
    count: scores.length
  }
}

/**
 * Get suggested target based on remaining score
 */
export function getSuggestedTarget(remainingScore: number): string {
  if (remainingScore <= 40) {
    return 'double' // Need doubles to finish
  } else if (remainingScore <= 100) {
    return 'triple' // High scoring needed
  } else if (remainingScore <= 200) {
    return 'single' // Consistent scoring
  } else {
    return 'triple_20' // Early game, aim for high scores
  }
}

/**
 * Format score display
 */
export function formatScore(score: number, gameMode: string): string {
  switch (gameMode) {
    case '501':
    case '301':
      return score.toString()
    case 'cricket':
      return `Marks: ${score}`
    case 'around_the_clock':
      return `Target: ${score}`
    default:
      return score.toString()
  }
}

/**
 * Get zone color for display
 */
export function getZoneColor(zone: string): string {
  switch (zone) {
    case 'bullseye':
      return 'text-bull-500'
    case 'outer_bull':
      return 'text-mint-500'
    case 'triple':
      return 'text-brass-500'
    case 'double':
      return 'text-bull-400'
    case 'single':
      return 'text-baize-300'
    case 'miss':
      return 'text-baize-500'
    default:
      return 'text-baize-300'
  }
}

/**
 * Get zone display name
 */
export function getZoneDisplayName(zone: string): string {
  switch (zone) {
    case 'bullseye':
      return 'Bullseye (50)'
    case 'outer_bull':
      return 'Outer Bull (25)'
    case 'triple':
      return 'Triple Ring'
    case 'double':
      return 'Double Ring'
    case 'single':
      return 'Single'
    case 'miss':
      return 'Miss'
    default:
      return zone
  }
}