/**
 * Game Logic Service
 * Handles scoring logic for different dart game modes including proper 501 rules
 */

export interface GameState {
  mode: '501' | '301' | 'cricket' | 'around_the_clock'
  players: PlayerState[]
  currentPlayerIndex: number
  status: 'active' | 'finished' | 'bust'
  winner?: string
}

export interface PlayerState {
  id: string
  name: string
  score: number
  startingScore: number
  throws: DartThrow[]
  isActive: boolean
  isFinished: boolean
}

export interface DartThrow {
  x: number
  y: number
  score: number
  multiplier: number
  segment: string
  timestamp: string
}

export interface TurnResult {
  playerId: string
  throws: DartThrow[]
  turnScore: number
  newScore: number
  isBust: boolean
  isWinner: boolean
  message: string
}

/**
 * Calculate 501 game turn result with proper bust rules and double-out requirements
 */
export function calculate501Turn(
  currentPlayer: PlayerState,
  throws: DartThrow[],
  gameState: GameState
): TurnResult {
  const turnScore = throws.reduce((sum, dart) => sum + dart.score, 0)
  const potentialNewScore = currentPlayer.score - turnScore
  
  // Check if turn would result in a bust
  if (potentialNewScore < 0) {
    return {
      playerId: currentPlayer.id,
      throws,
      turnScore,
      newScore: currentPlayer.score, // Score reverts to start of turn
      isBust: true,
      isWinner: false,
      message: `Bust! Score went below zero. ${currentPlayer.name} remains at ${currentPlayer.score}.`
    }
  }
  
  // Check if turn would leave exactly 1 point (cannot finish with 1)
  if (potentialNewScore === 1) {
    return {
      playerId: currentPlayer.id,
      throws,
      turnScore,
      newScore: currentPlayer.score, // Score reverts to start of turn
      isBust: true,
      isWinner: false,
      message: `Bust! Cannot finish with 1 point. ${currentPlayer.name} remains at ${currentPlayer.score}.`
    }
  }
  
  // Check if this could be a winning turn (score reaches exactly 0)
  if (potentialNewScore === 0) {
    // Must finish with a double or inner bullseye (counts as double)
    const lastDart = throws[throws.length - 1]
    const isValidFinish = lastDart && (
      lastDart.multiplier === 2 || 
      lastDart.segment === 'bullseye' // Inner bullseye counts as double for finishing
    )
    
    if (!isValidFinish) {
      return {
        playerId: currentPlayer.id,
        throws,
        turnScore,
        newScore: currentPlayer.score, // Score reverts to start of turn
        isBust: true,
        isWinner: false,
        message: `Bust! Must finish with a double or bullseye. ${currentPlayer.name} remains at ${currentPlayer.score}.`
      }
    }
    
    // Valid winning throw
    return {
      playerId: currentPlayer.id,
      throws,
      turnScore,
      newScore: 0,
      isBust: false,
      isWinner: true,
      message: `🎉 ${currentPlayer.name} wins! Finished with a ${lastDart.segment} for ${lastDart.score} points!`
    }
  }
  
  // Normal scoring turn
  return {
    playerId: currentPlayer.id,
    throws,
    turnScore,
    newScore: potentialNewScore,
    isBust: false,
    isWinner: false,
    message: `${currentPlayer.name} scores ${turnScore} points. Now at ${potentialNewScore}.`
  }
}

/**
 * Calculate Cricket game turn result
 */
export function calculateCricketTurn(
  currentPlayer: PlayerState,
  throws: DartThrow[],
  gameState: GameState
): TurnResult {
  // Cricket numbers: 15, 16, 17, 18, 19, 20, 25 (bullseye)
  const cricketNumbers = [15, 16, 17, 18, 19, 20, 25]
  let turnScore = 0
  const hits: Record<number, number> = {}
  
  // Initialize hits for all cricket numbers
  cricketNumbers.forEach(num => hits[num] = 0)
  
  // Count hits for each cricket number
  throws.forEach(dart => {
    const number = getSegmentNumberFromSegment(dart.segment)
    if (cricketNumbers.includes(number)) {
      hits[number] += dart.multiplier
    }
  })
  
  // Calculate score (only count points for numbers that are closed with 3+ hits)
  cricketNumbers.forEach(num => {
    if (hits[num] > 3) {
      turnScore += num * (hits[num] - 3)
    }
  })
  
  return {
    playerId: currentPlayer.id,
    throws,
    turnScore,
    newScore: currentPlayer.score + turnScore,
    isBust: false,
    isWinner: false,
    message: `${currentPlayer.name} scores ${turnScore} points in Cricket.`
  }
}

