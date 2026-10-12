import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    
    const players = await db.player.findMany({
      where: {
        OR: [
          {
            name: {
              contains: search,
              // mode: 'insensitive' // Removed for SQLite compatibility
            }
          }
        ]
      },
      orderBy: {
        updatedAt: 'desc'
      },
      include: {
        _count: {
          select: {
            games: true,
            throws: true
          }
        }
      }
    })
    
    return NextResponse.json(players)
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, avatar } = await request.json()
    
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Player name is required' }, { status: 400 })
    }
    
    // Check if player already exists
    const existingPlayer = await db.player.findUnique({
      where: { name: name.trim() }
    })
    
    if (existingPlayer) {
      return NextResponse.json({ error: 'Player already exists' }, { status: 409 })
    }
    
    const player = await db.player.create({
      data: {
        name: name.trim(),
        avatar: avatar || null
      }
    })
    
    return NextResponse.json(player, { status: 201 })
  } catch (error) {
    console.error('Error creating player:', error)
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('id')
    
    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 })
    }
    
    // Check if player exists
    const existingPlayer = await db.player.findUnique({
      where: { id: playerId },
      include: {
        _count: {
          select: {
            games: true,
            throws: true
          }
        }
      }
    })
    
    if (!existingPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
    
    // Check if player has associated games or throws
    if (existingPlayer._count.games > 0 || existingPlayer._count.throws > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete player with associated games or throws. Please delete associated data first.' 
      }, { status: 400 })
    }
    
    // Delete the player
    await db.player.delete({
      where: { id: playerId }
    })
    
    return NextResponse.json({ message: 'Player deleted successfully' })
  } catch (error) {
    console.error('Error deleting player:', error)
    return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 })
  }
}