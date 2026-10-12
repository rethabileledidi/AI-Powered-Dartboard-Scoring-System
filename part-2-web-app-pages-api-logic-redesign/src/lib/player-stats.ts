import { Player } from '@/lib/types'

export interface PlayerStats {
  id: string
  name: string
  avatar?: string
  totalGames: number
  totalThrows: number
  averageScore: number
  highestScore: number
  accuracy: number
  winRate: number
  recentPerformance: number[]
  favoriteSegment: string
  lastPlayed: string
}

export interface GameWithDetails {
  id: string
  mode: string
  status: string
  startedAt: string
  endedAt?: string
  players: Array<{
    player: Player
    finalScore: number
    position?: number
    isActive?: boolean
  }>
  throws: Array<{
    id: string
    playerId: string
    player: Player
    x: number
    y: number
    score: number
    multiplier: number
    segment: string
    timestamp: string
  }>
}

/**
 * Calculate comprehensive player statistics from game data
 */
export function calculatePlayerStats(player: Player, games: GameWithDetails[]): PlayerStats {
  const playerGames = games.filter(game => 
    game.players.some(gp => gp.player.id === player.id)
  )
  
  const playerThrows = games.flatMap(game => 
    game.throws.filter(throw_ => throw_.playerId === player.id)
  )
  
  // Basic stats
  const totalGames = playerGames.length
  const totalThrows = playerThrows.length
  
  // Score calculations
  const scores = playerThrows.map(t => t.score)
  const totalScore = scores.reduce((sum, score) => sum + score, 0)
  const averageScore = totalThrows > 0 ? totalScore / totalThrows : 0
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0
  
  // Calculate win rate
  const wonGames = playerGames.filter(game => {
    const playerGame = game.players.find(gp => gp.player.id === player.id)
    return playerGame?.position === 1
  }).length
  const winRate = totalGames > 0 ? (wonGames / totalGames) * 100 : 0
  
  // Calculate accuracy (simplified - could be enhanced with hit/miss data)
  const accuracy = totalThrows > 0 ? Math.min(95, 50 + (totalThrows * 0.5)) : 0
  
  // Recent performance (last 5 games)
  const recentGames = playerGames
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 5)
  
  const recentPerformance = recentGames.map(game => {
    const gameThrows = game.throws.filter(t => t.playerId === player.id)
    const gameScore = gameThrows.reduce((sum, t) => sum + t.score, 0)
    const gameAvg = gameThrows.length > 0 ? gameScore / gameThrows.length : 0
    
    // Convert to performance score (0-100)
    return Math.min(100, Math.max(0, (gameAvg / 60) * 100))
  })
  
  // Find favorite segment
  const segmentCounts = playerThrows.reduce((acc, throw_) => {
    acc[throw_.segment] = (acc[throw_.segment] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const favoriteSegment = Object.entries(segmentCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown'
  
  // Last played date
  const lastPlayed = totalGames > 0 
    ? new Date(Math.max(...playerGames.map(g => new Date(g.startedAt).getTime()))).toLocaleDateString()
    : 'Never'
  
  return {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    totalGames,
    totalThrows,
    averageScore,
    highestScore,
    accuracy,
    winRate,
    recentPerformance,
    favoriteSegment,
    lastPlayed
  }
}

/**
 * Get player performance grade (A-F)
 */
export function getPerformanceGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

/**
 * Get performance level description
 */
export function getPerformanceLevel(accuracy: number): string {
  if (accuracy >= 90) return 'Excellent'
  if (accuracy >= 70) return 'Good'
  if (accuracy >= 50) return 'Average'
  return 'Needs Work'
}

/**
 * Get win rate category
 */
export function getWinRateCategory(winRate: number): string {
  if (winRate >= 70) return 'Dominant'
  if (winRate >= 50) return 'Competitive'
  if (winRate >= 30) return 'Developing'
  return 'Beginner'
}