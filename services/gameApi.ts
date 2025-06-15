// Remote API base – still needed by the Sync-Manager when it is time to
// push pending records to the backend. Keep it exported.
export const API_BASE_URL = 'https://befc-27-4-50-236.ngrok-free.app/api';

// Local database import
import { localDb } from '../db/localDb';

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

async function ensureLocalDbInitialised() {
  // Make sure the DB is ready before any call
  try {
    await localDb.initialize();
  } catch (_) {
    // ignore if already initialised
  }
}

function createGameApi() {
  let sessionId: number | null = null;      // local session row id
  let caseAttemptId: number | null = null;  // local case_attempt row id
  let username: string | null = null;

  async function startSession(user: string): Promise<void> {
    await ensureLocalDbInitialised();

    // Ensure a local user row exists (creates one if not present)
    const localUser = (await localDb.getUserByUsername(user)) ?? await localDb.createUser(user);

    const session = await localDb.createSession(localUser.id);

    sessionId = session.id;
    username = user;

    await logAction('START_SESSION', { username: user });
  }

  async function endSession(totalScore: number, casesCompleted: number): Promise<void> {
    if (!sessionId) return;

    await ensureLocalDbInitialised();

    await localDb.updateSession(sessionId, {
      total_score: totalScore,
      cases_completed: casesCompleted,
      ended_at: new Date().toISOString(),
    });

    await logAction('END_SESSION', { totalScore, casesCompleted });

    sessionId = null;
    caseAttemptId = null;
  }

  async function startCase(caseId: string): Promise<void> {
    if (!sessionId) return;

    await ensureLocalDbInitialised();

    const caseAttempt = await localDb.createCaseAttempt(sessionId, caseId);
    caseAttemptId = caseAttempt.id;

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

    await ensureLocalDbInitialised();

    await localDb.completeCaseAttempt(caseAttemptId, {
      testAttempts,
      diagnosisAttempts,
      testPoints,
      diagnosisPoints,
      totalPoints,
    });

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

    await ensureLocalDbInitialised();

    try {
      await localDb.createLearnerAction(sessionId, caseAttemptId, actionType, actionData);
    } catch (error) {
      console.error('Failed to log action locally:', actionType, error);
    }
  }

  async function getUserStats(): Promise<UserStats> {
    if (!username) throw new Error('No active user');

    await ensureLocalDbInitialised();
    return await localDb.getUserStats(username);
  }

  async function getSessionHistory(): Promise<SessionHistory[]> {
    if (!username) throw new Error('No active user');

    await ensureLocalDbInitialised();
    const rawHistory = await localDb.getSessionHistory(username);
    return rawHistory.map(h => ({
      session_id: h.session_id,
      total_score: h.total_score,
      cases_completed: h.cases_completed,
      started_at: h.started_at,
      ended_at: h.ended_at ?? '',
      total_attempts: h.total_attempts,
      avg_points_per_case: h.avg_points_per_case,
    }));
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
