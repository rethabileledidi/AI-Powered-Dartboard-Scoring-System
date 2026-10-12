import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const gameId = id
    
    if (!gameId) {
      return NextResponse.json({ error: 'Game ID is required' }, { status: 400 })
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
    
    if (game.players.length <= 1) {
      return NextResponse.json({ error: 'Need at least 2 players to switch' }, { status: 400 })
    }
    
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
    const updatedGame = await db.game.update({
      where: { id: gameId },
      data: {
        currentPlayerId: game.players[nextPlayerIndex].playerId
      },
      include: {
        players: {
          include: {
            player: true
          },
          orderBy: {
            turnOrder: 'asc'
          }
        },
        throws: {
          include: {
            player: true
          },
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    })
    
    return NextResponse.json(updatedGame)
  } catch (error) {
    console.error('Error switching player:', error)
    return NextResponse.json({ error: 'Failed to switch player' }, { status: 500 })
  }
}