import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (inputText.trim() === '') return;

    // Add user message
    const userMessage: Message = {
      text: inputText,
      sender: 'user',
    };
    
    // Add bot response
    const botMessage: Message = {
      text: 'Hi',
      sender: 'bot',
    };

    setMessages([...messages, userMessage, botMessage]);
    setInputText('');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.messagesContainer}>
        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageBox,
              message.sender === 'user' ? styles.userMessage : styles.botMessage,
            ]}
          >
            <Text style={styles.messageText}>{message.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messagesContainer: {
    flex: 1,
    padding: 10,
  },
  messageBox: {
    maxWidth: '80%',
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  input: {
    flex: 1,
    padding: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    marginRight: 10,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
  },
}); 