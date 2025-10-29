import './app.css';
import { initMap } from './map/initMap';
import { createHUD } from './ui/HUD';
import { createToggles } from './ui/Toggles';
import { startGeolocationLoop } from './geolocate';
import { startHeading } from './heading';
import { registerSW } from './sw-register';
import type { PositionUpdate } from './types';
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
createToggles(document.getElementById('toggles')!);

// Register service worker
registerSW();

// Demo mode via URL ?demo=1
const url = new URL(location.href);
const demo = url.searchParams.get('demo') === '1';

// Start heading and geolocation
startHeading((deg) => {
  hud.updateHeading(deg);
  map.updateHeading(deg);
});

// Setup worker for suburb detection
const worker = new Worker(new URL('./geo-worker.ts', import.meta.url), { type: 'module' });
fetch(suburbsUrl)
  .then((r) => r.json())
  .then((gj) => worker.postMessage({ type: 'build-index', polygons: gj.features }));

worker.addEventListener('message', (e) => {
  const m = e.data;
  if (m.type === 'loc-result') {
    hud.setSuburb(m.suburbName || '—');
    hud.setApproach(m.nextName, m.nextDistanceM);
  }
});

startGeolocationLoop({ demo }, async (pos: PositionUpdate) => {
  hud.updatePosition(pos);
  map.updatePosition(pos);
  worker.postMessage({ type: 'loc-update', coord: pos.coord, heading: pos.heading ?? 0 });
});
