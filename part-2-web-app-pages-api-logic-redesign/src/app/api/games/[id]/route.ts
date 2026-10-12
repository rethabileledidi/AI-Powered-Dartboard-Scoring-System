import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const gameId = id
    const { action } = await request.json()
    
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 })
    }
    
    if (!action || !['pause', 'resume', 'next-turn'].includes(action)) {
      return NextResponse.json({ error: 'Valid action is required (pause, resume, next-turn)' }, { status: 400 })
    }
    
    // Find the game with players
    const game = await db.game.findUnique({
      where: { id: gameId },
      include: {
        players: {
          include: {
            player: true
          }
        }
      }
    })
    
    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }
    
    let updatedGame
    
    switch (action) {
      case 'pause':
        if (game.isPaused) {
          return NextResponse.json({ error: 'Game is already paused' }, { status: 400 })
        }
        
        updatedGame = await db.game.update({
          where: { id: gameId },
          data: {
            isPaused: true,
            pausedAt: new Date(),
            status: 'paused'
          },
          include: {
            players: {
              include: {
                player: true
              }
            },
            throws: {
              include: {
                player: true
              }
            }
          }
        })
        break
        
      case 'resume':
        if (!game.isPaused) {
          return NextResponse.json({ error: 'Game is not paused' }, { status: 400 })
        }
        
        updatedGame = await db.game.update({
          where: { id: gameId },
          data: {
            isPaused: false,
            pausedAt: null,
            status: 'active'
          },
          include: {
            players: {
              include: {
                player: true
              }
            },
            throws: {
              include: {
                player: true
              }
            }
          }
        })
        break
        
      case 'next-turn':
        // Find current active player and move to next
        const currentActivePlayer = game.players.find(p => p.isActive)
        const currentPlayerIndex = game.players.findIndex(p => p.isActive)
        const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length
        
        // Deactivate current player and activate next
        const updatePromises = game.players.map((player, index) => 
          db.gamePlayer.update({
            where: { id: player.id },
            data: {
              isActive: index === nextPlayerIndex
            }
          })
        )
        
        await Promise.all(updatePromises)
        
        // Update game with new current player
        updatedGame = await db.game.update({
          where: { id: gameId },
          data: {
            currentPlayerId: game.players[nextPlayerIndex].playerId
          },
          include: {
            players: {
              include: {
                player: true
              }
            },
            throws: {
              include: {
                player: true
              }
            }
          }
        })
        break
    }
    
    return NextResponse.json(updatedGame)
  } catch (error) {
    console.error('Error updating game:', error)
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 })
  }
}