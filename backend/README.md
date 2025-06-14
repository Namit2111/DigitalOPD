# Medical Diagnosis Game Backend

A Node.js backend with SQLite database for the Medical Diagnosis Training Game.

## Features

- User session management
- Case attempt tracking
- Detailed action logging
- Performance statistics
- Session history
- SQLite database for local storage

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:3000` by default.

## Database Schema

### Users
- Stores user information
- Each user has a unique username

### Sessions
- Tracks game sessions
- Stores total score and cases completed
- Links to user

### Case Attempts
- Records individual case attempts
- Tracks test and diagnosis attempts
- Stores points earned
- Links to session

### Learner Actions
- Logs every action with timestamp
- Includes action type and data
- Links to session and case attempt

## API Endpoints

### Sessions
- `POST /api/sessions` - Start new session
- `PUT /api/sessions/:sessionId/end` - End session

### Case Attempts
- `POST /api/case-attempts` - Start new case attempt
- `PUT /api/case-attempts/:caseAttemptId/complete` - Complete case attempt

### Actions
- `POST /api/actions` - Log learner action

### Statistics
- `GET /api/users/:username/stats` - Get user statistics
- `GET /api/users/:username/history` - Get session history

## Action Types

The system logs the following action types:
- START_SESSION
- END_SESSION
- START_CASE
- SUBMIT_TEST
- SUBMIT_DIAGNOSIS
- COMPLETE_CASE
- VIEW_HELP
- VIEW_STATS
- SKIP_STEP

Each action is stored with:
- Timestamp
- Session ID
- Case Attempt ID (if applicable)
- Action Type
- Action Data (JSON) 