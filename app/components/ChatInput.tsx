import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GameState } from '../hooks/useGameState';

interface ChatInputProps {
  inputText: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  gameState: GameState;
}

export default function ChatInput({ inputText, onChangeText, onSend, gameState }: ChatInputProps) {
  const getPlaceholder = () => {
    switch (gameState) {
      case 'login':
        return "Enter your username...";
      case 'idle':
        return "Type 'start', 'help', or 'score'...";
      case 'awaiting_test':
        return "Enter recommended tests...";
      case 'awaiting_diagnosis':
        return "Enter your diagnosis...";
    }
  };

  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        value={inputText}
        onChangeText={onChangeText}
        placeholder={getPlaceholder()}
        onSubmitEditing={onSend}
        multiline
      />
      <TouchableOpacity style={styles.sendButton} onPress={onSend}>
        <Text style={styles.sendButtonText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 