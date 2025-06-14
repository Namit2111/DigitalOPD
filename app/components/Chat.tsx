import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MedicalCase, checkAnswer, getRandomCase, helpMessage, welcomeMessage } from '../utils/gameData';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

type GameState = 'idle' | 'awaiting_test' | 'awaiting_diagnosis';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentCase, setCurrentCase] = useState<MedicalCase | null>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Show welcome message on start
    addBotMessage(welcomeMessage);
  }, []);

  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, { text, sender: 'bot' }]);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { text, sender: 'user' }]);
  };

  const startNewCase = () => {
    const newCase = getRandomCase();
    setCurrentCase(newCase);
    setGameState('awaiting_test');
    
    const caseIntro = `🏥 New Patient Case

Age: ${newCase.patient.age}
Gender: ${newCase.patient.gender}
${newCase.patient.history !== '—' ? `History: ${newCase.patient.history}` : ''}
${newCase.patient.symptoms !== '—' ? `Symptoms: ${newCase.patient.symptoms}` : ''}
Additional Findings: ${newCase.patient.additionalInfo}

👨‍⚕️ What tests would you recommend for this patient? Please explain your reasoning.`;
    
    addBotMessage(caseIntro);
  };

  const handleTestAnswer = (userInput: string) => {
    if (!currentCase) return;

    const accuracy = checkAnswer(userInput, currentCase.correctTest);
    let response = '';

    if (accuracy >= 0.7) {
      response = `✅ Excellent choice of tests! The ${currentCase.correctTest} is indeed the most appropriate approach.

Based on the test results and patient information, what's your diagnosis? Please explain your reasoning.`;
    } else if (accuracy >= 0.4) {
      response = `🤔 You're on the right track, but not quite there. The most appropriate test would be ${currentCase.correctTest}.

Now, based on these test results, what's your diagnosis? Please explain your reasoning.`;
    } else {
      response = `❌ That's not quite right. The appropriate test in this case would be ${currentCase.correctTest}. Here's why:
- It's the most direct way to assess the patient's condition
- It provides crucial diagnostic information
- It helps rule out other potential conditions

Now, with these test results, what's your diagnosis? Please explain your reasoning.`;
    }

    addBotMessage(response);
    setGameState('awaiting_diagnosis');
  };

  const handleDiagnosisAnswer = (userInput: string) => {
    if (!currentCase) return;

    const accuracy = checkAnswer(userInput, currentCase.correctDiagnosis);
    let response = '';

    if (accuracy >= 0.7) {
      response = `🎉 Outstanding diagnosis! Yes, this is a case of ${currentCase.correctDiagnosis}.

Your clinical reasoning was spot on! Would you like to try another case? Type "new case" when ready.`;
    } else if (accuracy >= 0.4) {
      response = `🤔 You're getting warm! The correct diagnosis is ${currentCase.correctDiagnosis}.

Keep practicing to improve your diagnostic skills! Type "new case" when ready for another patient.`;
    } else {
      response = `❌ Not quite. The correct diagnosis is ${currentCase.correctDiagnosis}.

Don't worry - these cases can be challenging! Each one is a learning opportunity.
Type "new case" when you're ready to try another case.`;
    }

    addBotMessage(response);
    setGameState('idle');
    setCurrentCase(null);
  };

  const handleSend = () => {
    if (inputText.trim() === '') return;

    const userInput = inputText.trim();
    addUserMessage(userInput);
    setInputText('');

    // Handle commands in idle state
    if (gameState === 'idle') {
      const command = userInput.toLowerCase();
      if (command === 'start' || command === 'new case') {
        startNewCase();
      } else if (command === 'help') {
        addBotMessage(helpMessage);
      } else if (command === 'quit') {
        addBotMessage("👋 Thanks for practicing! Come back anytime to improve your diagnostic skills.");
      } else {
        addBotMessage("Type 'start' or 'new case' to begin, 'help' for instructions, or 'quit' to end the session.");
      }
      return;
    }

    // Handle game responses
    if (gameState === 'awaiting_test') {
      handleTestAnswer(userInput);
    } else if (gameState === 'awaiting_diagnosis') {
      handleDiagnosisAnswer(userInput);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Medical Diagnosis Trainer</Text>
        <Text style={styles.subHeaderText}>
          {gameState === 'idle' ? 'Ready for a new case!' :
           gameState === 'awaiting_test' ? 'Suggesting Tests' : 'Making Diagnosis'}
        </Text>
      </View>
      <ScrollView 
        style={styles.messagesContainer}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message, index) => (
          <View
            key={index}
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
        ))}
      </ScrollView>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={
            gameState === 'idle' ? "Type 'start' or 'help'..." :
            gameState === 'awaiting_test' ? "Enter recommended tests..." :
            "Enter your diagnosis..."
          }
          onSubmitEditing={handleSend}
          multiline
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
  header: {
    padding: 15,
    backgroundColor: '#2c3e50',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subHeaderText: {
    fontSize: 14,
    color: '#ecf0f1',
    marginTop: 5,
  },
  messagesContainer: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f6fa',
  },
  messageBox: {
    maxWidth: '85%',
    padding: 15,
    marginVertical: 5,
    borderRadius: 15,
    elevation: 1,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3498db',
    borderBottomRightRadius: 5,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  botMessageText: {
    color: '#2c3e50',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#dcdde1',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f6fa',
    borderRadius: 20,
    marginRight: 10,
    maxHeight: 100,
    color: '#2c3e50',
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 