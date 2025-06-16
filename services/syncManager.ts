import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import { localDb } from '../db/localDb';
import { API_BASE_URL } from './gameApi';

let isSyncing = false;
let unsubscribeNetInfo: (() => void) | null = null;
let wasOffline = false;

async function start() {
  try {
    await localDb.initialize();
  } catch (_) {
    // already initialized
  }

  unsubscribeNetInfo = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      const showToast = wasOffline;
      syncPending(showToast).catch(err => console.warn('Sync failed:', err));
      wasOffline = false;
    } else {
      wasOffline = true;
    }
  });

  const current = await NetInfo.fetch();
  if (current.isConnected) {
    syncPending(false).catch(console.error);
  }
}

function stop() {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
}

async function syncPending(showToast: boolean = false) {
  if (isSyncing) return;
  isSyncing = true;
  try {
    if (showToast) {
      Toast.show({
        type: 'info',
        text1: 'Syncing with backend',
        position: 'top',
        visibilityTime: 2000,
      });
    }

    await syncSessions();
    await syncCaseAttempts();
    await syncLearnerActions();

    if (showToast) {
      Toast.show({
        type: 'success',
        text1: 'Synced',
        position: 'top',
        visibilityTime: 2000,
      });
    }
  } finally {
    isSyncing = false;
  }
}

async function syncSessions() {
  const sessions = await localDb.getPendingRecords('sessions');
  for (const s of sessions) {
    try {
      if (!s.server_id) {
        const user = await localDb.getUserById(s.user_id);
        if (!user) continue;

        const res = await fetch(`${API_BASE_URL}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user.username }),
        });
        if (!res.ok) throw new Error('POST /sessions failed');
        const data: { sessionId: number } = await res.json();
        await localDb.markAsSynced('sessions', s.id, data.sessionId);
      } else if (s.ended_at) {
        const res = await fetch(`${API_BASE_URL}/sessions/${s.server_id}/end`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            totalScore: s.total_score,
            casesCompleted: s.cases_completed,
          }),
        });
        if (!res.ok) throw new Error('PUT /sessions/{id}/end failed');
        await localDb.markAsSynced('sessions', s.id, s.server_id);
      }
    } catch (err) {
      console.error('Failed to sync session', err);
      await localDb.markAsFailed('sessions', s.id);
    }
  }
}

async function syncCaseAttempts() {
  const attempts = await localDb.getPendingRecords('case_attempts');
  for (const ca of attempts) {
    try {
      const session = await localDb.getSession(ca.session_id);
      if (!session || !session.server_id) continue;

      if (!ca.server_id) {
        const res = await fetch(`${API_BASE_URL}/case-attempts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.server_id, caseId: ca.case_id }),
        });
        if (!res.ok) throw new Error('POST /case-attempts failed');
        const data: { caseAttemptId: number } = await res.json();
        await localDb.markAsSynced('case_attempts', ca.id, data.caseAttemptId);
      }

      if (ca.completed === 1 && ca.server_id) {
        const res = await fetch(`${API_BASE_URL}/case-attempts/${ca.server_id}/complete`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testAttempts: ca.test_attempts,
            diagnosisAttempts: ca.diagnosis_attempts,
            testPoints: ca.test_points,
            diagnosisPoints: ca.diagnosis_points,
            totalPoints: ca.total_points,
          }),
        });
        if (!res.ok) throw new Error('PUT /case-attempts/{id}/complete failed');
        await localDb.markAsSynced('case_attempts', ca.id, ca.server_id);
      }
    } catch (err) {
      console.error('Failed to sync case attempt', err);
      await localDb.markAsFailed('case_attempts', ca.id);
    }
  }
}

async function syncLearnerActions() {
  const actions = await localDb.getPendingRecords('learner_actions');
  for (const a of actions) {
    try {
      const session = await localDb.getSession(a.session_id);
      if (!session || !session.server_id) continue;

      const payload = {
        sessionId: session.server_id,
        caseAttemptId: null as number | null,
        actionType: a.action_type,
        actionData: JSON.parse(a.action_data ?? '{}'),
      };

      if (a.case_attempt_id) {
        const localCase = await localDb.getCaseAttempt(a.case_attempt_id);
        if (localCase && localCase.server_id) {
          payload.caseAttemptId = localCase.server_id;
        }
      }

      const res = await fetch(`${API_BASE_URL}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('POST /actions failed');
      await localDb.markAsSynced('learner_actions', a.id, 1);
    } catch (err) {
      console.error('Failed to sync learner action', err);
      await localDb.markAsFailed('learner_actions', a.id);
    }
  }
}

export const syncManager = {
  start,
  stop,
};
