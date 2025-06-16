import React from 'react';
import { Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
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
        placeholder="Ask anything..."
        onSubmitEditing={onSend}
        multiline
        placeholderTextColor="#666"
      />
      <TouchableOpacity style={styles.sendButton} onPress={onSend}>
        <Image 
          source={require('../assets/images/send.png')} 
          style={styles.sendIcon}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100, // Limits how tall the input can get
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0084ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    width: 20,
    height: 20,
    tintColor: '#fff', // Makes the icon white
  }
}); 