# SuburbLearner Web (PWA)

A lean, offline-capable PWA to help cyclists learn which suburb and road they’re on. Built with Vite + TypeScript, MapLibre GL, a Web Worker for geometry, and a Service Worker for offline.

## Run locally

```bash
npm i
npm run dev
```

Open the URL printed by Vite. Allow location and motion permissions when prompted.

## Demo mode

Append `?demo=1` to the URL to simulate movement in Dublin:

```text
http://localhost:5173/?demo=1
```

## Offline & install

- App shell is cached on first load via a service worker.
- Manifest is included; use the Install button or your browser’s menu to install.
- Tiles use a simple stale-while-revalidate strategy.

## What’s offline

- App shell (HTML, JS, CSS, icons, manifest)
- Basic suburb polygons + landmarks (bundled GeoJSON)
- Map tiles are cached at runtime with a small rolling cache (SWR)

## Notes

- iOS: Works in foreground; no background location. Use the Wake Lock toggle to keep the screen on.
- Vector tile road reverse-geocoding can be added by swapping the base style to one with routable roads and querying rendered features.
