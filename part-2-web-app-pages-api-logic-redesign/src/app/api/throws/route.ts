import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { gameId, playerId, x, y, score, multiplier, segment } = await request.json()
    
    if (!gameId || !playerId || x === undefined || y === undefined || score === undefined || !multiplier || !segment) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    
    const throwData = await db.throw.create({
      data: {
        gameId,
        playerId,
        x,
        y,
        score,
        multiplier,
        segment
      },
      include: {
        player: true,
        game: true
      }
    })
    
    return NextResponse.json(throwData, { status: 201 })
  } catch (error) {
    console.error('Error creating throw:', error)
    return NextResponse.json({ error: 'Failed to create throw' }, { status: 500 })
  }
}