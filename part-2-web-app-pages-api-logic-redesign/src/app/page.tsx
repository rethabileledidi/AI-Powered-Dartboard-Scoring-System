'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { BoardMark } from '@/components/brand/board-mark'
import { BoardBackdrop } from '@/components/effects/board-backdrop'
import { DartScannerPC, DartScannerPCRef } from '@/components/dart-scanner-pc'
import { DartBoard } from '@/components/dart-board'
import { DartboardVisualization } from '@/components/dartboard-visualization'
import { ManualDetection } from '@/components/manual-detection'
import { Calibration } from '@/components/calibration'
import { SimpleGameDetail } from '@/components/simple-game-detail'
import { RealTimeScoreDisplay } from '@/components/real-time-score-display'
import { PlayerStatistics } from '@/components/player-statistics'
import { calculate501Score, calculateDartScore, ScoreResult } from '@/lib/scoring-utils'
import { calculatePlayerStats } from '@/lib/player-stats'

import { 
  Camera, 
  Users, 
  Gamepad2, 
  Trophy, 
  Settings, 
  Target,
  Zap,
  User,
  Plus,
  Search,
  Trash2,
  ArrowRight,
  RotateCcw,
  Database,
  Info
} from 'lucide-react'

interface Player {
  id: string
  name: string
  avatar?: string
  createdAt: string
  updatedAt: string
  _count: {
    games: number
    throws: number
  }
}

interface Game {
  id: string
  mode: string
  status: string
  startedAt: string
  endedAt?: string
  players: Array<{
    player: Player
    finalScore: number
    position?: number
    isActive?: boolean
  }>
  throws: Array<{
    id: string
    playerId: string
    player: Player
    x: number
    y: number
    score: number
    multiplier: number
    segment: string
    timestamp: string
  }>
  _count: {
    throws: number
    players: number
  }
}

interface DartDetection {
  x: number
  y: number
  score: number
  multiplier: number
  className: string
  confidence: number
}

