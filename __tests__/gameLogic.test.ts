import {
    MedicalCase,
    SCORING_CONFIG,
    calculateScore,
    checkAnswer,
    isContraIndicated,
    medicalCases
} from '../utils/gameData';

describe('Medical Diagnosis Game Logic', () => {
  // Use the first case (pregnancy case) for testing
  const testCase: MedicalCase = medicalCases[0];

  describe('Test Selection Logic', () => {
    it('should give full points for correct test on first try', () => {
      const score = calculateScore(1, SCORING_CONFIG.MAX_TEST_POINTS);
      expect(score).toBe(5);
    });

    it('should deduct points for additional attempts', () => {
      const score = calculateScore(2, SCORING_CONFIG.MAX_TEST_POINTS);
      expect(score).toBe(3); // 5 - 2 points deduction
    });

    it('should not go below minimum points', () => {
      const score = calculateScore(5, SCORING_CONFIG.MAX_TEST_POINTS);
      expect(score).toBe(0);
    });

    it('should correctly identify contra-indicated tests', () => {
      expect(isContraIndicated('X-ray', testCase.contraIndications)).toBe(true);
      expect(isContraIndicated('CT scan', testCase.contraIndications)).toBe(true);
      expect(isContraIndicated('ultrasound', testCase.contraIndications)).toBe(false);
    });

    it('should handle case-insensitive contra-indication checks', () => {
      expect(isContraIndicated('x-RAY', testCase.contraIndications)).toBe(true);
      expect(isContraIndicated('ct SCAN', testCase.contraIndications)).toBe(true);
    });
  });

  describe('Diagnosis Logic', () => {
    it('should recognize correct diagnosis with exact match', () => {
      const matchScore = checkAnswer(
        'Abruptio placenta',
        testCase.correctDiagnosis
      );
      expect(matchScore).toBe(1); // Perfect match
    });

    it('should handle partial matches in diagnosis', () => {
      const matchScore = checkAnswer(
        'placenta abruptio',
        testCase.correctDiagnosis
      );
      expect(matchScore).toBe(1); // Words in different order
    });

    it('should handle case insensitive diagnosis matches', () => {
      const matchScore = checkAnswer(
        'ABRUPTIO PLACENTA',
        testCase.correctDiagnosis
      );
      expect(matchScore).toBe(1);
    });

    it('should give partial credit for partial matches', () => {
      const matchScore = checkAnswer(
        'placenta issue',
        testCase.correctDiagnosis
      );
      expect(matchScore).toBe(0.5); // One word matches out of two
    });
  });

  describe('Patient Case Data', () => {
    it('should have all required patient information', () => {
      expect(testCase.patient).toEqual({
        age: 32,
        gender: "Female",
        history: "Pregnant",
        symptoms: "Mild bleeding and pain",
        additionalInfo: "Uterus tender, fetal heart sounds absent"
      });
    });

    it('should have correct test and diagnosis information', () => {
      expect(testCase.correctTest).toBe("Physical examination and ultrasound");
      expect(testCase.correctDiagnosis).toBe("Abruptio placenta");
    });

    it('should have appropriate contra-indications', () => {
      expect(testCase.contraIndications).toContain("X-ray");
      expect(testCase.contraIndications).toContain("CT scan");
      expect(testCase.contraIndications).toContain("Radiation exposure");
    });
  });
}); 