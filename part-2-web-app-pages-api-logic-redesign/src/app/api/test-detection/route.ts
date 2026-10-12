import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { testType } = body

    switch (testType) {
      case 'detection':
        return NextResponse.json({
          success: true,
          message: 'Dart detection test completed',
          result: {
            detections: [
              {
                x: 0.5,
                y: 0.5,
                score: 50,
                multiplier: 1,
                confidence: 0.95,
                className: 'bullseye'
              }
            ],
            processingTime: 150,
            imageWidth: 640,
            imageHeight: 480
          }
        })

      case 'scoring':
        return NextResponse.json({
          success: true,
          message: 'Scoring calculation test completed',
          result: {
            totalScore: 100,
            averageScore: 33.33,
            dartsDetected: 3
          }
        })

      default:
        return NextResponse.json({
          success: false,
          message: 'Unknown test type'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'AI Dart Scoring System Test API',
    endpoints: {
      'POST /api/test-detection': 'Run detection tests',
      'GET /api/health': 'Health check'
    },
    timestamp: new Date().toISOString()
  })
}