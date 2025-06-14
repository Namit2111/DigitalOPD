import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { gameApi } from '../services/gameApi';
import {
  GameScore,
  MedicalCase,
  calculateScore,
  checkAnswer,
  getRandomCase,
  helpMessage,
  isContraIndicated,
  welcomeMessage
} from '../utils/gameData';

interface Message {
  text: string;
  sender: 'user' | 'bot';
}

type GameState = 'login' | 'idle' | 'awaiting_test' | 'awaiting_diagnosis';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentCase, setCurrentCase] = useState<MedicalCase | null>(null);
  const [gameState, setGameState] = useState<GameState>('login');
  const [username, setUsername] = useState('');
  const [currentScore, setCurrentScore] = useState<GameScore>({
    testPoints: 0,
    diagnosisPoints: 0,
    testAttempts: 0,
    diagnosisAttempts: 0,
    totalPoints: 0
  });
  const [totalScore, setTotalScore] = useState(0);
  const [casesCompleted, setCasesCompleted] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (gameState === 'login') {
      addBotMessage("👋 Welcome! Please enter your username to start the game.");
    }
  }, []);

  const addBotMessage = (text: string) => {
    setMessages(prev => [...prev, { text, sender: 'bot' }]);
  };

  const addUserMessage = (text: string) => {
    setMessages(prev => [...prev, { text, sender: 'user' }]);
  };

  const handleLogin = async (username: string) => {
    try {
      await gameApi.startSession(username);
      setGameState('idle');
      addBotMessage(welcomeMessage);
      setUsername(username);
    } catch (error) {
      console.error('Login error:', error);
      addBotMessage("Sorry, there was an error starting your session. Please try again.");
    }
  };

  const startNewCase = async () => {
    const newCase = getRandomCase();
    setCurrentCase(newCase);
    setGameState('awaiting_test');
    setCurrentScore({
      testPoints: 0,
      diagnosisPoints: 0,
      testAttempts: 0,
      diagnosisAttempts: 0,
      totalPoints: 0
    });

    try {
      await gameApi.startCase(newCase.correctDiagnosis);
      await gameApi.logAction('START_CASE', { 
        caseId: newCase.correctDiagnosis,
        patientAge: newCase.patient.age,
        patientGender: newCase.patient.gender
      });
    } catch (error) {
      console.error('Error starting case:', error);
    }
    
    const caseIntro = `🏥 New Patient Case #${casesCompleted + 1}

Age: ${newCase.patient.age}
Gender: ${newCase.patient.gender}
${newCase.patient.history !== '—' ? `History: ${newCase.patient.history}` : ''}
${newCase.patient.symptoms !== '—' ? `Symptoms: ${newCase.patient.symptoms}` : ''}
Additional Findings: ${newCase.patient.additionalInfo}

👨‍⚕️ What tests would you recommend for this patient? Please explain your reasoning.`;
    
    addBotMessage(caseIntro);
  };

  const handleTestAnswer = async (userInput: string) => {
    if (!currentCase) return;

    const newScore = { ...currentScore };
    newScore.testAttempts++;

    try {
      await gameApi.logAction('SUBMIT_TEST', {
        attempt: newScore.testAttempts,
        userInput,
        isContraIndicated: isContraIndicated(userInput, currentCase.contraIndications)
      });
    } catch (error) {
      console.error('Error logging test attempt:', error);
    }

    if (isContraIndicated(userInput, currentCase.contraIndications)) {
      addBotMessage(`⚠️ Warning: Your suggested test is contra-indicated for this patient! (0 points)
      
Reason: This could be harmful or inappropriate.
The correct test would be: ${currentCase.correctTest}

Now, based on the correct test results, what's your diagnosis? Please explain your reasoning.`);
      newScore.testPoints = 0;
      setCurrentScore(newScore);
      setGameState('awaiting_diagnosis');
      return;
    }

    const accuracy = checkAnswer(userInput, currentCase.correctTest);
    let response = '';

    if (accuracy >= 0.7) {
      const points = calculateScore(newScore.testAttempts);
      newScore.testPoints = points;
      response = `✅ Excellent choice of tests! The ${currentCase.correctTest} is indeed the most appropriate approach.
      
💯 You earned ${points} points for test selection${newScore.testAttempts > 1 ? ` (-${(newScore.testAttempts - 1) * 2} for extra attempts)` : '!'}

Based on the test results and patient information, what's your diagnosis? Please explain your reasoning.`;
      setGameState('awaiting_diagnosis');
    } else if (accuracy >= 0.4) {
      response = `🤔 You're on the right track, but not quite there. The most appropriate test would be ${currentCase.correctTest}.

Try again or type "proceed" to move on to diagnosis.`;
    } else {
      response = `❌ That's not quite right. The appropriate test in this case would be ${currentCase.correctTest}. Here's why:
- It's the most direct way to assess the patient's condition
- It provides crucial diagnostic information
- It helps rule out other potential conditions

Try again or type "proceed" to move on to diagnosis.`;
    }

    addBotMessage(response);
    setCurrentScore(newScore);
  };

  const handleDiagnosisAnswer = async (userInput: string) => {
    if (!currentCase) return;

    const newScore = { ...currentScore };
    newScore.diagnosisAttempts++;

    try {
      await gameApi.logAction('SUBMIT_DIAGNOSIS', {
        attempt: newScore.diagnosisAttempts,
        userInput
      });
    } catch (error) {
      console.error('Error logging diagnosis attempt:', error);
    }

    const accuracy = checkAnswer(userInput, currentCase.correctDiagnosis);
    let response = '';

    if (accuracy >= 0.7) {
      const points = calculateScore(newScore.diagnosisAttempts);
      newScore.diagnosisPoints = points;
      newScore.totalPoints = newScore.testPoints + points;
      
      response = `🎉 Outstanding diagnosis! Yes, this is a case of ${currentCase.correctDiagnosis}.

📊 Case Score Breakdown:
• Test Selection: ${newScore.testPoints}/5 points
• Diagnosis: ${points}/5 points
• Total: ${newScore.totalPoints}/10 points

Your clinical reasoning was spot on! Type "new case" when ready for the next patient.`;

      try {
        await gameApi.completeCase(
          newScore.testAttempts,
          newScore.diagnosisAttempts,
          newScore.testPoints,
          newScore.diagnosisPoints,
          newScore.totalPoints
        );
      } catch (error) {
        console.error('Error completing case:', error);
      }

      setTotalScore(prev => prev + newScore.totalPoints);
      setCasesCompleted(prev => prev + 1);
      setGameState('idle');
      setCurrentCase(null);
    } else if (accuracy >= 0.4) {
      response = `🤔 You're getting warm! Try again or type "proceed" to see the correct diagnosis.`;
    } else {
      response = `❌ Not quite. Try again or type "proceed" to see the correct diagnosis.`;
    }

    addBotMessage(response);
    setCurrentScore(newScore);
  };

  const handleSend = async () => {
    if (inputText.trim() === '') return;

    const userInput = inputText.trim();
    addUserMessage(userInput);
    setInputText('');

    if (gameState === 'login') {
      await handleLogin(userInput);
      return;
    }

    // Handle commands in idle state
    if (gameState === 'idle') {
      const command = userInput.toLowerCase();
      if (command === 'start' || command === 'new case') {
        startNewCase();
      } else if (command === 'help') {
        await gameApi.logAction('VIEW_HELP', {});
        addBotMessage(helpMessage);
      } else if (command === 'score') {
        try {
          const stats = await gameApi.getUserStats();
          addBotMessage(`📊 Your Performance:
• Total Score: ${stats.total_score} points
• Cases Completed: ${stats.total_cases}
• Average Score: ${stats.avg_score_per_case} points per case`);
        } catch (error) {
          console.error('Error fetching stats:', error);
          addBotMessage("Sorry, there was an error fetching your statistics.");
        }
      } else if (command === 'quit') {
        try {
          await gameApi.endSession(totalScore, casesCompleted);
          const stats = await gameApi.getUserStats();
          addBotMessage(`👋 Thanks for practicing! Here's your final score:

• Total Score: ${stats.total_score} points
• Cases Completed: ${stats.total_cases}
• Average Score: ${stats.avg_score_per_case} points per case

Come back anytime to improve your diagnostic skills!`);
        } catch (error) {
          console.error('Error ending session:', error);
          addBotMessage("Thanks for practicing! Come back anytime to improve your diagnostic skills.");
        }
      } else {
        addBotMessage("Type 'start' or 'new case' to begin, 'help' for instructions, 'score' to see your performance, or 'quit' to end the session.");
      }
      return;
    }

    // Handle "proceed" command
    if (userInput.toLowerCase() === 'proceed') {
      await gameApi.logAction('SKIP_STEP', { 
        stage: gameState === 'awaiting_test' ? 'test' : 'diagnosis'
      });

      if (gameState === 'awaiting_test') {
        const newScore = { ...currentScore };
        newScore.testPoints = 0;
        setCurrentScore(newScore);
        setGameState('awaiting_diagnosis');
        addBotMessage(`The correct test would be: ${currentCase?.correctTest}

Now, what's your diagnosis? Please explain your reasoning.`);
      } else if (gameState === 'awaiting_diagnosis') {
        const newScore = { ...currentScore };
        newScore.diagnosisPoints = 0;
        newScore.totalPoints = newScore.testPoints;
        
        try {
          await gameApi.completeCase(
            newScore.testAttempts,
            newScore.diagnosisAttempts,
            newScore.testPoints,
            0,
            newScore.totalPoints
          );
        } catch (error) {
          console.error('Error completing case:', error);
        }

        setCurrentScore(newScore);
        setTotalScore(prev => prev + newScore.totalPoints);
        setCasesCompleted(prev => prev + 1);
        
        addBotMessage(`The correct diagnosis is: ${currentCase?.correctDiagnosis}

📊 Case Score Breakdown:
• Test Selection: ${newScore.testPoints}/5 points
• Diagnosis: 0/5 points
• Total: ${newScore.totalPoints}/10 points

Type "new case" when you're ready to try another case.`);
        
        setGameState('idle');
        setCurrentCase(null);
      }
      return;
    }

    // Handle game responses
    if (gameState === 'awaiting_test') {
      await handleTestAnswer(userInput);
    } else if (gameState === 'awaiting_diagnosis') {
      await handleDiagnosisAnswer(userInput);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Medical Diagnosis Trainer</Text>
        <Text style={styles.subHeaderText}>
          {gameState === 'login' ? 'Welcome!' :
           gameState === 'idle' ? `Score: ${totalScore} pts | Cases: ${casesCompleted}` :
           gameState === 'awaiting_test' ? 'Suggesting Tests' : 'Making Diagnosis'
          }
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
            gameState === 'login' ? "Enter your username..." :
            gameState === 'idle' ? "Type 'start', 'help', or 'score'..." :
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