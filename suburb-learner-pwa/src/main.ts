import './app.css';
import { initMap } from './map/initMap';
import { createHUD } from './ui/HUD';
import { createToggles } from './ui/Toggles';
import { startGeolocationLoop } from './geolocate';
import { startHeading } from './heading';
import { registerSW } from './sw-register';
import type { PositionUpdate } from './types';
import { createSuburbResolver } from './geo/suburbProvider';
// Ensure suburbs data resolves in dev and build
import suburbsUrl from './data/dublin_suburbs.geojson?url';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="hud"></div>
  <div id="map"></div>
  <div id="toggles"></div>
`;

const map = initMap(document.getElementById('map')!);
const hud = createHUD(document.getElementById('hud')!);
const suburbResolver = createSuburbResolver();
createToggles(document.getElementById('toggles')!);

// Register service worker
registerSW();

// Demo mode via URL ?demo=1
const url = new URL(location.href);
const demo = url.searchParams.get('demo') === '1';

// Start heading and geolocation
let lastCoord: { lng: number; lat: number } | null = null;
let lastHeadingDeg: number | null = null;
let lastDirsAt: number = 0;
let lastDirsCoord: { lng: number; lat: number } | null = null;
let lastDirsHeading: number | null = null;
let lastSuburbAt: number = 0;
let lastSuburbCoord: { lng: number; lat: number } | null = null;
let stationarySince: number | null = null;
startHeading((deg) => {
  hud.updateHeading(deg);
  map.updateHeading(deg);
  if (lastCoord) {
    worker.postMessage({ type: 'loc-update', coord: lastCoord, heading: deg });
  }
  lastHeadingDeg = deg;
  maybeUpdateDirections();
  // No suburb query on heading-only changes
});

// Setup worker for suburb detection
const worker = new Worker(new URL('./geo-worker.ts', import.meta.url), { type: 'module' });
fetch(suburbsUrl)
  .then((r) => r.json())
  .then((gj) => worker.postMessage({ type: 'build-index', polygons: gj.features }));

worker.addEventListener('message', (e) => {
  const m = e.data;
  if (m.type === 'loc-result') {
    if (m.suburbName) hud.setSuburb(m.suburbName);
    hud.setApproach(m.nextName, m.nextDistanceM);
    if (m.nextDirs) hud.setNextDirs(m.nextDirs);
    // Fallback: if no suburb from local polygons, resolve via online provider
    if ((!m.suburbName || m.suburbName === null) && lastCoord) {
      const queryAt = lastCoord; // snapshot to compare drift
      suburbResolver.resolve(queryAt).then((name) => {
        if (!name) return;
        // Only apply if user hasn't moved far (>200 m) since the query
        if (lastCoord && distanceMeters(lastCoord, queryAt) <= 200) {
          hud.setSuburb(name);
        }
      });
    }
  }
});

startGeolocationLoop({ demo }, async (pos: PositionUpdate) => {
  hud.updatePosition(pos);
  map.updatePosition(pos);
   lastCoord = pos.coord;
  worker.postMessage({ type: 'loc-update', coord: pos.coord, heading: pos.heading ?? 0 });
  if (typeof pos.heading === 'number') lastHeadingDeg = pos.heading;
  // Stationary detection (speed < 1 m/s sustained)
  const now = Date.now();
  if (pos.speedMps != null && pos.speedMps < 1) {
    if (stationarySince == null) stationarySince = now;
  } else {
    stationarySince = null;
  }
  maybeUpdateDirections();
  maybeUpdateSuburb();
});

function distanceMeters(a: { lng: number; lat: number }, b: { lng: number; lat: number }): number {
  const dx = (a.lng - b.lng) * 111320 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const dy = (a.lat - b.lat) * 110540;
  return Math.hypot(dx, dy);
}

function destination(coord: { lng: number; lat: number }, bearingDeg: number, distM: number): { lng: number; lat: number } {
  const rad = (bearingDeg * Math.PI) / 180;
  const cosLat = Math.cos((coord.lat * Math.PI) / 180);
  const dLngPerM = 1 / (111320 * Math.max(0.000001, cosLat));
  const dLatPerM = 1 / 110540;
  return {
    lng: coord.lng + Math.sin(rad) * distM * dLngPerM,
    lat: coord.lat + Math.cos(rad) * distM * dLatPerM,
  };
}

function norm(a: number) { return (a % 360 + 360) % 360; }

async function maybeUpdateDirections() {
  if (!lastCoord || lastHeadingDeg == null) return;
  const now = Date.now();
  if (stationarySince && now - stationarySince >= 20000) return; // skip if stationary ≥20s
  const movedEnough = !lastDirsCoord || distanceMeters(lastCoord, lastDirsCoord) >= 500;
  const turnedEnough = lastDirsHeading == null || Math.abs(norm(lastHeadingDeg - (lastDirsHeading ?? 0))) >= 90;
  const timeOk = now - lastDirsAt >= 60000; // ≥60s cadence
  if (!(movedEnough || turnedEnough || timeOk)) return;

  lastDirsAt = now;
  lastDirsCoord = lastCoord;
  lastDirsHeading = lastHeadingDeg;

  const h = norm(lastHeadingDeg);
  const probeM = 1200;
  const targets = {
    top: destination(lastCoord, h, probeM),
    bottom: destination(lastCoord, h + 180, probeM),
    left: destination(lastCoord, h - 90, probeM),
    right: destination(lastCoord, h + 90, probeM),
  } as const;

  // Stagger requests to avoid per-second rate limits
  const nTop = await suburbResolver.resolve(targets.top);
  await new Promise((r) => setTimeout(r, 300));
  const nBottom = await suburbResolver.resolve(targets.bottom);
  await new Promise((r) => setTimeout(r, 300));
  const nLeft = await suburbResolver.resolve(targets.left);
  await new Promise((r) => setTimeout(r, 300));
  const nRight = await suburbResolver.resolve(targets.right);

  hud.setNextDirs({
    top: { name: nTop, distM: probeM },
    bottom: { name: nBottom, distM: probeM },
    left: { name: nLeft, distM: probeM },
    right: { name: nRight, distM: probeM },
  });
}

async function maybeUpdateSuburb() {
  if (!lastCoord) return;
  const now = Date.now();
  const first = !lastSuburbCoord;
  const moved = !lastSuburbCoord || distanceMeters(lastCoord, lastSuburbCoord) >= 300;
  const timed = now - lastSuburbAt >= 90000; // ≥90s
  if (!(first || moved || timed)) return;

  const queryAt = lastCoord;
  lastSuburbAt = now;
  lastSuburbCoord = queryAt;
  const name = await suburbResolver.resolve(queryAt);
  if (!name) return;
  if (lastCoord && distanceMeters(lastCoord, queryAt) <= 200) hud.setSuburb(name);
}