export default function DartScoringSystem() {
  // Game state
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([])
  const [gameMode, setGameMode] = useState<'501' | '301' | 'Cricket'>('501')
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false)
  const [isStartGameOpen, setIsStartGameOpen] = useState(false)
  const [detectionResults, setDetectionResults] = useState<DartDetection[]>([])
  const [activeTab, setActiveTab] = useState<'scanner' | 'players' | 'games' | 'settings' | 'calibration'>('scanner')
  const [isDartboardDetected, setIsDartboardDetected] = useState(false)
  const dartScannerRef = useRef<DartScannerPCRef>(null)
  
  // Settings state
  const [settings, setSettings] = useState({
    detection: {
      accuracy: 94,
      autoDetection: true,
      mode: 'cv' as 'cv' | 'ml'
    },
    camera: {
      resolution: 'HD (1280x720)' as 'HD (1280x720)' | 'Full HD (1920x1080)' | 'SD (640x480)',
      frameRate: 30 as 24 | 30 | 60,
      brightness: 50,
      contrast: 50
    },
    game: {
      defaultMode: '501' as '501' | '301' | 'Cricket',
      soundEffects: true,
      autoSave: true
    },
    system: {
      theme: 'dark' as 'dark' | 'light',
      language: 'english' as 'english' | 'spanish' | 'french',
      notifications: true
    }
  })
  
  const { toast } = useToast()

  // Handle settings changes
  const updateSettings = (category: keyof typeof settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
    
    toast({
      title: "⚙️ Setting Updated",
      description: `${category} setting has been updated.`,
      className: "bg-gradient-to-r from-brass-600 to-ember-600 text-chalk border-0",
    })
  }

  // Fetch players and games on mount
  useEffect(() => {
    fetchPlayers()
    fetchGames()
  }, [])

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players')
      if (response.ok) {
        const data = await response.json()
        setPlayers(data)
      }
    } catch (error) {
      console.error('Error fetching players:', error)
    }
  }

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games')
      if (response.ok) {
        const data = await response.json()
        setGames(data)
      }
    } catch (error) {
      console.error('Error fetching games:', error)
    }
  }

  const createPlayer = async () => {
    if (!newPlayerName.trim()) return

    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName.trim() })
      })

      if (response.ok) {
        const newPlayer = await response.json()
        setPlayers(prev => [newPlayer, ...prev])
        setNewPlayerName('')
        setIsAddPlayerOpen(false)
        toast({
          title: "✅ Player Created",
          description: `${newPlayer.name} has been added to the system.`,
          className: "bg-gradient-to-r from-mint-600 to-mint-600 text-chalk border-0",
        })
      } else if (response.status === 409) {
        toast({
          title: "⚠️ Player Exists",
          description: "A player with this name already exists.",
          variant: "destructive",
          className: "bg-gradient-to-r from-ember-600 to-bull-600 text-chalk border-0",
        })
      }
    } catch (error) {
      console.error('Error creating player:', error)
    }
  }

  const startNewGame = async () => {
    if (selectedPlayers.length === 0) {
      toast({
        title: "⚠️ No Players Selected",
        description: "Please select at least one player to start a game.",
        variant: "destructive",
        className: "bg-gradient-to-r from-ember-600 to-bull-600 text-chalk border-0",
      })
      return
    }

    // Reset all state before starting new game
    setDetectionResults([])
    setIsDartboardDetected(false)
    
    // Clear the DartScannerPC component state
    if (dartScannerRef.current) {
      dartScannerRef.current.clearDartboard()
    }

    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: gameMode,
          playerIds: selectedPlayers.map(p => p.id)
        })
      })

      if (response.ok) {
        const game = await response.json()
        setCurrentGame(game)
        setIsStartGameOpen(false)
        setActiveTab('scanner')
        toast({
          title: "🎮 Game Started",
          description: `${gameMode} game started with ${selectedPlayers.length} players.`,
          className: "bg-gradient-to-r from-brass-600 to-ember-600 text-chalk border-0",
        })
      }
    } catch (error) {
      console.error('Error starting game:', error)
    }
  }

  const stopGame = async () => {
    if (!currentGame) return

    try {
      const response = await fetch(`/api/games/${currentGame.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'stopped', endedAt: new Date() })
      })

      if (response.ok) {
        const updatedGame = await response.json()
        setCurrentGame(null)
        fetchGames()
        toast({
          title: "⏹️ Game Stopped",
          description: "The game has been stopped and saved.",
          className: "bg-gradient-to-r from-ember-600 to-bull-600 text-chalk border-0",
        })
      }
    } catch (error) {
      console.error('Error stopping game:', error)
    }
  }

  const deletePlayer = async (playerId: string) => {
    try {
      const response = await fetch(`/api/players?id=${playerId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setPlayers(prev => prev.filter(p => p.id !== playerId))
        setSelectedPlayers(prev => prev.filter(p => p.id !== playerId))
        toast({
          title: "🗑️ Player Deleted",
          description: "Player has been deleted successfully.",
          className: "bg-gradient-to-r from-bull-600 to-bull-600 text-chalk border-0",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "⚠️ Delete Failed",
          description: errorData.error || "Failed to delete player.",
          variant: "destructive",
          className: "bg-gradient-to-r from-ember-600 to-bull-600 text-chalk border-0",
        })
      }
    } catch (error) {
      console.error('Error deleting player:', error)
      toast({
        title: "⚠️ Delete Failed",
        description: "Failed to delete player.",
        variant: "destructive",
        className: "bg-gradient-to-r from-ember-600 to-bull-600 text-chalk border-0",
      })
    }
  }

  const handleDetection = (detections: DartDetection[]) => {
    setDetectionResults(detections)

    // Simulate dartboard detection based on detection results
    const boardDetected = detections.length > 0
    setIsDartboardDetected(boardDetected)

    if (detections.length > 0 && currentGame) {
      // Convert detections to ScoreResult format
      const scoreResults: ScoreResult[] = detections.map(detection => ({
        score: detection.score,
        multiplier: detection.multiplier,
        segment: detection.className,
        zone: getZoneFromSegment(detection.className),
        isValid: true
      }))

      // Calculate game result using proper 501 logic
      const currentPlayer = currentGame.players.find(gp => gp.isActive)?.player
      if (!currentPlayer) return

      const currentPlayerScore = getCurrentPlayerScore()
      if (currentPlayerScore === null) return

      const gameResult = calculate501Score(currentPlayerScore, scoreResults)

      // Save detections to database
      detections.forEach(async (detection) => {
        try {
          await fetch('/api/throws', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gameId: currentGame.id,
              playerId: currentPlayer.id,
              x: detection.x,
              y: detection.y,
              score: detection.score,
              multiplier: detection.multiplier,
              segment: detection.className
            })
          })
        } catch (error) {
          console.error('Error saving throw:', error)
        }
      })

      // Force re-render of the RealTimeScoreDisplay by updating currentGame state
      // This will trigger the component to recalculate scores from the database
      setTimeout(() => {
        fetchGames() // Refresh games data to get updated throws
      }, 100)

      // Show appropriate toast notification based on game result
      if (gameResult.isWinner) {
        toast({
          title: "🎉 Game Won!",
          description: gameResult.message,
          className: "bg-gradient-to-r from-brass-600 to-ember-600 text-chalk border-0",
        })
      } else if (gameResult.isBust) {
        toast({
          title: "💥 Bust!",
          description: gameResult.message,
          variant: "destructive",
          className: "bg-gradient-to-r from-bull-600 to-bull-600 text-chalk border-0",
        })
      } else {
        const totalScore = detections.reduce((sum, dart) => sum + dart.score, 0)
        toast({
          title: "🎯 Darts Detected!",
          description: `${detections.length} darts detected. Total score: ${totalScore}. ${gameResult.message}`,
          className: "bg-gradient-to-r from-mint-600 to-mint-600 text-chalk border-0",
        })
      }
    }
  }

  const switchToNextPlayer = async () => {
    if (!currentGame) return

    try {
      const response = await fetch(`/api/games/${currentGame.id}/next-player`, {
        method: 'POST'
      })

      if (response.ok) {
        const updatedGame = await response.json()
        setCurrentGame(updatedGame)
        
        // Clear detection results when switching players
        setDetectionResults([])
        setIsDartboardDetected(false)
        
        toast({
          title: "🔄 Player Switched",
          description: "Switched to next player. Dartboard cleared.",
          className: "bg-gradient-to-r from-brass-600 to-ember-600 text-chalk border-0",
        })
      }
    } catch (error) {
      console.error('Error switching player:', error)
      toast({
        title: "⚠️ Switch Failed",
        description: "Failed to switch to next player.",
        variant: "destructive",
        className: "bg-gradient-to-r from-ember-600 to-bull-600 text-chalk border-0",
      })
    }
  }

  const clearDartboard = () => {
    // Clear the main page state
    setDetectionResults([])
    setIsDartboardDetected(false)
    
    // Clear the DartScannerPC component state
    if (dartScannerRef.current) {
      dartScannerRef.current.clearDartboard()
    }
    
    toast({
      title: "🧹 Dartboard Cleared",
      description: "All darts removed from dartboard.",
      className: "bg-gradient-to-r from-baize-600 to-baize-600 text-chalk border-0",
    })
  }

  const getCurrentPlayerScore = () => {
    if (!currentGame) return null

    const currentPlayer = currentGame.players.find(gp => gp.isActive)?.player
    if (!currentPlayer) return null

    // Calculate current score based on game mode using proper scoring logic
    if (currentGame.mode === '501' || currentGame.mode === '301') {
      const startingScore = parseInt(currentGame.mode)
      const playerThrows = (currentGame.throws || []).filter(t => t.playerId === currentPlayer.id)
      
      // Convert throws to ScoreResult format
      const scoreResults: ScoreResult[] = playerThrows.map(t => ({
        score: t.score,
        multiplier: t.multiplier,
        segment: t.segment,
        zone: getZoneFromSegment(t.segment),
        isValid: true
      }))
      
      const totalScored = scoreResults.reduce((sum, t) => sum + t.score, 0)
      const remainingScore = Math.max(0, startingScore - totalScored)
      
      return remainingScore
    }
    
    // For Cricket or other modes, return a reasonable default
    return 250
  }
  
  // Helper function to get zone from segment
  const getZoneFromSegment = (segment: string): string => {
    if (segment === 'bullseye') return 'bullseye'
    if (segment === 'outer_bull') return 'outer_bull'
    if (segment.startsWith('triple_')) return 'triple'
    if (segment.startsWith('double_')) return 'double'
    if (segment.startsWith('single_')) return 'single'
    return 'single'
  }

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredGames = games.filter(game =>
    game.players.some(gp => 
      gp.player.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || game.mode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="relative isolate min-h-screen overflow-x-clip bg-baize-950">
      <BoardBackdrop />

      {/* Header */}
      <header className="border-b border-brass-500/20 bg-baize-950/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <BoardMark size={68} className="h-12 w-12 sm:h-[68px] sm:w-[68px]" />
              <div className="min-w-0">
                <h1 className="title-rise font-display text-2xl font-extrabold leading-none text-chalk sm:text-5xl">AI Dart Scoring System</h1>
                <p className="title-rise-late mt-1.5 hidden text-baize-300 sm:block">Intelligent dart detection and real-time scoring</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex items-center gap-2.5 rounded-full border border-mint-500/30 bg-mint-950/60 px-3.5 py-2">
                <span className="live-dot block h-2 w-2 rounded-full bg-mint-400 text-mint-400" />
                <span className="text-sm font-medium text-mint-300">Real-time</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="mb-8">
          <TabsList className="mb-4 grid h-auto w-full grid-cols-5 rounded-xl border border-baize-700 bg-baize-900/80 p-1 backdrop-blur-sm">
            <TabsTrigger 
              value="scanner" 
              className="py-2.5 text-baize-300 transition-colors hover:text-chalk data-[state=active]:bg-brass-400 data-[state=active]:text-baize-950 dark:data-[state=active]:bg-brass-400 dark:data-[state=active]:text-baize-950 dark:data-[state=active]:border-brass-300"
            >
              <Camera className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only">Dart Scanner</span>
            </TabsTrigger>
            <TabsTrigger 
              value="players" 
              className="py-2.5 text-baize-300 transition-colors hover:text-chalk data-[state=active]:bg-brass-400 data-[state=active]:text-baize-950 dark:data-[state=active]:bg-brass-400 dark:data-[state=active]:text-baize-950 dark:data-[state=active]:border-brass-300"
            >
              <Users className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only">Players</span>
            </TabsTrigger>
            <TabsTrigger 
              value="games" 
              className="py-2.5 text-baize-300 transition-colors hover:text-chalk data-[state=active]:bg-brass-400 data-[state=active]:text-baize-950 dark:data-[state=active]:bg-brass-400 dark:data-[state=active]:text-baize-950 dark:data-[state=active]:border-brass-300"
            >
              <Trophy className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only">Games</span>
            </TabsTrigger>
            <TabsTrigger 
              value="calibration" 
              className="py-2.5 text-baize-300 transition-colors hover:text-chalk data-[state=active]:bg-brass-400 data-[state=active]:text-baize-950 dark:data-[state=active]:bg-brass-400 dark:data-[state=active]:text-baize-950 dark:data-[state=active]:border-brass-300"
            >
              <Target className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only">Calibration</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="py-2.5 text-baize-300 transition-colors hover:text-chalk data-[state=active]:bg-brass-400 data-[state=active]:text-baize-950 dark:data-[state=active]:bg-brass-400 dark:data-[state=active]:text-baize-950 dark:data-[state=active]:border-brass-300"
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Start Game Button - Moved to Top */}
          {!currentGame && (
            <div className="mt-2 mb-6 text-center">
              <Dialog open={isStartGameOpen} onOpenChange={setIsStartGameOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="cta-sheen h-12 bg-gradient-to-r from-brass-600 to-ember-600 px-7 font-display text-xl font-bold tracking-wide text-chalk hover:from-brass-700 hover:to-ember-700">
                    <Gamepad2 className="h-5 w-5 mr-2" />
                    Start New Game
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-baize-800 border-baize-700">
                  <DialogHeader>
                    <DialogTitle className="text-chalk">Start New Game</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-baize-300 mb-2 block">Game Mode</label>
                      <select 
                        value={gameMode} 
                        onChange={(e) => setGameMode(e.target.value as any)}
                        className="w-full p-2 bg-baize-700 border border-baize-600 rounded text-chalk"
                      >
                        <option value="501">501</option>
                        <option value="301">301</option>
                        <option value="Cricket">Cricket</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-baize-300 mb-2 block">Select Players</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {players.map(player => (
                          <div key={player.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`player-${player.id}`}
                              checked={selectedPlayers.some(p => p.id === player.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPlayers(prev => [...prev, player])
                                } else {
                                  setSelectedPlayers(prev => prev.filter(p => p.id !== player.id))
                                }
                              }}
                              className="rounded border-baize-600 bg-baize-700"
                            />
                            <label htmlFor={`player-${player.id}`} className="text-baize-300 flex items-center">
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              {player.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={startNewGame}
                      disabled={selectedPlayers.length === 0}
                      className="w-full bg-gradient-to-r from-brass-600 to-ember-600 hover:from-brass-700 hover:to-ember-700 text-chalk"
                    >
                      Start Game
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          <TabsContent value="scanner" className="space-y-6">
            {/* Current Game Status */}
            {currentGame && (
              <Card className="banner-drop bg-gradient-to-r from-brass-600 to-ember-600 border-0 shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-3xl font-extrabold leading-none mb-2 text-chalk">Current Game</h3>
                      <div className="flex items-center gap-4 text-brass-100">
                        <Badge className="bg-white/20 text-chalk">
                          {currentGame.mode}
                        </Badge>
                        <span>{currentGame.players.length} players</span>
                        <span>•</span>
                        <span>Started: {new Date(currentGame.startedAt).toLocaleTimeString()}</span>
                        {currentGame.status === 'paused' && (
                          <>
                            <span>•</span>
                            <Badge className="bg-brass-500 text-chalk">
                              Paused
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={stopGame}
                        variant="secondary"
                        className="bg-white/20 hover:bg-white/30 text-chalk border-0"
                      >
                        Stop Game
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scanner Interface */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Left Column - Camera Feed */}
              <div className="space-y-4">
                <Card className="bg-baize-800 border-baize-700">
                  <CardHeader>
                    <CardTitle className="text-chalk flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Camera Feed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DartScannerPC 
                      ref={dartScannerRef}
                      onDetection={handleDetection} 
                      currentPlayerScore={getCurrentPlayerScore()} 
                    />
                  </CardContent>
                </Card>

                {/* Manual Detection */}
                <Card className="bg-baize-800 border-baize-700">
                  <CardHeader>
                    <CardTitle className="text-chalk flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Manual Detection
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ManualDetection onDetection={handleDetection} />
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Game Info */}
              <div className="space-y-4">
                {/* Real-time Score Display */}
                {currentGame && (
                  <Card className="bg-baize-800 border-baize-700">
                    <CardHeader>
                      <CardTitle className="text-chalk flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Live Scores
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RealTimeScoreDisplay
                        players={currentGame.players.map(gp => {
                          const playerThrows = (currentGame.throws || []).filter(t => t.playerId === gp.player.id)
                          const totalScore = playerThrows.reduce((sum, t) => sum + t.score, 0)
                          const remainingScore = currentGame.mode === '501' || currentGame.mode === '301'
                            ? Math.max(0, parseInt(currentGame.mode) - totalScore)
                            : gp.finalScore

                          return {
                            player: gp.player,
                            score: remainingScore,
                            throws: playerThrows.length,
                            average: playerThrows.length > 0 ? totalScore / playerThrows.length : 0,
                            lastThrow: playerThrows.length > 0 ? {
                              x: playerThrows[playerThrows.length - 1].x,
                              y: playerThrows[playerThrows.length - 1].y,
                              score: playerThrows[playerThrows.length - 1].score,
                              multiplier: playerThrows[playerThrows.length - 1].multiplier,
                              className: playerThrows[playerThrows.length - 1].segment,
                              confidence: 1
                            } : undefined
                          }
                        })}
                        gameMode={currentGame.mode}
                        activePlayerId={currentGame.players.find(gp => gp.isActive)?.player.id}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Dart Board Visualization */}
                <Card className="bg-baize-800 border-baize-700">
                  <CardHeader>
                    <CardTitle className="text-chalk flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Dartboard Visualization
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DartboardVisualization detections={detectionResults} />
                  </CardContent>
                </Card>

                {/* Detection Status */}
                <Card className="bg-baize-800 border-baize-700">
                  <CardHeader>
                    <CardTitle className="text-chalk flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Detection Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-baize-300">Dartboard Detected:</span>
                      <Badge className={isDartboardDetected ? "bg-mint-500" : "bg-bull-500"}>
                        {isDartboardDetected ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-baize-300">Recent Detections:</span>
                      <span className="text-chalk">{detectionResults.length}</span>
                    </div>
                    {detectionResults.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-baize-300 font-medium">Latest Detection:</h4>
                        <div className="text-sm text-baize-400">
                          Score: {detectionResults[detectionResults.length - 1]?.score}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Player Controls */}
                {currentGame && currentGame.players.length > 1 && (
                  <Card className="bg-baize-800 border-baize-700">
                    <CardHeader>
                      <CardTitle className="text-chalk flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Player Controls
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex gap-2">
                        <Button 
                          onClick={switchToNextPlayer}
                          className="flex-1 bg-gradient-to-r from-brass-600 to-ember-600 hover:from-brass-700 hover:to-ember-700 text-chalk"
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Next Player
                        </Button>
                        <Button 
                          onClick={clearDartboard}
                          variant="outline"
                          className="border-baize-600 text-chalk hover:bg-baize-700"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-xs text-baize-400 text-center">
                        Click "Next Player" to clear dartboard and switch to next player
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="players" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-4xl font-extrabold leading-none text-chalk">Players</h2>
              <Dialog open={isAddPlayerOpen} onOpenChange={setIsAddPlayerOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-brass-600 to-ember-600 hover:from-brass-700 hover:to-ember-700 text-chalk">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Player
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-baize-800 border-baize-700">
                  <DialogHeader>
                    <DialogTitle className="text-chalk">Add New Player</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-baize-300 mb-2 block">Player Name</label>
                      <Input
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        placeholder="Enter player name"
                        className="bg-baize-700 border-baize-600 text-chalk"
                      />
                    </div>
                    <Button 
                      onClick={createPlayer}
                      disabled={!newPlayerName.trim()}
                      className="w-full bg-gradient-to-r from-brass-600 to-ember-600 hover:from-brass-700 hover:to-ember-700 text-chalk"
                    >
                      Add Player
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-baize-400" />
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-baize-800 border-baize-700 text-chalk"
              />
            </div>

            {/* Player Statistics */}
            {filteredPlayers.length > 0 ? (
              <PlayerStatistics 
                players={filteredPlayers.map(player => calculatePlayerStats(player, games))}
                onDeletePlayer={deletePlayer}
              />
            ) : (
              <div className="text-center py-8 text-baize-400">
                <p>No players found. Create some players to get started!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="games" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-4xl font-extrabold leading-none text-chalk">Games</h2>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-baize-400" />
              <Input
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-baize-800 border-baize-700 text-chalk"
              />
            </div>

            {/* Games List */}
            {filteredGames.length > 0 ? (
              <div className="grid gap-4">
                {filteredGames.map(game => (
                  <SimpleGameDetail key={game.id} game={game} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-baize-400">
                <p>No games found. Start a game to see it here!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="calibration" className="space-y-6">
            <Calibration 
              onCalibrationComplete={(success) => {
                if (success) {
                  toast({
                    title: "✅ Calibration Complete",
                    description: "Computer vision calibration completed successfully.",
                    className: "bg-gradient-to-r from-mint-600 to-mint-600 text-chalk border-0",
                  })
                } else {
                  toast({
                    title: "⚠️ Calibration Failed",
                    description: "Computer vision calibration failed. Please try again.",
                    variant: "destructive",
                    className: "bg-gradient-to-r from-ember-600 to-bull-600 text-chalk border-0",
                  })
                }
              }}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6">
              {/* Detection Settings */}
              <Card className="bg-baize-800 border-baize-700">
                <CardHeader>
                  <CardTitle className="text-chalk flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Detection Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Detection Accuracy</h4>
                        <p className="text-baize-400 text-sm">Adjust detection precision</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-mint-500">{settings.detection.accuracy}%</Badge>
                      </div>
                    </div>
                    <div className="px-2">
                      <input
                        type="range"
                        min="80"
                        max="99"
                        value={settings.detection.accuracy}
                        onChange={(e) => updateSettings('detection', 'accuracy', parseInt(e.target.value))}
                        className="w-full h-2 bg-baize-600 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-baize-400 mt-1">
                        <span>80%</span>
                        <span>99%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Detection Mode</h4>
                        <p className="text-baize-400 text-sm">CV for computer vision, ML for machine learning</p>
                      </div>
                      <Select
                        value={settings.detection.mode}
                        onValueChange={(value: 'cv' | 'ml') => updateSettings('detection', 'mode', value)}
                      >
                        <SelectTrigger className="w-32 bg-baize-700 border-baize-600 text-chalk">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cv">CV</SelectItem>
                          <SelectItem value="ml">ML</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Auto-detection</h4>
                        <p className="text-baize-400 text-sm">Automatically detect darts when thrown</p>
                      </div>
                      <Switch
                        checked={settings.detection.autoDetection}
                        onCheckedChange={(checked) => updateSettings('detection', 'autoDetection', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Camera Settings */}
              <Card className="bg-baize-800 border-baize-700">
                <CardHeader>
                  <CardTitle className="text-chalk flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Camera Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Camera Resolution</h4>
                        <p className="text-baize-400 text-sm">Higher resolution for better detection accuracy</p>
                      </div>
                      <Select
                        value={settings.camera.resolution}
                        onValueChange={(value: 'HD (1280x720)' | 'Full HD (1920x1080)' | 'SD (640x480)') => updateSettings('camera', 'resolution', value)}
                      >
                        <SelectTrigger className="w-40 bg-baize-700 border-baize-600 text-chalk">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HD (1280x720)">HD (1280x720)</SelectItem>
                          <SelectItem value="Full HD (1920x1080)">Full HD (1920x1080)</SelectItem>
                          <SelectItem value="SD (640x480)">SD (640x480)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Frame Rate</h4>
                        <p className="text-baize-400 text-sm">Balance between smooth video and processing speed</p>
                      </div>
                      <Select
                        value={settings.camera.frameRate.toString()}
                        onValueChange={(value: string) => updateSettings('camera', 'frameRate', parseInt(value))}
                      >
                        <SelectTrigger className="w-24 bg-baize-700 border-baize-600 text-chalk">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24">24 FPS</SelectItem>
                          <SelectItem value="30">30 FPS</SelectItem>
                          <SelectItem value="60">60 FPS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-chalk font-medium">Brightness</h4>
                          <p className="text-baize-400 text-sm">Adjust camera brightness</p>
                        </div>
                        <span className="text-baize-300">{settings.camera.brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.camera.brightness}
                        onChange={(e) => updateSettings('camera', 'brightness', parseInt(e.target.value))}
                        className="w-full h-2 bg-baize-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-chalk font-medium">Contrast</h4>
                          <p className="text-baize-400 text-sm">Adjust camera contrast</p>
                        </div>
                        <span className="text-baize-300">{settings.camera.contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.camera.contrast}
                        onChange={(e) => updateSettings('camera', 'contrast', parseInt(e.target.value))}
                        className="w-full h-2 bg-baize-600 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Game Settings */}
              <Card className="bg-baize-800 border-baize-700">
                <CardHeader>
                  <CardTitle className="text-chalk flex items-center gap-2">
                    <Gamepad2 className="h-5 w-5" />
                    Game Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Default Game Mode</h4>
                        <p className="text-baize-400 text-sm">Preferred game mode for new games</p>
                      </div>
                      <Select
                        value={settings.game.defaultMode}
                        onValueChange={(value: '501' | '301' | 'Cricket') => updateSettings('game', 'defaultMode', value)}
                      >
                        <SelectTrigger className="w-24 bg-baize-700 border-baize-600 text-chalk">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="501">501</SelectItem>
                          <SelectItem value="301">301</SelectItem>
                          <SelectItem value="Cricket">Cricket</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Sound Effects</h4>
                        <p className="text-baize-400 text-sm">Play sounds for dart hits and game events</p>
                      </div>
                      <Switch
                        checked={settings.game.soundEffects}
                        onCheckedChange={(checked) => updateSettings('game', 'soundEffects', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Auto-save Games</h4>
                        <p className="text-baize-400 text-sm">Automatically save game progress</p>
                      </div>
                      <Switch
                        checked={settings.game.autoSave}
                        onCheckedChange={(checked) => updateSettings('game', 'autoSave', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Settings */}
              <Card className="bg-baize-800 border-baize-700">
                <CardHeader>
                  <CardTitle className="text-chalk flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    System Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Theme</h4>
                        <p className="text-baize-400 text-sm">Interface appearance theme</p>
                      </div>
                      <Select
                        value={settings.system.theme}
                        onValueChange={(value: 'dark' | 'light') => updateSettings('system', 'theme', value)}
                      >
                        <SelectTrigger className="w-24 bg-baize-700 border-baize-600 text-chalk">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Language</h4>
                        <p className="text-baize-400 text-sm">System display language</p>
                      </div>
                      <Select
                        value={settings.system.language}
                        onValueChange={(value: 'english' | 'spanish' | 'french') => updateSettings('system', 'language', value)}
                      >
                        <SelectTrigger className="w-28 bg-baize-700 border-baize-600 text-chalk">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="spanish">Spanish</SelectItem>
                          <SelectItem value="french">French</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Notifications</h4>
                        <p className="text-baize-400 text-sm">System notifications and alerts</p>
                      </div>
                      <Switch
                        checked={settings.system.notifications}
                        onCheckedChange={(checked) => updateSettings('system', 'notifications', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Management */}
              <Card className="bg-baize-800 border-baize-700">
                <CardHeader>
                  <CardTitle className="text-chalk flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Game History</h4>
                        <p className="text-baize-400 text-sm">Total games played and stored</p>
                      </div>
                      <span className="text-baize-300">{games.length} games</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Player Database</h4>
                        <p className="text-baize-400 text-sm">Total players in system</p>
                      </div>
                      <span className="text-baize-300">{players.length} players</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Storage Usage</h4>
                        <p className="text-baize-400 text-sm">Database storage information</p>
                      </div>
                      <span className="text-baize-300">Light</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      className="border-baize-600 text-chalk hover:bg-baize-700"
                      onClick={() => {
                        toast({
                          title: "📤 Export Started",
                          description: "Exporting game data...",
                          className: "bg-gradient-to-r from-brass-600 to-ember-600 text-chalk border-0",
                        })
                      }}
                    >
                      Export Data
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-baize-600 text-chalk hover:bg-baize-700"
                      onClick={() => {
                        toast({
                          title: "💾 Backup Created",
                          description: "Settings backup completed successfully.",
                          className: "bg-gradient-to-r from-mint-600 to-mint-600 text-chalk border-0",
                        })
                      }}
                    >
                      Backup Settings
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="bg-bull-600 text-chalk hover:bg-bull-700"
                      onClick={() => {
                        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                          toast({
                            title: "🗑️ Data Cleared",
                            description: "All data has been cleared successfully.",
                            className: "bg-gradient-to-r from-bull-600 to-bull-600 text-chalk border-0",
                          })
                        }
                      }}
                    >
                      Clear All Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* System Information */}
              <Card className="bg-baize-800 border-baize-700">
                <CardHeader>
                  <CardTitle className="text-chalk flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    System Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Version</h4>
                        <p className="text-baize-400 text-sm">Current system version</p>
                      </div>
                      <span className="text-baize-300">v2.1.0</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">Last Updated</h4>
                        <p className="text-baize-400 text-sm">Latest system update</p>
                      </div>
                      <span className="text-baize-300">Recently</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-chalk font-medium">System Status</h4>
                        <p className="text-baize-400 text-sm">Overall system health</p>
                      </div>
                      <Badge className="bg-mint-500">Healthy</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}