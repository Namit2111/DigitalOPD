// db/localDb.ts
import * as SQLite from 'expo-sqlite';

export interface LocalUser {
  id: number;
  username: string;
  created_at: string;
  sync_status: 'pending' | 'synced' | 'failed';
  server_id: number | null;
  last_modified: string;
}

export interface LocalSession {
  id: number;
  user_id: number;
  total_score: number;
  cases_completed: number;
  started_at: string;
  ended_at: string | null;
  sync_status: 'pending' | 'synced' | 'failed';
  server_id: number | null;
  last_modified: string;
}

export interface LocalCaseAttempt {
  id: number;
  session_id: number;
  case_id: string;
  test_attempts: number;
  diagnosis_attempts: number;
  test_points: number;
  diagnosis_points: number;
  total_points: number;
  completed: number; // SQLite boolean as integer
  started_at: string;
  completed_at: string | null;
  sync_status: 'pending' | 'synced' | 'failed';
  server_id: number | null;
  last_modified: string;
}

export interface LocalLearnerAction {
  id: number;
  session_id: number;
  case_attempt_id: number | null;
  action_type: string;
  action_data: string; // JSON string
  timestamp: string;
  sync_status: 'pending' | 'synced' | 'failed';
  server_id: number | null;
  last_modified: string;
}

class LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('gameLocal.db');
      await this.createTables();
      console.log('Local database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize local database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Create users table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
        server_id INTEGER,
        last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create sessions table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        total_score INTEGER DEFAULT 0,
        cases_completed INTEGER DEFAULT 0,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
        server_id INTEGER,
        last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Create case_attempts table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS case_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        case_id TEXT NOT NULL,
        test_attempts INTEGER DEFAULT 0,
        diagnosis_attempts INTEGER DEFAULT 0,
        test_points INTEGER DEFAULT 0,
        diagnosis_points INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0 CHECK (completed IN (0, 1)),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
        server_id INTEGER,
        last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );
    `);

    // Create learner_actions table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS learner_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        case_attempt_id INTEGER,
        action_type TEXT NOT NULL,
        action_data TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
        server_id INTEGER,
        last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id),
        FOREIGN KEY (case_attempt_id) REFERENCES case_attempts(id)
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_users_sync_status ON users(sync_status);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_sessions_sync_status ON sessions(sync_status);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_case_attempts_sync_status ON case_attempts(sync_status);
      CREATE INDEX IF NOT EXISTS idx_case_attempts_session_id ON case_attempts(session_id);
      CREATE INDEX IF NOT EXISTS idx_learner_actions_sync_status ON learner_actions(sync_status);
      CREATE INDEX IF NOT EXISTS idx_learner_actions_session_id ON learner_actions(session_id);
      CREATE INDEX IF NOT EXISTS idx_learner_actions_case_attempt_id ON learner_actions(case_attempt_id);
    `);

    console.log('All database tables created successfully');
  }

  // User operations
  async createUser(username: string): Promise<LocalUser> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'INSERT INTO users (username, sync_status, last_modified) VALUES (?, ?, ?)',
      [username, 'pending', new Date().toISOString()]
    );

    const user = await this.db.getFirstAsync<LocalUser>(
      'SELECT * FROM users WHERE id = ?',
      [result.lastInsertRowId]
    );

    if (!user) throw new Error('Failed to create user');
    return user;
  }

  async getUserByUsername(username: string): Promise<LocalUser | null> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getFirstAsync<LocalUser>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
  }

  async getUserById(id: number): Promise<LocalUser | null> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getFirstAsync<LocalUser>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );
  }

  // Session operations
  async createSession(userId: number): Promise<LocalSession> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'INSERT INTO sessions (user_id, sync_status, last_modified) VALUES (?, ?, ?)',
      [userId, 'pending', new Date().toISOString()]
    );

    const session = await this.db.getFirstAsync<LocalSession>(
      'SELECT * FROM sessions WHERE id = ?',
      [result.lastInsertRowId]
    );

    if (!session) throw new Error('Failed to create session');
    return session;
  }

  async updateSession(
    sessionId: number, 
    updates: Partial<Pick<LocalSession, 'total_score' | 'cases_completed' | 'ended_at'>>
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [
      ...Object.values(updates),
      'pending', // sync_status
      new Date().toISOString(), // last_modified
      sessionId
    ];

    await this.db.runAsync(
      `UPDATE sessions SET ${setClause}, sync_status = ?, last_modified = ? WHERE id = ?`,
      values
    );
  }

  async getSession(sessionId: number): Promise<LocalSession | null> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getFirstAsync<LocalSession>(
      'SELECT * FROM sessions WHERE id = ?',
      [sessionId]
    );
  }

  // Case attempt operations
  async createCaseAttempt(sessionId: number, caseId: string): Promise<LocalCaseAttempt> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'INSERT INTO case_attempts (session_id, case_id, sync_status, last_modified) VALUES (?, ?, ?, ?)',
      [sessionId, caseId, 'pending', new Date().toISOString()]
    );

    const caseAttempt = await this.db.getFirstAsync<LocalCaseAttempt>(
      'SELECT * FROM case_attempts WHERE id = ?',
      [result.lastInsertRowId]
    );

    if (!caseAttempt) throw new Error('Failed to create case attempt');
    return caseAttempt;
  }

  async completeCaseAttempt(
    caseAttemptId: number,
    data: {
      testAttempts: number;
      diagnosisAttempts: number;
      testPoints: number;
      diagnosisPoints: number;
      totalPoints: number;
    }
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `UPDATE case_attempts SET 
        completed = 1,
        completed_at = ?,
        test_attempts = ?,
        diagnosis_attempts = ?,
        test_points = ?,
        diagnosis_points = ?,
        total_points = ?,
        sync_status = 'pending',
        last_modified = ?
      WHERE id = ?`,
      [
        new Date().toISOString(),
        data.testAttempts,
        data.diagnosisAttempts,
        data.testPoints,
        data.diagnosisPoints,
        data.totalPoints,
        new Date().toISOString(),
        caseAttemptId
      ]
    );
  }

  async getCaseAttempt(caseAttemptId: number): Promise<LocalCaseAttempt | null> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getFirstAsync<LocalCaseAttempt>(
      'SELECT * FROM case_attempts WHERE id = ?',
      [caseAttemptId]
    );
  }

  // Learner action operations
  async createLearnerAction(
    sessionId: number,
    caseAttemptId: number | null,
    actionType: string,
    actionData: any
  ): Promise<LocalLearnerAction> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      'INSERT INTO learner_actions (session_id, case_attempt_id, action_type, action_data, sync_status, last_modified) VALUES (?, ?, ?, ?, ?, ?)',
      [
        sessionId,
        caseAttemptId,
        actionType,
        JSON.stringify(actionData),
        'pending',
        new Date().toISOString()
      ]
    );

    const action = await this.db.getFirstAsync<LocalLearnerAction>(
      'SELECT * FROM learner_actions WHERE id = ?',
      [result.lastInsertRowId]
    );

    if (!action) throw new Error('Failed to create learner action');
    return action;
  }

  // Sync-related operations
  async getPendingRecords(tableName: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllAsync(
      `SELECT * FROM ${tableName} WHERE sync_status = 'pending' ORDER BY last_modified ASC`
    );
  }

  async markAsSynced(tableName: string, localId: number, serverId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `UPDATE ${tableName} SET sync_status = 'synced', server_id = ?, last_modified = ? WHERE id = ?`,
      [serverId, new Date().toISOString(), localId]
    );
  }

  async markAsFailed(tableName: string, localId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `UPDATE ${tableName} SET sync_status = 'failed', last_modified = ? WHERE id = ?`,
      [new Date().toISOString(), localId]
    );
  }

  // Stats and history (read from local data)
  async getUserStats(username: string): Promise<{
    username: string;
    total_sessions: number;
    total_score: number;
    total_cases: number;
    avg_score_per_case: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const stats = await this.db.getFirstAsync<{
      username: string;
      total_sessions: number;
      total_score: number;
      total_cases: number;
      avg_score_per_case: number;
    }>(`
      SELECT 
        u.username,
        COUNT(DISTINCT s.id) as total_sessions,
        COALESCE(SUM(s.total_score), 0) as total_score,
        COALESCE(SUM(s.cases_completed), 0) as total_cases,
        ROUND(AVG(CASE WHEN s.cases_completed > 0 
          THEN s.total_score * 1.0 / s.cases_completed 
          ELSE 0 END), 2) as avg_score_per_case
      FROM users u
      LEFT JOIN sessions s ON u.id = s.user_id
      WHERE u.username = ?
      GROUP BY u.id, u.username
    `, [username]);

    return stats || {
      username,
      total_sessions: 0,
      total_score: 0,
      total_cases: 0,
      avg_score_per_case: 0
    };
  }

  async getSessionHistory(username: string): Promise<{
    session_id: number;
    total_score: number;
    cases_completed: number;
    started_at: string;
    ended_at: string | null;
    total_attempts: number;
    avg_points_per_case: number;
  }[]> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getAllAsync(`
      SELECT 
        s.id as session_id,
        s.total_score,
        s.cases_completed,
        s.started_at,
        s.ended_at,
        COUNT(ca.id) as total_attempts,
        ROUND(AVG(ca.total_points), 2) as avg_points_per_case
      FROM users u
      JOIN sessions s ON u.id = s.user_id
      LEFT JOIN case_attempts ca ON s.id = ca.session_id
      WHERE u.username = ?
      GROUP BY s.id
      ORDER BY s.started_at DESC
    `, [username]);
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      DELETE FROM learner_actions;
      DELETE FROM case_attempts;
      DELETE FROM sessions;
      DELETE FROM users;
    `);
  }

  async getDatabase(): Promise<SQLite.SQLiteDatabase>  {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }
}

// Export singleton instance
export const localDb = new LocalDatabase();