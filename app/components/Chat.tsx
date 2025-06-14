import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  GameScore,
  MedicalCase,
  SCORING_CONFIG,
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

type GameState = 'idle' | 'awaiting_test' | 'awaiting_diagnosis';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentCase, setCurrentCase] = useState<MedicalCase | null>(null);
  const [gameState, setGameState] = useState<GameState>('idle');
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
    setCurrentScore({
      testPoints: 0,
      diagnosisPoints: 0,
      testAttempts: 0,
      diagnosisAttempts: 0,
      totalPoints: 0
    });
    
    const caseIntro = `🏥 New Patient Case #${casesCompleted + 1}

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

    const newScore = { ...currentScore };
    newScore.testAttempts++;

    // Check for contra-indicated tests
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
    console.log(accuracy);
    let response = '';

    if (accuracy >= 0.7) {
      const points = calculateScore(newScore.testAttempts);
      newScore.testPoints = points;
      response = `✅ Excellent choice of tests! The ${currentCase.correctTest} is indeed the most appropriate approach.
      
💯 You earned ${points} points for test selection${newScore.testAttempts > 1 ? ` (-${(newScore.testAttempts - 1) * SCORING_CONFIG.POINTS_DEDUCTION} for extra attempts)` : '!'}

Based on the test results and patient information, what's your diagnosis? Please explain your reasoning.`;
    } else if (accuracy >= 0.4) {
      response = `🤔 You're on the right track, but not quite there. The most appropriate test would be ${currentCase.correctTest}.

Try again or type "proceed" to move on to diagnosis.`;
      setCurrentScore(newScore);
      addBotMessage(response);
      return;
    } else {
      response = `❌ That's not quite right. The appropriate test in this case would be ${currentCase.correctTest}. Here's why:
- It's the most direct way to assess the patient's condition
- It provides crucial diagnostic information
- It helps rule out other potential conditions

Try again or type "proceed" to move on to diagnosis.`;
      setCurrentScore(newScore);
      addBotMessage(response);
      return;
    }

    addBotMessage(response);
    setCurrentScore(newScore);
    setGameState('awaiting_diagnosis');
  };

  const handleDiagnosisAnswer = (userInput: string) => {
    if (!currentCase) return;

    const newScore = { ...currentScore };
    newScore.diagnosisAttempts++;

    const accuracy = checkAnswer(userInput, currentCase.correctDiagnosis);
    let response = '';

    if (accuracy >= 0.7) {
      const points = calculateScore(newScore.diagnosisAttempts);
      newScore.diagnosisPoints = points;
      newScore.totalPoints = newScore.testPoints + points;
      
      response = `🎉 Outstanding diagnosis! Yes, this is a case of ${currentCase.correctDiagnosis}.

📊 Case Score Breakdown:
• Test Selection: ${newScore.testPoints}/${SCORING_CONFIG.MAX_TEST_POINTS} points
• Diagnosis: ${points}/${SCORING_CONFIG.MAX_DIAGNOSIS_POINTS} points
• Total: ${newScore.totalPoints}/10 points

Your clinical reasoning was spot on! Type "new case" when ready for the next patient.`;

      // Update total score and cases completed
      setTotalScore(prev => prev + newScore.totalPoints);
      setCasesCompleted(prev => prev + 1);
    } else if (accuracy >= 0.4) {
      response = `🤔 You're getting warm! Try again or type "proceed" to see the correct diagnosis.`;
      setCurrentScore(newScore);
      addBotMessage(response);
      return;
    } else {
      response = `❌ Not quite. Try again or type "proceed" to see the correct diagnosis.`;
      setCurrentScore(newScore);
      addBotMessage(response);
      return;
    }

    addBotMessage(response);
    setCurrentScore(newScore);
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
      } else if (command === 'score') {
        const avgScore = casesCompleted > 0 ? (totalScore / casesCompleted).toFixed(1) : '0.0';
        addBotMessage(`📊 Your Performance:
• Total Score: ${totalScore} points
• Cases Completed: ${casesCompleted}
• Average Score: ${avgScore} points per case`);
      } else if (command === 'quit') {
        const avgScore = casesCompleted > 0 ? (totalScore / casesCompleted).toFixed(1) : '0.0';
        addBotMessage(`👋 Thanks for practicing! Here's your final score:

• Total Score: ${totalScore} points
• Cases Completed: ${casesCompleted}
• Average Score: ${avgScore} points per case

Come back anytime to improve your diagnostic skills!`);
      } else {
        addBotMessage("Type 'start' or 'new case' to begin, 'help' for instructions, 'score' to see your performance, or 'quit' to end the session.");
      }
      return;
    }

    // Handle "proceed" command during test/diagnosis
    if (userInput.toLowerCase() === 'proceed') {
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
        setCurrentScore(newScore);
        setTotalScore(prev => prev + newScore.totalPoints);
        setCasesCompleted(prev => prev + 1);
        
        addBotMessage(`The correct diagnosis is: ${currentCase?.correctDiagnosis}

📊 Case Score Breakdown:
• Test Selection: ${newScore.testPoints}/${SCORING_CONFIG.MAX_TEST_POINTS} points
• Diagnosis: 0/${SCORING_CONFIG.MAX_DIAGNOSIS_POINTS} points
• Total: ${newScore.totalPoints}/10 points

Type "new case" when you're ready to try another case.`);
        
        setGameState('idle');
        setCurrentCase(null);
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
          {gameState === 'idle' 
            ? `Score: ${totalScore} pts | Cases: ${casesCompleted}`
            : gameState === 'awaiting_test' 
              ? 'Suggesting Tests'
              : 'Making Diagnosis'
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
            gameState === 'idle' 
              ? "Type 'start', 'help', or 'score'..." 
              : gameState === 'awaiting_test'
                ? "Enter recommended tests..."
                : "Enter your diagnosis..."
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