/**
 * Calculate Around the Clock turn result
 */
export function calculateAroundTheClockTurn(
  currentPlayer: PlayerState,
  throws: DartThrow[],
  gameState: GameState
): TurnResult {
  let targetNumber = getCurrentTargetNumber(currentPlayer, gameState)
  let hitTarget = false
  
  // Check if any dart hit the current target number
  for (const dart of throws) {
    const number = getSegmentNumberFromSegment(dart.segment)
    if (number === targetNumber) {
      hitTarget = true
      break
    }
  }
  
  if (hitTarget) {
    // Move to next number
    const nextTarget = targetNumber + 1
    
    if (nextTarget > 20) {
      // Player has completed the game
      return {
        playerId: currentPlayer.id,
        throws,
        turnScore: 0,
        newScore: 0,
        isBust: false,
        isWinner: true,
        message: `🎉 ${currentPlayer.name} wins Around the Clock!`
      }
    }
    
    return {
      playerId: currentPlayer.id,
      throws,
      turnScore: 0,
      newScore: nextTarget,
      isBust: false,
      isWinner: false,
      message: `${currentPlayer.name} hits ${targetNumber}! Next target: ${nextTarget}.`
    }
  }
  
  return {
    playerId: currentPlayer.id,
    throws,
    turnScore: 0,
    newScore: targetNumber,
    isBust: false,
    isWinner: false,
    message: `${currentPlayer.name} needs to hit ${targetNumber}.`
  }
}

/**
 * Get appropriate turn calculation function based on game mode
 */
export function getTurnCalculator(gameMode: string) {
  switch (gameMode) {
    case '501':
    case '301':
      return calculate501Turn
    case 'cricket':
      return calculateCricketTurn
    case 'around_the_clock':
      return calculateAroundTheClockTurn
    default:
      return calculate501Turn // Default to 501 logic
  }
}

/**
 * Helper function to extract number from segment string
 */
function getSegmentNumberFromSegment(segment: string): number {
  if (segment === 'bullseye') return 25
  if (segment === 'outer_bull') return 25
  
  const match = segment.match(/(?:single|double|triple)_(\d+)/)
  if (match) {
    return parseInt(match[1])
  }
  
  return 0 // Default for unknown segments
}

/**
 * Helper function to get current target number for Around the Clock
 */
function getCurrentTargetNumber(player: PlayerState, gameState: GameState): number {
  // This would typically be tracked in the player state
  // For now, return a default implementation
  return 1
}

/**
 * Validate if a throw is valid for the current game state
 */
export function validateThrow(
  throwData: DartThrow,
  gameState: GameState,
  playerId: string
): { isValid: boolean; reason?: string } {
  const currentPlayer = gameState.players.find(p => p.id === playerId)
  if (!currentPlayer) {
    return { isValid: false, reason: 'Player not found' }
  }
  
  if (currentPlayer.isFinished) {
    return { isValid: false, reason: 'Player has already finished' }
  }
  
  if (gameState.status === 'finished') {
    return { isValid: false, reason: 'Game has already finished' }
  }
  
  // Basic validation - throw should have valid score
  if (throwData.score < 0 || throwData.score > 180) {
    return { isValid: false, reason: 'Invalid score' }
  }
  
  return { isValid: true }
}

/**
 * Get game status message
 */
export function getGameStatusMessage(gameState: GameState): string {
  if (gameState.status === 'finished') {
    return `Game finished! Winner: ${gameState.winner}`
  }
  
  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  if (!currentPlayer) {
    return 'Game in progress'
  }
  
  switch (gameState.mode) {
    case '501':
    case '301':
      return `${currentPlayer.name}'s turn - Score: ${currentPlayer.score}`
    case 'cricket':
      return `${currentPlayer.name}'s turn - Playing Cricket`
    case 'around_the_clock':
      return `${currentPlayer.name}'s turn - Around the Clock`
    default:
      return 'Game in progress'
  }
}