'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AnimatedNumber } from '@/components/effects/animated-number'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  TrendingUp, 
  Target, 
  Zap, 
  Award,
  Trophy,
  User,
  Calendar,
  BarChart3,
  Trash2
} from 'lucide-react'

interface PlayerStats {
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

interface PlayerStatisticsProps {
  players: PlayerStats[]
  onDeletePlayer?: (playerId: string) => void
  className?: string
}

export function PlayerStatistics({ players, onDeletePlayer, className }: PlayerStatisticsProps) {
  const getPerformanceColor = (performance: number) => {
    if (performance >= 80) return 'text-mint-400'
    if (performance >= 60) return 'text-brass-400'
    if (performance >= 40) return 'text-ember-400'
    return 'text-bull-400'
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return 'bg-mint-500'
    if (accuracy >= 70) return 'bg-brass-500'
    if (accuracy >= 50) return 'bg-ember-500'
    return 'bg-bull-500'
  }

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 70) return 'bg-mint-500'
    if (winRate >= 50) return 'bg-brass-500'
    if (winRate >= 30) return 'bg-ember-500'
    return 'bg-bull-500'
  }

  return (
    <div className={`stagger-in space-y-6 ${className}`}>
      {players.map((player) => (
        <Card key={player.id} className="bg-gradient-to-br from-baize-800 to-baize-900 border-baize-700 hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-chalk">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-baize-600">
                  <AvatarFallback className="bg-baize-700 text-chalk text-lg">
                    {player.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-2xl font-extrabold">{player.name}</h3>
                  <div className="mt-1 flex items-center gap-2 font-sans text-sm font-normal tracking-normal text-baize-400">
                    <Calendar className="h-4 w-4" />
                    <span>Last played: {player.lastPlayed}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {player.winRate >= 70 && (
                  <Badge className="bg-gradient-to-r from-brass-600 to-brass-500 text-chalk">
                    <Trophy className="h-3 w-3 mr-1" />
                    Champion
                  </Badge>
                )}
                {onDeletePlayer && (
                  <button
                    onClick={() => onDeletePlayer(player.id)}
                    className="p-2 hover:bg-bull-500/20 rounded-lg transition-colors"
                    title="Delete player"
                  >
                    <Trash2 className="h-4 w-4 text-bull-400 hover:text-bull-300" />
                  </button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-baize-800/50 rounded-lg border border-baize-700">
                <div className="font-display text-4xl font-extrabold leading-none text-brass-400"><AnimatedNumber value={player.totalGames} /></div>
                <div className="mt-1 text-xs text-baize-400">Games</div>
              </div>
              <div className="text-center p-4 bg-baize-800/50 rounded-lg border border-baize-700">
                <div className="font-display text-4xl font-extrabold leading-none text-mint-400"><AnimatedNumber value={player.totalThrows} /></div>
                <div className="mt-1 text-xs text-baize-400">Throws</div>
              </div>
              <div className="text-center p-4 bg-baize-800/50 rounded-lg border border-baize-700">
                <div className="font-display text-4xl font-extrabold leading-none text-ember-400"><AnimatedNumber value={player.averageScore} decimals={1} /></div>
                <div className="mt-1 text-xs text-baize-400">Average</div>
              </div>
              <div className="text-center p-4 bg-baize-800/50 rounded-lg border border-baize-700">
                <div className="font-display text-4xl font-extrabold leading-none text-brass-300"><AnimatedNumber value={player.highestScore} /></div>
                <div className="mt-1 text-xs text-baize-400">Highest</div>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-baize-300">Accuracy</span>
                    <span className={`text-sm font-bold ${getPerformanceColor(player.accuracy)}`}>
                      {player.accuracy.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={player.accuracy} 
                    className="bar-grow h-3 bg-baize-700"
                  />
                  <div className="flex justify-between text-xs text-baize-400 mt-1">
                    <span>Precision</span>
                    <span>{player.accuracy >= 90 ? 'Excellent' : player.accuracy >= 70 ? 'Good' : 'Needs Work'}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-baize-300">Win Rate</span>
                    <span className={`text-sm font-bold ${getPerformanceColor(player.winRate)}`}>
                      {player.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={player.winRate} 
                    className="bar-grow h-3 bg-baize-700"
                  />
                  <div className="flex justify-between text-xs text-baize-400 mt-1">
                    <span>Victories</span>
                    <span>{player.winRate >= 70 ? 'Dominant' : player.winRate >= 50 ? 'Competitive' : 'Developing'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-baize-800/50 rounded-lg border border-baize-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-5 w-5 text-mint-400" />
                    <span className="text-sm font-medium text-baize-300">Favorite Segment</span>
                  </div>
                  <div className="text-center">
                    <Badge className="bg-mint-600 text-chalk text-lg px-4 py-2">
                      {player.favoriteSegment || 'Unknown'}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-baize-800/50 rounded-lg border border-baize-700">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-brass-400" />
                    <span className="text-sm font-medium text-baize-300">Recent Form</span>
                  </div>
                  <div className="flex justify-center gap-1">
                    {player.recentPerformance && player.recentPerformance.length > 0 ? (
                      player.recentPerformance.slice(-5).map((performance, index) => (
                        <div
                          key={index}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            performance >= 80 ? 'bg-mint-600' :
                            performance >= 60 ? 'bg-brass-600' :
                            performance >= 40 ? 'bg-ember-600' : 'bg-bull-600'
                          }`}
                        >
                          {performance >= 80 ? 'A' : performance >= 60 ? 'B' : performance >= 40 ? 'C' : 'D'}
                        </div>
                      ))
                    ) : (
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, index) => (
                          <div
                            key={index}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-baize-600"
                          >
                            -
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-center text-xs text-baize-400 mt-2">
                    Last 5 games
                  </div>
                </div>
              </div>
            </div>

            {/* Achievement Badges */}
            <div>
              <h4 className="text-sm font-medium text-baize-300 mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-brass-400" />
                Achievements
              </h4>
              <div className="flex flex-wrap gap-2">
                {player.accuracy >= 90 && (
                  <Badge className="bg-brass-600 text-chalk">
                    <Zap className="h-3 w-3 mr-1" />
                    Sharpshooter
                  </Badge>
                )}
                {player.winRate >= 70 && (
                  <Badge className="bg-brass-600 text-chalk">
                    <Trophy className="h-3 w-3 mr-1" />
                    Champion
                  </Badge>
                )}
                {player.totalGames >= 50 && (
                  <Badge className="bg-ember-600 text-chalk">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Veteran
                  </Badge>
                )}
                {player.highestScore >= 100 && (
                  <Badge className="bg-mint-600 text-chalk">
                    <Target className="h-3 w-3 mr-1" />
                    High Scorer
                  </Badge>
                )}
                {player.recentPerformance && player.recentPerformance.length >= 3 && player.recentPerformance.slice(-3).every(p => p >= 70) && (
                  <Badge className="bg-ember-600 text-chalk">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Hot Streak
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}