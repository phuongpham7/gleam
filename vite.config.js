import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The browser only talks to /api; Vite forwards it to the Node server, which holds the API key.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:8787" } },
});
