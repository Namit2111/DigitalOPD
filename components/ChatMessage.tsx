import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Message } from '../hooks/useChat';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  return (
    <View
      style={[
        styles.messageBox,
        message.sender === 'user' ? styles.userMessage : styles.botMessage,
      ]}
    >
      <Text style={[
        styles.messageText,
        message.sender === 'user' ? styles.userMessageText : styles.botMessageText
      ]}>
        {message.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  messageBox: {
    padding: 10,
    marginVertical: 5,
    marginHorizontal: 10,
    maxWidth: '80%',
    borderRadius: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9ECEF',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: 'white',
  },
  botMessageText: {
    color: 'black',
  },
}); 