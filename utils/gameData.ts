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
  contraIndications?: string[]; // Tests that would be harmful/inappropriate
}

export interface GameScore {
  testPoints: number;
  diagnosisPoints: number;
  testAttempts: number;
  diagnosisAttempts: number;
  totalPoints: number;
}

export const SCORING_CONFIG = {
  MAX_TEST_POINTS: 5,
  MAX_DIAGNOSIS_POINTS: 5,
  POINTS_DEDUCTION: 2,
  MIN_POINTS: 0,
};

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
    correctDiagnosis: "Abruptio placenta",
    contraIndications: ["X-ray", "CT scan", "Radiation exposure"]
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
    correctDiagnosis: "Chronic suppurative otitis media (unsafe type)",
    contraIndications: ["Direct irrigation", "Forceful suctioning"]
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
    correctDiagnosis: "Glomus tumor",
    contraIndications: []
  }
];

export const getRandomCase = (): MedicalCase => {
  const randomIndex = Math.floor(Math.random() * medicalCases.length);
  return medicalCases[randomIndex];
};

export const calculateScore = (
  attempts: number,
  maxPoints: number = SCORING_CONFIG.MAX_TEST_POINTS,
  deduction: number = SCORING_CONFIG.POINTS_DEDUCTION
): number => {
  const points = maxPoints - (attempts - 1) * deduction;
  return Math.max(SCORING_CONFIG.MIN_POINTS, points);
};

export const isContraIndicated = (test: string, contraIndications: string[] = []): boolean => {
  return contraIndications.some(contra => 
    test.toLowerCase().includes(contra.toLowerCase())
  );
};

export const checkAnswer = (userInput: string, correctAnswer: string): number => {
  const userWords = userInput.toLowerCase().split(/\s+/);
  const correctWords = correctAnswer.toLowerCase().split(/\s+/);
  
  let matchCount = 0;
  correctWords.forEach(word => {
    if (userWords.includes(word)) matchCount++;
  });
  
  return matchCount / correctWords.length;
};

export const welcomeMessage = `👋 Welcome to the Medical Diagnosis Training Game! 
I'm your AI Senior Doctor mentor. I'll help you practice diagnosing virtual patients.

🎯 Scoring System:
• Each case has 10 possible points (5 for tests + 5 for diagnosis)
• -2 points per extra attempt
• 0 points for contra-indicated tests
• Perfect first-try score: 10 points! 

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

📊 Scoring:
• Test selection: 5 points (−2 per extra try)
• Diagnosis: 5 points (−2 per extra try)
• Contra-indicated tests: 0 points
• Perfect score per case: 10 points

Remember: Think carefully about each case and explain your reasoning!`; 