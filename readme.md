# Gleam (Vite + React)
    npm install
    cp .env.example .env     # add your META_API_KEY
    npm run dev              # app: http://localhost:5173  (API on :8787)
Vite is front-end only, so server/index.ts is a small Express server that keeps the key private.