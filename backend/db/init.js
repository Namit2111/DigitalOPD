const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'game.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Create users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create sessions table
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    total_score INTEGER DEFAULT 0,
    cases_completed INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // Create case_attempts table
  db.run(`CREATE TABLE IF NOT EXISTS case_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    case_id TEXT NOT NULL,
    test_attempts INTEGER DEFAULT 0,
    diagnosis_attempts INTEGER DEFAULT 0,
    test_points INTEGER DEFAULT 0,
    diagnosis_points INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  )`);

  // Create learner_actions table
  db.run(`CREATE TABLE IF NOT EXISTS learner_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    case_attempt_id INTEGER,
    action_type TEXT NOT NULL,
    action_data TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (case_attempt_id) REFERENCES case_attempts(id)
  )`);
});

module.exports = db; 