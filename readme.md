# Gleam (Vite + React + Express + SQLite)
    npm install
    cp .env.example .env     # add META_API_KEY
    npm run dev              # app http://localhost:5173, API :8787
- Comments are saved in `gleam.db` (SQLite, created on first run).
- Thank-you cards: Muse Image, on demand (~$0.01 each). Voice: 🎤 records, converts to WAV, Muse Voice Transcribe.
- Accuracy tab: runs 34 labeled comments through built-in rules and Muse Spark. Edit `server/eval-set.ts` to add more.