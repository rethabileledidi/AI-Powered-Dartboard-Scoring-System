'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Eye, Play, Trophy, Calendar, Hash } from 'lucide-react'

interface SimpleGameDetailProps {
  game: any
  onResumeGame?: (game: any) => void
  onViewDetails?: (game: any) => void
  children: React.ReactNode
}

export function SimpleGameDetail({ game, onResumeGame, onViewDetails, children }: SimpleGameDetailProps) {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-baize-900 border-baize-700 text-chalk max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-brass-400" />
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

        <div className="space-y-4">
          {/* Game Information */}
          <Card className="bg-baize-800/50 border-baize-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-chalk">
                <Calendar className="h-4 w-4 text-brass-400" />
                Game Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-baize-400">Mode</span>
                  <div className="font-semibold text-chalk">{game.mode}</div>
                </div>
                <div>
                  <span className="text-sm text-baize-400">Players</span>
                  <div className="font-semibold text-chalk">{game.players?.length || 0}</div>
                </div>
                <div>
                  <span className="text-sm text-baize-400">Throws</span>
                  <div className="font-semibold text-chalk">{game._count?.throws || 0}</div>
                </div>
                <div>
                  <span className="text-sm text-baize-400">Started</span>
                  <div className="font-semibold text-chalk">{new Date(game.startedAt).toLocaleDateString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Players */}
          <Card className="bg-baize-800/50 border-baize-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-chalk">
                <Trophy className="h-4 w-4 text-brass-400" />
                Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {game.players?.map((player: any, index: number) => (
                  <div key={player.player.id} className="flex items-center justify-between p-2 bg-baize-800/50 rounded">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-baize-700 text-chalk text-xs">
                          {player.player.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-chalk">{player.player.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-brass-600 text-chalk">
                        {player.finalScore || 0}
                      </Badge>
                      {index === 0 && <Badge className="bg-brass-600 text-chalk">1st</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}