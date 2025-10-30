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


## License
MIT
