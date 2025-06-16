# Medical Diagnosis Mini-Game (Offline-First Expo + Express)

A chat-based learning mini-game that helps NEET-PG aspirants practice diagnosing virtual patients – **even with no internet**.  
The mobile app is built with **React-Native / Expo Router** and stores every action in a local SQLite DB.  
When the device regains connectivity a background **SyncManager** pushes pending rows to a lightweight Express API.

---

## ✨ Features
* 10-point scoring system (tests + diagnosis) – see `utils/gameData.ts`  
* Works fully offline – play on the metro!  
* Automatic background sync with *last-writer-wins* conflict rule  
* Connection toasts: **Offline ▸ Syncing… ▸ Synced**  
* Unit-tested scoring helper with Jest

> Live chat / LLM guidance & WebSocket transport are planned but **not yet implemented**.

---

## ⚙️ Requirements
* **Node.js ≥ 18** & **npm ≥ 9**
* **Expo CLI** (global) – install once: `npm install -g expo-cli`
* Android Studio / Xcode simulators **or** a real device with the Expo Go app

---

## 🚀 Quick Start

```bash
# 1. Clone & install root dependencies
npm install

# 2. Install backend deps & start API (port 3000)
(cd backend && npm install && npm start)

# 3. Launch the Expo app (new terminal)
#     – choose iOS, Android, Web or expo-go
npm start
```
The mobile app expects the backend to be reachable at `http://localhost:3000`.  
When running on a physical device make sure to replace the host in `services/gameApi.ts` with your LAN IP (e.g. `http://192.168.1.5:3000`).

---

## 🧪 Running Tests
```bash
npm test            # run once
npm run test:watch  # watch mode
```
The suite in `__tests__/gameLogic.test.ts` covers the scoring helper and sample case.

---

## 📂 Project Structure (high-level)
```
.
├── app/                 # Expo Router entrypoints & screens
│   ├── _layout.tsx      # SafeArea, Toast provider, router stack
│   └── index.tsx        # Home – initialises DB & SyncManager
├── components/
│   └── ConnectionStatus.tsx  # hook + UI + connection toasts
├── utils/gameData.ts    # sample cases + scoring helpers
├── db/localDb.ts        # typed wrapper around expo-sqlite tables
├── services/
│   ├── syncManager.ts   # offline → online batch sync
│   └── gameApi.ts       # facade used by screens/game logic
├── backend/             # lightweight Express API + server-side SQLite
│   ├── server.js        # routes: /sessions, /case-attempts, /actions
│   └── db/init.js       # table creation
├── __tests__/           # Jest tests
└── DESIGN.md            # high-level architecture & decisions
```

---

## 📡 Offline-to-Online Walk-through
1. Start in **Airplane Mode** – perform some actions (they are inserted into `learner_actions` with `sync_status = 'pending'`).
2. Turn Wi-Fi back on – `NetInfo` flips `isConnected` ▶ SyncManager emits *Syncing* toast, pushes rows, then shows *Synced* when all tables are marked `synced`.
3. Inspect logs (`console.log`) or DB rows to confirm.

---

## 🛠️ Useful Scripts
| Command                        | Description                       |
|--------------------------------|-----------------------------------|
| `npm start`                    | Expo dev server                   |
| `npm run android / ios / web`  | Platform specific launch          |
| `npm run lint`                 | ESLint via Expo                   |
| `npm test`                     | Jest unit tests                   |
| `cd backend && npm start`      | Start Express API                 |

---

## 💬 FAQ
**Q. It says "Network request failed" when syncing on device**  
A. Change `API_BASE_URL` in `services/gameApi.ts` to your computer's local IP (the phone can't resolve `localhost`).

**Q. Where is the chat UI / AI doctor?**  
A. This prototype focuses on the offline-first architecture & scoring logic. The chat layer will be added next.

---

Enjoy diagnosing offline! 🩺
