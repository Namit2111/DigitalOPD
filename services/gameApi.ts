const API_BASE_URL = 'https://befc-27-4-50-236.ngrok-free.app/api';

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

function createGameApi() {
  let sessionId: number | null = null;
  let caseAttemptId: number | null = null;
  let username: string | null = null;

  async function startSession(user: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user }),
    });

    if (!res.ok) throw new Error('Failed to start session');

    const data: GameSession = await res.json();
    sessionId = data.sessionId;
    username = user;

    await logAction('START_SESSION', { username });
  }

  async function endSession(totalScore: number, casesCompleted: number): Promise<void> {
    if (!sessionId) return;

    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/end`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalScore, casesCompleted }),
    });

    if (!res.ok) throw new Error('Failed to end session');

    await logAction('END_SESSION', { totalScore, casesCompleted });

    sessionId = null;
    caseAttemptId = null;
  }

  async function startCase(caseId: string): Promise<void> {
    if (!sessionId) return;

    const res = await fetch(`${API_BASE_URL}/case-attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, caseId }),
    });

    if (!res.ok) throw new Error('Failed to start case');

    const data: CaseAttempt = await res.json();
    caseAttemptId = data.caseAttemptId;

    await logAction('START_CASE', { caseId });
  }

  async function completeCase(
    testAttempts: number,
    diagnosisAttempts: number,
    testPoints: number,
    diagnosisPoints: number,
    totalPoints: number
  ): Promise<void> {
    if (!caseAttemptId) return;

    const res = await fetch(`${API_BASE_URL}/case-attempts/${caseAttemptId}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testAttempts,
        diagnosisAttempts,
        testPoints,
        diagnosisPoints,
        totalPoints,
      }),
    });

    if (!res.ok) throw new Error('Failed to complete case');

    await logAction('COMPLETE_CASE', {
      testAttempts,
      diagnosisAttempts,
      testPoints,
      diagnosisPoints,
      totalPoints,
    });

    caseAttemptId = null;
  }

  async function logAction(actionType: ActionType, actionData: any): Promise<void> {
    if (!sessionId) return;

    const res = await fetch(`${API_BASE_URL}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        caseAttemptId,
        actionType,
        actionData,
      }),
    });

    if (!res.ok) {
      console.error('Failed to log action:', actionType);
    }
  }

  async function getUserStats(): Promise<UserStats> {
    if (!username) throw new Error('No active user');

    const res = await fetch(`${API_BASE_URL}/users/${username}/stats`);
    if (!res.ok) throw new Error('Failed to fetch user stats');

    const stats = await res.json();
    return stats || {
      username,
      total_sessions: 0,
      total_score: 0,
      total_cases: 0,
      avg_score_per_case: 0,
    };
  }

  async function getSessionHistory(): Promise<SessionHistory[]> {
    if (!username) throw new Error('No active user');

    const res = await fetch(`${API_BASE_URL}/users/${username}/history`);
    if (!res.ok) throw new Error('Failed to fetch session history');

    return res.json();
  }

  return {
    startSession,
    endSession,
    startCase,
    completeCase,
    logAction,
    getUserStats,
    getSessionHistory,
  };
}

export const gameApi = createGameApi();
