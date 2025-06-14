export interface MedicalCase {
  patient: {
    age: number;
    gender: string;
    history: string;
    symptoms: string;
    additionalInfo: string;
  };
  correctTest: string;
  correctDiagnosis: string;
}

export const medicalCases: MedicalCase[] = [
  {
    patient: {
      age: 32,
      gender: "Female",
      history: "Pregnant",
      symptoms: "Mild bleeding and pain",
      additionalInfo: "Uterus tender, fetal heart sounds absent"
    },
    correctTest: "Physical examination and ultrasound",
    correctDiagnosis: "Abruptio placenta"
  },
  {
    patient: {
      age: 5,
      gender: "Male",
      history: "Posterior superior retraction pocket",
      symptoms: "—",
      additionalInfo: "Posterior superior retraction pocket present"
    },
    correctTest: "Otoscopy and audiometry",
    correctDiagnosis: "Chronic suppurative otitis media (unsafe type)"
  },
  {
    patient: {
      age: 48,
      gender: "Male",
      history: "—",
      symptoms: "Painful raised red lesion on hand",
      additionalInfo: "Nests of round cells + branching vascular spaces"
    },
    correctTest: "Skin biopsy",
    correctDiagnosis: "Glomus tumor"
  }
];

export const getRandomCase = (): MedicalCase => {
  const randomIndex = Math.floor(Math.random() * medicalCases.length);
  return medicalCases[randomIndex];
};

export const welcomeMessage = `👋 Welcome to the Medical Diagnosis Training Game! 
I'm your AI Senior Doctor mentor. I'll help you practice diagnosing virtual patients.

Type "start" or "new case" to begin a new case.
Type "help" for instructions.
Type "quit" to end the session.`;

export const helpMessage = `🎮 Game Instructions:
1. Type "start" or "new case" to begin
2. I'll present a patient case
3. First, suggest what tests you'd recommend
4. Then, based on the results, provide your diagnosis
5. I'll give you feedback and explain the correct approach
6. Type "new case" for another patient
7. Type "quit" to end the session

Remember: Think carefully about each case and explain your reasoning!`;

export const checkAnswer = (userInput: string, correctAnswer: string): number => {
  const userWords = userInput.toLowerCase().split(/\s+/);
  const correctWords = correctAnswer.toLowerCase().split(/\s+/);
  
  let matchCount = 0;
  correctWords.forEach(word => {
    if (userWords.includes(word)) matchCount++;
  });
  
  return matchCount / correctWords.length; // Returns percentage of matching words
}; 