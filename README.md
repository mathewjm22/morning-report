# Morning Report

Stepwise clinical reasoning practice using NEJM Case Records of the Massachusetts General Hospital.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via `.github/workflows/deploy.yml`.

**Before first deploy:**

1. In your GitHub repo → **Settings** → **Pages** → **Build and deployment** → Source: **GitHub Actions**
2. Push to `main`. Wait ~2 minutes.
3. Site will be live at `https://YOUR-USERNAME.github.io/YOUR-REPO/`

**Important:** update `base` in `vite.config.js` to match your repo name (currently `/morning-report/`).

## Backend

The Cloudflare Worker parses uploaded PDFs into gate structure and stores shared cases.

Worker URL is set in `src/lib/api.js`. Update if you redeploy the Worker to a new URL.

## Project structure

- `src/App.jsx` — router
- `src/components/Home.jsx` — case library home screen
- `src/components/CaseWalkthrough.jsx` — main gate-by-gate UI
- `src/components/Whiteboard.jsx` — right-side reasoning panel
- `src/components/AnnotationCanvas.jsx` — drawing on medical images
- `src/lib/api.js` — Worker calls (parse, save-share, load-shared)
- `src/lib/storage.js` — localStorage for saved cases and user progress
- `src/data/sampleCase.js` — hardcoded alpha-gal case for testing

## Roadmap

- **Round 1 (current)** — Repo scaffold, sample case walkthrough, share URLs
- **Round 2** — PDF upload with automatic text + image extraction
- **Round 3** — Manual image paste fallback, polish
