# Suburb Explorer Web

A minimal PWA built with Vite + TypeScript + MapLibre for exploring suburbs with heading-up map orientation and a simple HUD.

## Apps
- `suburb-learner-pwa/` — the PWA source.

## Quick start
```bash
# from repo root
cd suburb-learner-pwa
npm ci
npm run dev -- --host
```
Open the printed LAN URL in Safari on iOS for device testing.

## Build
```bash
cd suburb-learner-pwa
npm run build
# output in suburb-learner-pwa/dist
```

## Deploy (GitHub Pages)
This repo includes a workflow at `.github/workflows/deploy.yml` that builds and publishes `suburb-learner-pwa/dist` to the `gh-pages` branch on pushes to `main`.

1) In GitHub → Settings → Pages:
   - Source: Deploy from a branch
   - Branch: `gh-pages` and root `/`
2) Push to `main` and check the Action “Deploy PWA to GitHub Pages”.
3) Site URL: `https://<your-username>.github.io/<repo>/`

Notes:
- The workflow uses `secrets.GITHUB_TOKEN` with `contents: write`; it is not exposed in build output.
- For private repos, GitHub Pages requires a paid plan. Alternatives: Vercel, Netlify, Cloudflare Pages.

## iOS install (Add to Home Screen)
1) Open the deployed HTTPS URL in Safari.
2) Share → Add to Home Screen.
3) On first run:
   - Tap “Calibrate” to grant Motion & Orientation.
   - Allow Location.

After installation you can stop any local dev server. The app runs from the cached files, but still fetches live map tiles over the network.

## Features
- MapLibre raster basemap (OpenStreetMap)
- Heading-up rotation using device sensors
- Big zoom controls (bottom-left), remembered between sessions
- Simple HUD with suburb labels (demo)

## Dynamic suburb names (online fallback)
The app can fetch suburb/neighbourhood names anywhere in the world using LocationIQ when local polygons don't cover the area.

Setup:

1. Create a free LocationIQ account and get an API key.
2. Option A — create a `.env` in `suburb-learner-pwa/`:

```
VITE_GEOCODER_PROVIDER=locationiq
VITE_GEOCODER_KEY=YOUR_LOCATIONIQ_KEY
```

Notes:
- Requests are debounced and cached per ~150 m grid cell to minimize usage.
- If no name is returned, the HUD shows `—` until a valid response is received.

### Cadence policy (optimized for cycling)
- Current suburb lookup: when moved ≥300 m since last query or ≥90 s elapsed (whichever later). One lookup on app start.
- Directional labels: probe ~1.2 km ahead; refresh when moved ≥500 m, heading changed ≥90°, or ≥60 s elapsed.
- Stationary detection: if speed < 1 m/s for 20 s, skip directional probes.
- Requests are globally throttled to ~1 req/sec and paused for 60 s after any 429.

Option B — enter the key in the app:

- Open the gear panel, paste the key into “Geocoder key,” then Save. It’s stored locally in the browser and overrides the build-time key.


## License
MIT
