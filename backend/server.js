const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db/init');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Start new session
app.post('/api/sessions', (req, res) => {
  const { username } = req.body;
  
  // First, find or create user
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (user) {
      createSession(user.id, res);
    } else {
      db.run('INSERT INTO users (username) VALUES (?)', [username], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        createSession(this.lastID, res);
      });
    }
  });
});

function createSession(userId, res) {
  db.run('INSERT INTO sessions (user_id) VALUES (?)', [userId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ sessionId: this.lastID });
  });
}

// End session
app.put('/api/sessions/:sessionId/end', (req, res) => {
  const { sessionId } = req.params;
  const { totalScore, casesCompleted } = req.body;

  db.run(
    `UPDATE sessions 
    SET 
      ended_at = CURRENT_TIMESTAMP,
      total_score = ?,
      cases_completed = ?
    WHERE id = ?`,
    [totalScore, casesCompleted, sessionId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }
      res.json({ message: 'Session ended successfully' });
    }
  );
});

// Start new case attempt
app.post('/api/case-attempts', (req, res) => {
  const { sessionId, caseId } = req.body;

  db.run(
    'INSERT INTO case_attempts (session_id, case_id) VALUES (?, ?)',
    [sessionId, caseId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ caseAttemptId: this.lastID });
    }
  );
});

// Complete case attempt
app.put('/api/case-attempts/:caseAttemptId/complete', (req, res) => {
  const { caseAttemptId } = req.params;
  const { testAttempts, diagnosisAttempts, testPoints, diagnosisPoints, totalPoints } = req.body;

  // First, get the session ID for this case attempt
  db.get('SELECT session_id FROM case_attempts WHERE id = ?', [caseAttemptId], (err, caseAttempt) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!caseAttempt) {
      return res.status(404).json({ error: 'Case attempt not found' });
    }

    // Begin a transaction to update both case_attempts and sessions
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Update case attempt
      db.run(
        `UPDATE case_attempts SET 
          completed = 1,
          completed_at = CURRENT_TIMESTAMP,
          test_attempts = ?,
          diagnosis_attempts = ?,
          test_points = ?,
          diagnosis_points = ?,
          total_points = ?
        WHERE id = ?`,
        [testAttempts, diagnosisAttempts, testPoints, diagnosisPoints, totalPoints, caseAttemptId],
        (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }

          // Update session score and cases completed
          db.run(
            `UPDATE sessions SET 
              total_score = total_score + ?,
              cases_completed = cases_completed + 1
            WHERE id = ?`,
            [totalPoints, caseAttempt.session_id],
            (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }

              db.run('COMMIT');
              res.json({ message: 'Case attempt completed successfully' });
            }
          );
        }
      );
    });
  });
});

// Log learner action
app.post('/api/actions', (req, res) => {
  const { sessionId, caseAttemptId, actionType, actionData } = req.body;

  db.run(
    'INSERT INTO learner_actions (session_id, case_attempt_id, action_type, action_data) VALUES (?, ?, ?, ?)',
    [sessionId, caseAttemptId, actionType, JSON.stringify(actionData)],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ actionId: this.lastID });
    }
  );
});

// Get user statistics
app.get('/api/users/:username/stats', (req, res) => {
  const { username } = req.params;

  db.get(
    `SELECT 
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
    GROUP BY u.id, u.username`,
    [username],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(stats || { 
        username, 
        total_sessions: 0, 
        total_score: 0, 
        total_cases: 0, 
        avg_score_per_case: 0 
      });
    }
  );
});

// Get session history
app.get('/api/users/:username/history', (req, res) => {
  const { username } = req.params;

  db.all(
    `SELECT 
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
    ORDER BY s.started_at DESC`,
    [username],
    (err, history) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(history || []);
    }
  );
});

// Data Viewer Endpoints
app.get('/admin/data/users', (req, res) => {
  db.all('SELECT * FROM users ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get('/admin/data/sessions', (req, res) => {
  db.all(`
    SELECT 
      s.id,
      s.user_id,
      u.username,
      COALESCE(s.total_score, 0) as total_score,
      COALESCE(s.cases_completed, 0) as cases_completed,
      s.started_at,
      s.ended_at,
      COUNT(ca.id) as case_attempts_count,
      CASE 
        WHEN s.ended_at IS NULL THEN 'Active'
        ELSE 'Completed'
      END as status
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN case_attempts ca ON s.id = ca.session_id
    GROUP BY s.id
    ORDER BY s.started_at DESC
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get('/admin/data/case-attempts', (req, res) => {
  db.all(`
    SELECT 
      ca.*,
      u.username,
      s.started_at as session_start,
      COALESCE(ca.test_points, 0) as test_points,
      COALESCE(ca.diagnosis_points, 0) as diagnosis_points,
      COALESCE(ca.total_points, 0) as total_points,
      CASE 
        WHEN ca.completed = 1 THEN 'Completed'
        ELSE 'In Progress'
      END as status
    FROM case_attempts ca
    JOIN sessions s ON ca.session_id = s.id
    JOIN users u ON s.user_id = u.id
    ORDER BY ca.started_at DESC
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get('/admin/data/actions', (req, res) => {
  db.all(`
    SELECT 
      la.*,
      u.username,
      ca.case_id
    FROM learner_actions la
    JOIN sessions s ON la.session_id = s.id
    JOIN users u ON s.user_id = u.id
    LEFT JOIN case_attempts ca ON la.case_attempt_id = ca.id
    ORDER BY la.timestamp DESC
    LIMIT 1000
  `, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Serve the admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 