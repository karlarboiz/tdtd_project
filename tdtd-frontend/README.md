# tdtd-frontend

React + Vite UI for **Teacher's Dilemma Today**. Talks to `tdtd-node` over REST.

## Local development

1. Start the API (from repo root):

   ```bash
   cd tdtd-node
   npm install
   npm run build
   npm start
   ```

   API: `http://localhost:3000`

2. Start the UI:

   ```bash
   cd tdtd-frontend
   npm install
   npm run dev
   ```

   UI: `http://localhost:5173` (port may vary)

By default the app calls `http://127.0.0.1:3000` in dev (`src/lib/http.ts`). Override with `VITE_API_URL` — see [`.env.example`](./.env.example).

## Environment

Copy [`.env.example`](./.env.example) to `.env.local` when you need custom API routing (e.g. ngrok). Restart Vite after edits.

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | API base URL (no trailing slash). Unset in dev → `http://127.0.0.1:3000`. Empty string → relative `/api` + Vite proxy. |

## Share a demo with ngrok

To expose your **local** app on the internet (phones, remote viewers), use **Option B** (two tunnels: API + UI):

**[Ngrok demo guide](../.cursor/documentation/Ngrok-Demo.md)** — use [`ngrok.tdtd.example.yml`](../ngrok.tdtd.example.yml) for both tunnels in one ngrok process (avoids free-tier `ERR_NGROK_334`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |

## UI conventions

Palette, layout (`AppShell`, `PageContainer`), and compliance checklist: [`.cursor/rules/UI-Rules.md`](../.cursor/rules/UI-Rules.md), [`.cursor/documentation/UI-Compliance-Checklist.md`](../.cursor/documentation/UI-Compliance-Checklist.md).
