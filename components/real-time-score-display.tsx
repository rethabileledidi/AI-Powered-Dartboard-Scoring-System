'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AnimatedNumber } from '@/components/effects/animated-number'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DartDetection } from '@/lib/dart-detection-pc'
import { 
  Trophy, 
  TrendingUp, 
  Clock, 
  Target,
  Zap,
  Award,
  User,
  CircleDot
} from 'lucide-react'

interface PlayerScore {
  player: {
    id: string
    name: string
    avatar?: string
  }
  score: number
  throws: number
  average: number
  lastThrow?: DartDetection
}

interface RealTimeScoreDisplayProps {
  players: PlayerScore[]
  gameMode: string
  activePlayerId?: string
  className?: string
}

export function RealTimeScoreDisplay({ players, gameMode, activePlayerId, className }: RealTimeScoreDisplayProps) {
  const [recentScores, setRecentScores] = useState<{playerId: string, score: number, timestamp: number}[]>([])

  useEffect(() => {
    // Update real-time display
    const interval = setInterval(() => {
      setRecentScores(prev => prev.filter(score => Date.now() - score.timestamp < 5000))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const addRecentScore = (playerId: string, score: number) => {
    setRecentScores(prev => [...prev, { playerId, score, timestamp: Date.now() }])
  }

  const getGameModeIcon = () => {
    switch (gameMode) {
      case '501':
      case '301':
        return <Trophy className="h-5 w-5 text-brass-400" />
      case 'Cricket':
        return <Target className="h-5 w-5 text-mint-400" />
      default:
        return <Award className="h-5 w-5 text-brass-400" />
    }
  }

  const getScoreColor = (score: number, index: number) => {
    if (index === 0) return 'text-brass-400' // Leader
    if (index === 1) return 'text-baize-300' // Second place
    if (index === 2) return 'text-ember-400' // Third place
    return 'text-baize-300'
  }

  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-4 w-4 text-brass-400" />
      case 1:
        return <Award className="h-4 w-4 text-baize-300" />
      case 2:
        return <Award className="h-4 w-4 text-ember-400" />
      default:
        return <span className="text-xs font-bold">#{index + 1}</span>
    }
  }

  return (
    <Card className={`bg-gradient-to-br from-baize-800 to-baize-900 border-baize-700 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-chalk">
          <div className="flex items-center gap-2">
            {getGameModeIcon()}
            Live Scoreboard
            <Badge variant="secondary" className="bg-brass-600 text-chalk">
              {gameMode}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-sm text-baize-400">
            <Clock className="h-4 w-4" />
            <span>Live</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Player Rankings */}
        <div className="space-y-3">
          {players.map((playerData, index) => {
            const isActive = activePlayerId === playerData.player.id
            return (
              <div 
                key={playerData.player.id}
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  isActive 
                    ? 'at-the-oche bg-gradient-to-r from-mint-900/30 to-mint-800/30 border-mint-500/50 shadow-lg ring-2 ring-mint-500/20'
                    : index === 0 
                      ? 'bg-gradient-to-r from-brass-900/20 to-brass-800/20 border-brass-600/50 shadow-lg'
                      : index === 1
                      ? 'bg-gradient-to-r from-baize-800/20 to-baize-700/20 border-baize-600/50'
                      : index === 2
                      ? 'bg-gradient-to-r from-ember-900/20 to-ember-800/20 border-ember-600/50'
                      : 'bg-baize-800/50 border-baize-700/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <CircleDot className="h-4 w-4 text-mint-400 animate-pulse" />
                      )}
                      {getMedalIcon(index)}
                      <Avatar className={`h-10 w-10 border-2 ${isActive ? 'border-mint-500' : 'border-baize-600'}`}>
                        <AvatarFallback className={`${isActive ? 'bg-mint-700' : 'bg-baize-700'} text-chalk`}>
                          {playerData.player.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold ${getScoreColor(playerData.score, index)}`}>
                          {playerData.player.name}
                        </h3>
                        {isActive && (
                          <Badge className="bg-mint-600 text-chalk text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-baize-400">
                        <span>{playerData.throws} throws</span>
                        <span>•</span>
                        <span>Avg: {playerData.average.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-display text-5xl font-extrabold leading-none ${getScoreColor(playerData.score, index)}`}>
                      <AnimatedNumber value={playerData.score} duration={900} />
                    </div>
                    {playerData.lastThrow && (
                      <div className="flex items-center gap-1 text-xs text-baize-400">
                        <Zap className="h-3 w-3" />
                        <span>Last: {playerData.lastThrow.score}</span>
                      </div>
                    )}
                  </div>
                </div>

              {/* Progress bar for games like 501/301 */}
              {(gameMode === '501' || gameMode === '301') && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-baize-400 mb-1">
                    <span>Progress</span>
                    <span>{Math.max(0, parseInt(gameMode) - playerData.score)} to go</span>
                  </div>
                  <Progress 
                    value={(playerData.score / parseInt(gameMode)) * 100} 
                    className="bar-grow h-2 bg-baize-700"
                  />
                </div>
              )}
            </div>
            )
          })}
        </div>

        {/* Recent Scores Animation */}
        {recentScores.length > 0 && (
          <div className="mt-4 p-3 bg-baize-800/50 rounded-lg border border-baize-700">
            <h4 className="text-sm font-medium text-baize-300 mb-2 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Recent Scores
            </h4>
            <div className="space-y-1">
              {recentScores.slice(-3).map((recentScore, index) => {
                const player = players.find(p => p.player.id === recentScore.playerId)
                return (
                  <div 
                    key={index}
                    className="flex items-center justify-between text-sm animate-pulse"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <span className="text-baize-400">{player?.player.name}</span>
                    <Badge variant="secondary" className="bg-mint-600 text-chalk">
                      +{recentScore.score}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Game Statistics */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-3 bg-baize-800/50 rounded-lg border border-baize-700">
            <div className="font-display text-3xl font-extrabold text-brass-400">
              <AnimatedNumber value={players.reduce((sum, p) => sum + p.throws, 0)} />
            </div>
            <div className="text-xs text-baize-400">Total Throws</div>
          </div>
          <div className="text-center p-3 bg-baize-800/50 rounded-lg border border-baize-700">
            <div className="font-display text-3xl font-extrabold text-mint-400">
              <AnimatedNumber value={players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.average, 0) / players.length) : 0} />
            </div>
            <div className="text-xs text-baize-400">Avg Score</div>
          </div>
          <div className="text-center p-3 bg-baize-800/50 rounded-lg border border-baize-700">
            <div className="font-display text-3xl font-extrabold text-ember-400">
              <AnimatedNumber value={players.reduce((sum, p) => sum + p.score, 0)} duration={900} />
            </div>
            <div className="text-xs text-baize-400">Total Points</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}