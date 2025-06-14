import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameState } from '../hooks/useGameState';

interface ChatHeaderProps {
  gameState: GameState;
  totalScore: number;
  casesCompleted: number;
}

export default function ChatHeader({ gameState, totalScore, casesCompleted }: ChatHeaderProps) {
  const getSubHeaderText = () => {
    switch (gameState) {
      case 'login':
        return 'Welcome!';
      case 'idle':
        return `Score: ${totalScore} pts | Cases: ${casesCompleted}`;
      case 'awaiting_test':
        return 'Suggesting Tests';
      case 'awaiting_diagnosis':
        return 'Making Diagnosis';
    }
  };

  return (
    <View style={styles.header}>
      <Text style={styles.headerText}>Medical Diagnosis Trainer</Text>
      <Text style={styles.subHeaderText}>{getSubHeaderText()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  subHeaderText: {
    fontSize: 14,
    color: '#6C757D',
    marginTop: 5,
  },
}); 