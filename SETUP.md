# Setup & Deployment (EduScrapeAppWeb)

This repository contains:
- **Frontend**: React + Vite + Tailwind (in `src/`)
- **Backend**: Convex functions + auth + AI assistant (in `convex/`)

## Prerequisites

- Node.js (LTS recommended)
- npm
- Convex CLI access (via `npx convex ...`)

## 1) Install

```bash
npm install
```

## 2) Frontend environment variables (Vite)

Vite env vars must be prefixed with `VITE_`.

Create a local env file using the example (your preference: keep both `.env.local` and `.env.production` locally):

- Copy `.env.example` → `.env.local` (development)
- Copy `.env.example` → `.env.production` (production build)
- Set:
  - `VITE_CONVEX_URL=https://<your-deployment-name>.convex.cloud`

Where to find the URL:
- In the Convex dashboard for your project (Deployment URL)

## 3) Convex environment variables (server-side)

Set these in **Convex Dashboard → Settings → Environment Variables** or via CLI.

### 3.1 Auth providers (OAuth)

Required if you want Google/GitHub sign-in:

| Variable | Description |
| --- | --- |
| `CONVEX_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `CONVEX_GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `CONVEX_GITHUB_CLIENT_ID` | GitHub OAuth client ID |
| `CONVEX_GITHUB_CLIENT_SECRET` | GitHub OAuth client secret |
| `CONVEX_SITE_URL` | Deployed site URL (e.g. `https://your-app.vercel.app`) |

Notes:
- `CONVEX_SITE_URL` is preferred.
- `SITE_URL` is also accepted for backwards compatibility.

### 3.2 OpenRouter (AI Assistant)

Required for the chatbot action:

| Variable | Description |
| --- | --- |
| `OPENROUTER_API_KEY` | OpenRouter API key (keep secret; never commit) |

Optional (model overrides):

| Variable | Description | Default |
| --- | --- | --- |
| `OPENROUTER_TOOL_MODEL` | Tool-calling model | `mistralai/devstral-2512:free` |
| `OPENROUTER_WRITER_MODEL` | Writer model (final answer; no tools) | `meta-llama/llama-3.3-70b-instruct:free` |

CLI examples:

```bash
# Development
npx convex env set OPENROUTER_API_KEY "<your-key>"

# Production
npx convex env set OPENROUTER_API_KEY "<your-key>" --prod
```

## 4) Run locally

This project runs **frontend + backend in parallel**.

```bash
npm run dev
```

- Frontend: Vite will print the local URL in the terminal
- Backend: Convex runs via `convex dev`

## 5) Production build

```bash
npm run build
```

Optional local preview of the production build:

```bash
npm run preview
```

## 6) Deployment notes

### Vercel (frontend)

- Deploy the Vite app as a static build.
- Ensure `VITE_CONVEX_URL` is set in the Vercel project environment variables.
- Security headers can be set using either:
  - `vercel.json` (already present)
  - or the `_headers` reference file for other hosts

### Convex (backend)

- Deploy Convex functions from the project root:

```bash
npx convex deploy
```

- Ensure server-side env vars are set (especially `OPENROUTER_API_KEY`).

## 7) Troubleshooting

- **Blank page / Convex errors**: confirm `VITE_CONVEX_URL` points to the correct deployment.
- **Chatbot errors**: confirm `OPENROUTER_API_KEY` exists in Convex env vars (dev/prod).

## 3.3 ElevenLabs (Voice: TTS + Realtime STT)

ElevenLabs is integrated for:

- **Text-to-Speech (TTS)** via Convex HTTP route: `/eleven/tts`
- **Realtime Speech-to-Text (Scribe v2 Realtime)** via Convex HTTP route: `/eleven/scribe-token`

Set these in **Convex Dashboard → Settings → Environment Variables** (dev/prod):

- `ELEVENLABS_API_KEY` (keep secret)
- `ELEVENLABS_DEFAULT_VOICE_ID` (required for TTS)

Optional:

- `ELEVENLABS_TTS_MODEL_ID` (default: `eleven_flash_v2_5`)
- `ELEVENLABS_OUTPUT_FORMAT` (default: `mp3_44100_128`)

Frontend (Vite) toggles (safe to be `VITE_`):

- `VITE_TTS_PROVIDER=elevenlabs` (otherwise uses browser TTS)
- `VITE_STT_PROVIDER=elevenlabs` (otherwise uses browser SpeechRecognition)
- **Auth provider not showing**: confirm OAuth variables + `SITE_URL` are set correctly.

## Security checklist

- Keep `.env.local` and `.env.production` locally, but never commit them.
- The only env file intended to be committed is `.env.example`.
- Keep OpenRouter keys only in Convex env vars.
