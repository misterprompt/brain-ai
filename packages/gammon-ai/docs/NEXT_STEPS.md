# GuruGammon - Implementation Planning & Roadmap

## 🤖 Recommended AI Strategy
For this project, use a **Hybrid approach**:
- **DeepSeek R1 (High Reasoning)**: Use for **Phase 1 & 3**. Best for server configuration, security audits, and complex multiplayer logic (matchmaking, race conditions).
- **Claude 3.5 Sonnet / GPT-4o (Standard)**: Use for **Phase 2**. Best for React components, CSS animations, and writing documentation.

---

## 📅 Phase 1: Deployment & Pre-Flight (Immediate)
*Objective: Get the "AI vs Player" mode live on the internet.*

### 1.1 Production Secrets Setup
- [ ] Generate strong random strings for `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET`.
- [ ] Create a Production Database (Supabase/Neon/Render PostgreSQL).
- [ ] **Prompt for AI**: *"Help me generate 32-byte random hex strings for my JWT secrets."*

### 1.2 Backend Deployment (Render/Railway)
- [ ] Verify `package.json` start script (`npm start` -> `node dist/server.js`).
- [ ] Set environment variables in Render Dashboard.
- [ ] **Prompt for AI**: *"Review my render.yaml one last time. I am deploying a Node.js API. What exact environment variables must I set in the dashboard manually?"*

### 1.3 Frontend Deployment (Netlify/Vercel)
- [ ] Set `VITE_API_BASE_URL` to your **production backend URL** (e.g., `https://api.gurugammon.com`).
- [ ] Run a test build locally: `cd guru-react && npm run build`.
- [ ] **Prompt for AI**: *"I am deploying Vite to Netlify. Do I need a `_redirects` file for SPA routing so that refreshing the page doesn't give a 404?"*

---

## 🎨 Phase 2: UI/UX Polish (Next)
*Objective: Make the game feel responsive and professional.*

### 2.1 Feedback & Animations
- [ ] **Dice Animation**: Add a 1-second CSS shake/roll animation before showing the result.
- [ ] **Move Animation**: Use Framer Motion to slide checkers instead of teleporting them.
- [ ] **Sound Effects**: Hook up the `SoundService` (roll, move, hit, win).

### 2.2 Game States
- [ ] **Game Over Modal**: Create a nice popup showing "You Won!" or "You Lost" with a "Play Again" button.
- [ ] **Turn Indicator**: clearly highlight whose turn it is (glowing avatar or border).

---

## ⚔️ Phase 3: Multiplayer (Complex)
*Objective: Enable Human vs Human play.*

### 3.1 Matchmaking Logic
- [ ] Implement `joinQueue` and `leaveQueue` in `MatchmakingService`.
- [ ] Handle user disconnections during a game (reconnect window).

### 3.2 Lobby UI
- [ ] Create a "Lobby" view listing online players.
- [ ] Add "Invite" button functionality.

---

## 🧪 Phase 4: Quality Assurance
- [ ] **Load Testing**: Simulate 50 concurrent games to check WebSocket performance.
- [ ] **Quota Testing**: Verify that the AI stops responding after the free limit is reached.
