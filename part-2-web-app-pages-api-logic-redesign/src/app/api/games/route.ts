import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    
    const games = await db.game.findMany({
      where: {
        OR: [
          {
            players: {
              some: {
                player: {
                  name: {
                    contains: search,
                    // mode: 'insensitive' // Removed for SQLite compatibility
                  }
                }
              }
            }
          },
          {
            mode: {
              contains: search,
              // mode: 'insensitive' // Removed for SQLite compatibility
            }
          }
        ]
      },
      orderBy: {
        startedAt: 'desc'
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
        },
        _count: {
          select: {
            throws: true,
            players: true
          }
        }
      }
    })
    
    return NextResponse.json(games)
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { mode, playerIds } = await request.json()
    
    if (!mode || !playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json({ error: 'Game mode and players are required' }, { status: 400 })
    }
    
    // Create game with first player as active
    const game = await db.game.create({
      data: {
        mode,
        currentPlayerId: playerIds[0], // Set first player as current
        players: {
          create: playerIds.map((playerId: string, index: number) => ({
            playerId,
            turnOrder: index,
            isActive: index === 0 // First player is active
          }))
        }
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
    
    return NextResponse.json(game, { status: 201 })
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
  }
}