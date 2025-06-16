# Medical Diagnosis Mini-Game – Design Document

## 1. Problem Recap
* Build a chat-based learning mini-game for NEET-PG aspirants.
* Learner converses with a "Senior AI Doctor" bot to diagnose virtual patients.
* For every case the learner must:
  1. Select the best diagnostic test.
  2. Review the test result returned by the bot.
  3. Enter the most likely diagnosis.
* A 10-point grading system rewards first-try accuracy (5 pts test + 5 pts diagnosis, −2 pts per extra attempt, 0 pts if test is contra-indicated).
* The game is local-first: all actions work offline and automatically sync when connectivity returns, showing banners *Offline ▸ Syncing… ▸ Synced*.

## 2. Architecture Sketch
```
           ┌───────────────────────────┐
           │ Expo React-Native App     │
           │  (SDK 50, expo-router)    │
           │                           │
           │  • Chat / Game UI (TBD)   │
           │  • <Toast/> & banners     │
           │  • hooks (useConnection…) │
           └──────────┬────────────────┘
                      │SQLite (expo-sqlite)
                      ▼
           ┌───────────────────────────┐
           │ localDb.ts (ORM wrapper)  │
           └──────────┬────────────────┘
                      │pending rows
                      ▼
           ┌───────────────────────────┐
           │ SyncManager (listener)    │
           │ • NetInfo online/offline  │
           │ • syncPending()           │
           └──────────┬────────────────┘      HTTP JSON (REST)
                      │ push when online      /api/* endpoints
                      ▼
           ┌───────────────────────────┐      ┌──────────────────────────┐
           │  Express Server (backend) │◀────▶│ SQLite (game.db)         │
           │  backend/server.js        │      │ mirrors mobile schema    │
           │  • /sessions              │      └──────────────────────────┘
           │  • /case-attempts         │
           │  • /actions               │
           └───────────────────────────┘
```
**Key flow**
1. Game actions are stored locally via `localDb` (status `pending`).
2. `SyncManager` watches NetInfo; on connectivity it POSTs batched rows to the Express server.
3. Server persists data into its own SQLite file and replies with IDs → rows marked `synced`.
4. UI shows connection toasts via `ConnectionStatus` (Offline ▸ Online ▸ Syncing… ▸ Synced).

(Planned but *not yet implemented*: WebSocket live chat & LLM function-calling.)

## 3. Data Model / Schema (SQLite, same shape mirrored on server)
| Table | Key Fields | Purpose |
|-------|------------|---------|
| **patients** | id, age, gender, history, symptoms, additionalInfo, correctTest, correctDiagnosis, contraIndications | Static reference cases shipped with app. |
| **sessions** | id (PK), user_id, total_score, cases_completed, started_at, ended_at, sync_status, server_id | One play-through session per user. |
| **case_attempts** | id, session_id ↠ sessions, case_id, test_attempts, diagnosis_attempts, completed, sync_status, server_id | Tracks progress & scoring for each virtual patient. |
| **learner_actions** | id, session_id, case_attempt_id, action_type ("test"/"diagnosis"), action_data (JSON), timestamp, sync_status | Atomic log for every chat message / answer – used for audit & last-writer-wins conflict resolution. |

`sync_status`: `'pending' | 'synced' | 'failed'` ensures resumable background sync.

## 4. Offline & Sync Flow
1. **Action capture** – Every learner input is persisted immediately into **learner_actions** (status `pending`). Scores are computed locally with helpers in `utils/gameData.ts`.
2. **No network?** – The app continues to operate from the local DB; banners show *Offline*.
3. **Reconnect** – `SyncManager.start()` subscribes to NetInfo. When `isConnected` flips to **true**:
   * `syncPending()` performs batch push per table in dependency order (sessions ➜ case_attempts ➜ learner_actions).
   * On success rows are marked `synced` with server ids, banners show *Syncing… ➜ Synced*.
   * If a row fails it is marked `failed` to retry later.
4. **Conflict rule** – Server treats the last `last_modified` timestamp as authoritative (last writer wins).

## 5. Module Breakdown
* **app/_layout.tsx** – Top-level Expo layout. Hosts SafeArea + KeyboardAvoidingView + global `<Toast />`. Mounts `useConnectionStatus` so banners are global.
* **components/ConnectionStatus.tsx** – Custom hook + tiny dot UI. Listens to NetInfo, posts toasts (*Offline ▸ Online ▸ Syncing*) and exposes the `isOnline` boolean to the rest of the app.
* **utils/gameData.ts** – Pure helper module. Contains starter medical cases and scoring helpers (`calculateScore`, `checkAnswer`, `isContraIndicated`). Zero React/Expo imports – unit-testable offline.
* **db/localDb.ts** – Thin typed wrapper around `expo-sqlite`. Creates tables (`users`, `sessions`, `case_attempts`, `learner_actions`) and exposes CRUD & sync helpers (`markAsSynced`, `getPendingRecords`). This is the *single source of truth* when offline.
* **services/syncManager.ts** – Singleton started at app bootstrap.  
  * Subscribes to `NetInfo.addEventListener`.  
  * When `isConnected` ⇒ pushes pending rows in deterministic order (sessions ➜ case_attempts ➜ learner_actions).  
  * Uses `fetch()` against local Express server endpoints; marks rows `synced` / `failed` accordingly.
* **services/gameApi.ts** – Facade used by screens/chat logic to mutate local DB while the player plays (startSession, startCase, completeCase, etc.). Delegates to `localDb` and logs each step via `localDb.createLearnerAction`.
* **__tests__/gameLogic.test.ts** – Jest suite that proves the scoring helper works with the official sample case (test selection points, diagnosis matching, contra-indications).
* **backend/server.js** – Minimal Express server that mirrors the mobile schema in its own SQLite file (`backend/db/game.db`). Accepts the same endpoints assumed by `SyncManager`.
* **backend/db/init.js** – Creates server-side tables on startup.
* **jest.config.js** + **package.json** – Jest/ts-jest wiring.


## 6. Assumptions & Open Questions
* this is an offline first game
* this assignment is to test implementation of offline first application and code stucture