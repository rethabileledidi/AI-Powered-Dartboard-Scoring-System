import { useState, useEffect } from 'react';
import { GameState } from '@/lib/types';
import { gameEngine } from '@/lib/game-engine';

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(gameEngine.getGameState());

  useEffect(() => {
    const handleGameStateChange = (newState: GameState) => {
      setGameState(newState);
    };

    gameEngine.addListener(handleGameStateChange);
    
    return () => {
      gameEngine.removeListener(handleGameStateChange);
    };
  }, []);

  return gameState;
};