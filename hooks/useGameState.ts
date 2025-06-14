import { useState } from 'react';
import { GameScore, MedicalCase } from '../utils/gameData';

export type GameState = 'login' | 'idle' | 'awaiting_test' | 'awaiting_diagnosis';

interface GameStateHook {
  gameState: GameState;
  username: string;
  currentCase: MedicalCase | null;
  currentScore: GameScore;
  totalScore: number;
  casesCompleted: number;
  setGameState: (state: GameState) => void;
  setUsername: (username: string) => void;
  setCurrentCase: (medicalCase: MedicalCase | null) => void;
  setCurrentScore: (score: GameScore) => void;
  updateTotalScore: (points: number) => void;
  incrementCasesCompleted: () => void;
  resetCurrentScore: () => void;
}

export function useGameState(): GameStateHook {
  const [gameState, setGameState] = useState<GameState>('login');
  const [username, setUsername] = useState('');
  const [currentCase, setCurrentCase] = useState<MedicalCase | null>(null);
  const [currentScore, setCurrentScore] = useState<GameScore>({
    testPoints: 0,
    diagnosisPoints: 0,
    testAttempts: 0,
    diagnosisAttempts: 0,
    totalPoints: 0
  });
  const [totalScore, setTotalScore] = useState(0);
  const [casesCompleted, setCasesCompleted] = useState(0);

  const updateTotalScore = (points: number) => {
    setTotalScore(prev => prev + points);
  };

  const incrementCasesCompleted = () => {
    setCasesCompleted(prev => prev + 1);
  };

  const resetCurrentScore = () => {
    setCurrentScore({
      testPoints: 0,
      diagnosisPoints: 0,
      testAttempts: 0,
      diagnosisAttempts: 0,
      totalPoints: 0
    });
  };

  return {
    gameState,
    username,
    currentCase,
    currentScore,
    totalScore,
    casesCompleted,
    setGameState,
    setUsername,
    setCurrentCase,
    setCurrentScore,
    updateTotalScore,
    incrementCasesCompleted,
    resetCurrentScore
  };
} 