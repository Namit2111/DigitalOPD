import NetInfo from '@react-native-community/netinfo';
import { localDb } from '../db/localDb';
import { API_BASE_URL } from './gameApi';

/**
 * SyncManager is responsible for pushing locally stored records that are still
 * marked as `pending` to the remote backend whenever the device regains
 * connectivity. It processes the data in chronological order (oldest first)
 * to preserve correct sequencing.
 */
class SyncManager {
  private isSyncing = false;
  private unsubscribeNetInfo: (() => void) | null = null;

  /**
   * Start the background listener. Call this once during app bootstrap.
   */
  async start() {
    // Make sure our SQLite database is ready.
    try {
      await localDb.initialize();
    } catch (_) {
      // already initialised
    }

    // Listen to connectivity changes
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        // Fire-and-forget – no need to await here.
        this.syncPending().catch(err => console.warn('Sync failed:', err));
      }
    });

    // Also attempt an initial sync in case we start already online.
    const current = await NetInfo.fetch();
    if (current.isConnected) {
      this.syncPending().catch(console.error);
    }
  }

  /**
   * Stop listening to connectivity updates – mainly for unit-tests or app teardown.
   */
  stop() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
  }

  /**
   * Main synchronisation routine. Runs once at a time.
   */
  private async syncPending() {
    if (this.isSyncing) return; // prevent re-entrance
    this.isSyncing = true;
    try {
      // Order matters – parent entities first.
      await this.syncSessions();
      await this.syncCaseAttempts();
      await this.syncLearnerActions();
    } finally {
      this.isSyncing = false;
    }
  }

  // ------------------------- INDIVIDUAL TABLES ---------------------------- //

  private async syncSessions() {
    const sessions = await localDb.getPendingRecords('sessions');
    for (const s of sessions) {
      try {
        if (!s.server_id) {
          // Session not yet created on server – do so now.
          // We need the username -> fetch the user row.
          const user = await localDb.getUserById(s.user_id);
          if (!user) {
            // user entry missing => skip for now
            continue;
          }
          const res = await fetch(`${API_BASE_URL}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username }),
          });
          if (!res.ok) throw new Error('POST /sessions failed');
          const data: { sessionId: number } = await res.json();
          await localDb.markAsSynced('sessions', s.id, data.sessionId);
        } else if (s.ended_at) {
          // Session already has a serverId but needs its "end" payload synced.
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

  private async syncCaseAttempts() {
    const attempts = await localDb.getPendingRecords('case_attempts');
    for (const ca of attempts) {
      try {
        // Need the remote sessionId first
        const session = await localDb.getSession(ca.session_id);
        if (!session || !session.server_id) {
          // Parent session not yet synced – skip for now
          continue;
        }

        if (!ca.server_id) {
          // Create case attempt on server
          const res = await fetch(`${API_BASE_URL}/case-attempts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: session.server_id, caseId: ca.case_id }),
          });
          if (!res.ok) throw new Error('POST /case-attempts failed');
          const data: { caseAttemptId: number } = await res.json();
          await localDb.markAsSynced('case_attempts', ca.id, data.caseAttemptId);
        }

        // Handle completion update
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

  private async syncLearnerActions() {
    const actions = await localDb.getPendingRecords('learner_actions');
    for (const a of actions) {
      try {
        // Need remote session id
        const session = await localDb.getSession(a.session_id);
        if (!session || !session.server_id) continue; // parent not synced yet
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
        // Assume server returns id but we do not need it – use 1 as dummy
        await localDb.markAsSynced('learner_actions', a.id, 1);
      } catch (err) {
        console.error('Failed to sync learner action', err);
        await localDb.markAsFailed('learner_actions', a.id);
      }
    }
  }
}

export const syncManager = new SyncManager(); 