import { GameState, Player, DetectedDart } from './types';

export class GameEngine {
  private gameState: GameState;
  private listeners: ((state: GameState) => void)[] = [];

  constructor() {
    this.gameState = {
      gameType: '501',
      players: [],
      currentPlayerIndex: 0,
      currentThrow: 1,
      gameStarted: false,
      gameEnded: false
    };
  }

  initializeGame(gameType: '501' | 'cricket' | 'around_the_clock', playerNames: string[]): void {
    const players: Player[] = playerNames.map((name, index) => ({
      id: `player_${index}`,
      name,
      score: gameType === '501' ? 501 : 0,
      throws: [],
      currentTurn: index === 0
    }));

    this.gameState = {
      gameType,
      players,
      currentPlayerIndex: 0,
      currentThrow: 1,
      gameStarted: true,
      gameEnded: false
    };

    this.notifyListeners();
  }

  processThrow(dart: DetectedDart): boolean {
    if (!this.gameState.gameStarted || this.gameState.gameEnded) {
      return false;
    }

    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    currentPlayer.throws.push(dart);

    // Update score based on game type
    switch (this.gameState.gameType) {
      case '501':
        this.process501Throw(currentPlayer, dart);
        break;
      case 'cricket':
        this.processCricketThrow(currentPlayer, dart);
        break;
      case 'around_the_clock':
        this.processAroundClockThrow(currentPlayer, dart);
        break;
    }

    // Check for winner
    if (this.checkWinner()) {
      this.gameState.gameEnded = true;
      this.gameState.winner = currentPlayer.name;
    }

    // Move to next throw or player
    this.advanceTurn();
    this.notifyListeners();
    
    return true;
  }

  private process501Throw(player: Player, dart: DetectedDart): void {
    const newScore = player.score - dart.score;
    
    // Must finish exactly on 0 with a double or bullseye
    if (newScore === 0 && (dart.multiplier === 'double' || dart.multiplier === 'bullseye')) {
      player.score = 0;
    } else if (newScore < 0 || newScore === 1) {
      // Bust - score remains unchanged, end turn
      this.endPlayerTurn();
    } else {
      player.score = newScore;
    }
  }

  private processCricketThrow(player: Player, dart: DetectedDart): void {
    // Cricket numbers: 15, 16, 17, 18, 19, 20, bullseye (25)
    const cricketNumbers = [15, 16, 17, 18, 19, 20, 25];
    const dartNumber = this.extractNumberFromZone(dart.zone);
    
    if (cricketNumbers.includes(dartNumber)) {
      // For simplicity, we'll track hits in the score field
      // In a full implementation, you'd have a separate cricket tracking system
      let hits = 1;
      if (dart.multiplier === 'double') hits = 2;
      if (dart.multiplier === 'triple') hits = 3;
      
      player.score += dartNumber * hits; // Simplified cricket scoring
    }
  }

  private processAroundClockThrow(player: Player, dart: DetectedDart): void {
    const dartNumber = this.extractNumberFromZone(dart.zone);
    const targetNumber = (player.score % 20) + 1;
    
    if (dartNumber === targetNumber) {
      player.score++;
    }
  }

  private extractNumberFromZone(zone: string): number {
    if (zone === 'bullseye' || zone === 'outer_bull') return 25;
    if (zone === 'miss') return 0;
    
    const match = zone.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  private checkWinner(): boolean {
    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    
    switch (this.gameState.gameType) {
      case '501':
        return currentPlayer.score === 0;
      case 'cricket':
        // Simplified: first to 500 points wins
        return currentPlayer.score >= 500;
      case 'around_the_clock':
        return currentPlayer.score > 20;
      default:
        return false;
    }
  }

  private advanceTurn(): void {
    this.gameState.currentThrow++;
    
    if (this.gameState.currentThrow > 3) {
      this.endPlayerTurn();
    }
  }

  private endPlayerTurn(): void {
    // Reset current player's turn status
    this.gameState.players[this.gameState.currentPlayerIndex].currentTurn = false;
    
    // Move to next player
    this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
    this.gameState.currentThrow = 1;
    
    // Set new current player
    this.gameState.players[this.gameState.currentPlayerIndex].currentTurn = true;
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }

  resetGame(): void {
    this.gameState = {
      gameType: '501',
      players: [],
      currentPlayerIndex: 0,
      currentThrow: 1,
      gameStarted: false,
      gameEnded: false
    };
    this.notifyListeners();
  }

  addListener(listener: (state: GameState) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (state: GameState) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.gameState));
  }
}

export const gameEngine = new GameEngine();