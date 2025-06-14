const API_BASE_URL = 'http://localhost:3000/api';

export interface GameSession {
  sessionId: number;
}

export interface CaseAttempt {
  caseAttemptId: number;
}

export interface UserStats {
  username: string;
  total_sessions: number;
  total_score: number;
  total_cases: number;
  avg_score_per_case: number;
}

export interface SessionHistory {
  session_id: number;
  total_score: number;
  cases_completed: number;
  started_at: string;
  ended_at: string;
  total_attempts: number;
  avg_points_per_case: number;
}

export type ActionType = 
  | 'START_SESSION'
  | 'END_SESSION'
  | 'START_CASE'
  | 'SUBMIT_TEST'
  | 'SUBMIT_DIAGNOSIS'
  | 'COMPLETE_CASE'
  | 'VIEW_HELP'
  | 'VIEW_STATS'
  | 'SKIP_STEP';

class GameApi {
  private sessionId: number | null = null;
  private caseAttemptId: number | null = null;
  private username: string | null = null;

  async startSession(username: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    if (!response.ok) {
      throw new Error('Failed to start session');
    }

    const data: GameSession = await response.json();
    this.sessionId = data.sessionId;
    this.username = username;
    
    await this.logAction('START_SESSION', { username });
  }

  async endSession(totalScore: number, casesCompleted: number): Promise<void> {
    if (!this.sessionId) return;

    const response = await fetch(`${API_BASE_URL}/sessions/${this.sessionId}/end`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalScore, casesCompleted })
    });

    if (!response.ok) {
      throw new Error('Failed to end session');
    }

    await this.logAction('END_SESSION', { totalScore, casesCompleted });
    this.sessionId = null;
    this.caseAttemptId = null;
  }

  async startCase(caseId: string): Promise<void> {
    if (!this.sessionId) return;

    const response = await fetch(`${API_BASE_URL}/case-attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: this.sessionId, caseId })
    });

    if (!response.ok) {
      throw new Error('Failed to start case');
    }

    const data: CaseAttempt = await response.json();
    this.caseAttemptId = data.caseAttemptId;

    await this.logAction('START_CASE', { caseId });
  }

  async completeCase(
    testAttempts: number,
    diagnosisAttempts: number,
    testPoints: number,
    diagnosisPoints: number,
    totalPoints: number
  ): Promise<void> {
    if (!this.caseAttemptId) return;

    const response = await fetch(`${API_BASE_URL}/case-attempts/${this.caseAttemptId}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testAttempts,
        diagnosisAttempts,
        testPoints,
        diagnosisPoints,
        totalPoints
      })
    });

    if (!response.ok) {
      throw new Error('Failed to complete case');
    }

    await this.logAction('COMPLETE_CASE', {
      testAttempts,
      diagnosisAttempts,
      testPoints,
      diagnosisPoints,
      totalPoints
    });
    this.caseAttemptId = null;
  }

  async logAction(actionType: ActionType, actionData: any): Promise<void> {
    if (!this.sessionId) return;

    const response = await fetch(`${API_BASE_URL}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        caseAttemptId: this.caseAttemptId,
        actionType,
        actionData
      })
    });

    if (!response.ok) {
      console.error('Failed to log action:', actionType);
    }
  }

  async getUserStats(): Promise<UserStats> {
    if (!this.username) throw new Error('No active user');

    const response = await fetch(`${API_BASE_URL}/users/${this.username}/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch user stats');
    }

    const stats = await response.json();
    return stats || {
      username: this.username,
      total_sessions: 0,
      total_score: 0,
      total_cases: 0,
      avg_score_per_case: 0
    };
  }

  async getSessionHistory(): Promise<SessionHistory[]> {
    if (!this.username) throw new Error('No active user');

    const response = await fetch(`${API_BASE_URL}/users/${this.username}/history`);
    if (!response.ok) {
      throw new Error('Failed to fetch session history');
    }

    return response.json();
  }
}

export const gameApi = new GameApi(); 