'use client'

import React, { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { 
  Eye, 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Target, 
  Trophy,
  User,
  Calendar,
  Hash,
  Zap
} from 'lucide-react'

interface GamePlayer {
  player: {
    id: string
    name: string
    avatar?: string
  }
  finalScore: number
  position?: number
  isActive?: boolean
}

interface GameThrow {
  id: string
  playerId: string
  player: {
    id: string
    name: string
    avatar?: string
  }
  x: number
  y: number
  score: number
  multiplier: number
  segment: string
  timestamp: string
}

interface Game {
  id: string
  mode: string
  status: string
  startedAt: string
  endedAt?: string
  players: GamePlayer[]
  throws: GameThrow[]
  _count: {
    throws: number
    players: number
  }
}

interface GameDetailDialogProps {
  game: Game
  onResumeGame?: (game: Game) => void
  onViewDetails?: (game: Game) => void
  children: React.ReactNode
}

export function GameDetailDialog({ game, onResumeGame, onViewDetails, children }: GameDetailDialogProps) {
  const [open, setOpen] = useState(false)

  const handleResume = () => {
    if (onResumeGame) {
      onResumeGame(game)
    }
    setOpen(false)
  }

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(game)
    }
    setOpen(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getGameDuration = () => {
    if (game.endedAt) {
      const start = new Date(game.startedAt)
      const end = new Date(game.endedAt)
      const duration = end.getTime() - start.getTime()
      const minutes = Math.floor(duration / 60000)
      const seconds = Math.floor((duration % 60000) / 1000)
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
    return 'In Progress'
  }

  const getScoreColor = (score: number, index: number) => {
    if (index === 0) return 'text-brass-400'
    if (index === 1) return 'text-baize-300'
    if (index === 2) return 'text-ember-400'
    return 'text-baize-300'
  }

  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-4 w-4 text-brass-400" />
      case 1:
        return <Trophy className="h-4 w-4 text-baize-300" />
      case 2:
        return <Trophy className="h-4 w-4 text-ember-400" />
      default:
        return <span className="text-xs font-bold">#{index + 1}</span>
    }
  }

  // Group throws by player and calculate scores
  const playerStats = game.players.map(player => {
    const playerThrows = game.throws.filter(t => t.playerId === player.player.id)
    const totalScore = playerThrows.reduce((sum, t) => sum + t.score, 0)
    const averageScore = playerThrows.length > 0 ? totalScore / playerThrows.length : 0
    const highScore = playerThrows.length > 0 ? Math.max(...playerThrows.map(t => t.score)) : 0

    return {
      ...player,
      totalScore,
      averageScore: Math.round(averageScore * 10) / 10,
      highScore,
      throwCount: playerThrows.length
    }
  }).sort((a, b) => b.totalScore - a.totalScore)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-baize-900 border-baize-700 text-chalk max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-2xl">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-brass-400" />
              <span>Game Details</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-brass-600 text-chalk">
                <Hash className="h-3 w-3 mr-1" />
                {game.id}
              </Badge>
              <Badge className={game.status === 'active' ? 'bg-mint-600 text-chalk' : 'bg-baize-600 text-chalk'}>
                {game.status}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
          {/* Game Information */}
          <Card className="bg-baize-800/50 border-baize-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-chalk">
                <Calendar className="h-5 w-5 text-brass-400" />
                Game Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-baize-800/50 rounded-lg border border-baize-700">
                  <div className="text-lg font-bold text-brass-400">{game.mode}</div>
                  <div className="text-xs text-baize-400">Game Mode</div>
                </div>
                <div className="text-center p-3 bg-baize-800/50 rounded-lg border border-baize-700">
                  <div className="text-lg font-bold text-mint-400">{game.players.length}</div>
                  <div className="text-xs text-baize-400">Players</div>
                </div>
                <div className="text-center p-3 bg-baize-800/50 rounded-lg border border-baize-700">
                  <div className="text-lg font-bold text-ember-400">{game._count.throws}</div>
                  <div className="text-xs text-baize-400">Total Throws</div>
                </div>
                <div className="text-center p-3 bg-baize-800/50 rounded-lg border border-baize-700">
                  <div className="text-lg font-bold text-brass-400">{getGameDuration()}</div>
                  <div className="text-xs text-baize-400">Duration</div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-baize-400">
                  <Clock className="h-4 w-4" />
                  <span>Started: {formatDate(game.startedAt)}</span>
                </div>
                {game.endedAt && (
                  <div className="flex items-center gap-2 text-sm text-baize-400">
                    <Clock className="h-4 w-4" />
                    <span>Ended: {formatDate(game.endedAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Player Rankings */}
          <Card className="bg-baize-800/50 border-baize-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-chalk">
                <Trophy className="h-5 w-5 text-brass-400" />
                Final Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {playerStats.map((player, index) => (
                  <div 
                    key={player.player.id}
                    className={`p-4 rounded-lg border transition-all duration-300 ${
                      index === 0 
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
                          {getMedalIcon(index)}
                          <Avatar className={`h-10 w-10 border-2 ${index === 0 ? 'border-brass-500' : 'border-baize-600'}`}>
                            <AvatarFallback className={`${index === 0 ? 'bg-brass-700' : 'bg-baize-700'} text-chalk`}>
                              {player.player.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <h3 className={`font-bold ${getScoreColor(player.totalScore, index)}`}>
                            {player.player.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-baize-400">
                            <span>{player.throwCount} throws</span>
                            <span>•</span>
                            <span>Avg: {player.averageScore}</span>
                            <span>•</span>
                            <span>High: {player.highScore}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(player.totalScore, index)}`}>
                          {player.totalScore}
                        </div>
                        {game.mode === '501' || game.mode === '301' ? (
                          <div className="text-xs text-baize-400">
                            {Math.max(0, parseInt(game.mode) - player.totalScore)} to go
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Progress bar for countdown games */}
                    {(game.mode === '501' || game.mode === '301') && (
                      <div className="mt-3">
                        <Progress 
                          value={(player.totalScore / parseInt(game.mode)) * 100} 
                          className="h-2 bg-baize-700"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Throw History */}
          <Card className="bg-baize-800/50 border-baize-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-chalk">
                <Target className="h-5 w-5 text-mint-400" />
                Throw History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {game.throws
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((throw_item, index) => (
                    <div key={throw_item.id} className="flex items-center justify-between p-3 bg-baize-800/50 rounded-lg border border-baize-700">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-baize-700 text-chalk text-xs">
                            {throw_item.player.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-chalk">{throw_item.player.name}</span>
                            <Badge className="bg-brass-600 text-chalk text-xs">
                              {throw_item.score}
                            </Badge>
                            <Badge variant="outline" className="border-baize-600 text-baize-300 text-xs">
                              {throw_item.segment}
                            </Badge>
                          </div>
                          <div className="text-xs text-baize-400">
                            {new Date(throw_item.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-baize-400">
                          ({throw_item.x.toFixed(2)}, {throw_item.y.toFixed(2)})
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          {game.status === 'active' && onResumeGame && (
            <Button 
              onClick={handleResume}
              className="bg-mint-600 text-chalk hover:bg-mint-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Resume Game
            </Button>
          )}
          <Button 
            onClick={handleViewDetails}
            variant="outline"
            className="border-baize-600 text-chalk hover:bg-baize-700"
          >
            <Eye className="h-4 w-4 mr-2" />
            View in Scanner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}