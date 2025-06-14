import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useChat } from '../hooks/useChat';
import { useGameState } from '../hooks/useGameState';
import { gameApi } from '../services/gameApi';
import {
  calculateScore,
  checkAnswer,
  getRandomCase,
  helpMessage,
  isContraIndicated,
  welcomeMessage
} from '../utils/gameData';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';

export default function Chat() {
  const {
    gameState,
    username,
    currentCase,
    currentScore,
    totalScore,
    casesCompleted,
    setGameState,
    setUsername,
    setCurrentCase,
    setCurrentScore,
    updateTotalScore,
    incrementCasesCompleted,
    resetCurrentScore
  } = useGameState();

  const { messages, addBotMessage, addUserMessage } = useChat();
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (gameState === 'login') {
      addBotMessage("👋 Welcome! Please enter your username to start the game.");
    }
  }, []);

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
    resetCurrentScore();

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

      updateTotalScore(newScore.totalPoints);
      incrementCasesCompleted();
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
        updateTotalScore(newScore.totalPoints);
        incrementCasesCompleted();
        
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
      <ChatHeader
        gameState={gameState}
        totalScore={totalScore}
        casesCompleted={casesCompleted}
      />
      <ScrollView 
        style={styles.messagesContainer}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
      </ScrollView>
      <ChatInput
        inputText={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        gameState={gameState}
      />
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
}); 