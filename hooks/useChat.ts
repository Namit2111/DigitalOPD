import { useState } from 'react';

export interface Message {
  text: string;
  sender: 'user' | 'bot';
}

interface ChatHook {
  messages: Message[];
  addBotMessage: (text: string) => void;
  addUserMessage: (text: string) => void;
}

export function useChat(): ChatHook {
  const [messages, setMessages] = useState<Message[]>([]);

  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, { text, sender: 'bot' }]);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { text, sender: 'user' }]);
  };

  return {
    messages,
    addBotMessage,
    addUserMessage
  };
} 