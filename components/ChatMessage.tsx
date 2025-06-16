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
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 16,
    maxWidth: '85%',
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0084ff',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  botMessageText: {
    color: '#333333',
  },
}); 