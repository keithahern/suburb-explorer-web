import maplibregl from 'maplibre-gl';
import type { LngLatLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { computeRayToViewportEdge } from './roadRay';
import type { PositionUpdate } from '../types';

export function initMap(container: HTMLElement) {
  const saved = loadViewState();
  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap'
        }
      },
      layers: [
        { id: 'osm', type: 'raster', source: 'osm' }
      ]
    },
    // Default center nudged inland around Sandymount village to avoid water view at high zoom
    center: saved?.center ?? [-6.2189, 53.3266],
    zoom: saved?.zoom ?? 12,
  });

  // Disable all zoom interactions (buttons/gestures/keyboard)
  try {
    (map as any).scrollZoom?.disable?.();
    (map as any).boxZoom?.disable?.();
    (map as any).doubleClickZoom?.disable?.();
    (map as any).touchZoomRotate?.disable?.();
    (map as any).keyboard?.disable?.();
  } catch {}

  // Add explicit zoom controls (persisted via view-state listeners below)
  try {
    map.addControl(new maplibregl.NavigationControl({ showZoom: true, showCompass: false }), 'bottom-left');
  } catch {}

  // User line layer
  map.on('load', () => {
    map.addSource('user-ray', { type: 'geojson', data: emptyMutable() as any });
    map.addLayer({ id: 'user-ray-casing', type: 'line', source: 'user-ray', paint: { 'line-color': '#00121f', 'line-width': 8, 'line-opacity': 0.8 } });
    map.addLayer({ id: 'user-ray-inner', type: 'line', source: 'user-ray', paint: { 'line-color': '#00e5ff', 'line-width': 4 } });
    map.addLayer({ id: 'user-ray-center', type: 'line', source: 'user-ray', paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [2, 2] } });

    // Demo roads removed per request; rely on map labels only
  });

  let lastPos: PositionUpdate | null = null;
  let lastHeading = 0;
  let suppressHeading = false;

  function updatePosition(pos: PositionUpdate) {
    lastPos = pos;
    // Pan map to current position (demo visibly moves)
    try {
      (map as any).easeTo?.({ center: [pos.coord.lng, pos.coord.lat], duration: 500, essential: true });
    } catch {}
    updateRay();
  }

  function updateHeading(heading: number) {
    lastHeading = heading;
    if (suppressHeading) return; // don't interrupt active zooms
    try {
      // Rotate map so user's forward direction points up: bearing is negative of heading
      if (typeof (map as any).setBearing === 'function') {
        (map as any).setBearing(-heading);
      } else {
        (map as any).easeTo?.({ bearing: -heading, duration: 200, essential: true });
      }
    } catch {}
    updateRay();
  }

  function updateRay() {
    if (!lastPos || !map.loaded()) return;
    const p = map.project([lastPos.coord.lng, lastPos.coord.lat]);
    const dest = computeRayToViewportEdge(p.x, p.y, lastHeading, map.getCanvas().width, map.getCanvas().height);
    if (!dest) return;
    const line = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [ [lastPos.coord.lng, lastPos.coord.lat], map.unproject([dest.x, dest.y]).toArray() as [number, number] ] },
          properties: {}
        }
      ]
    } as const;
    (map.getSource('user-ray') as any)?.setData(line);
  }

  function setUserPosition(_coord: LngLatLike, _accuracy: number) {
    // Placeholder noop; could draw a circle marker
  }

  map.on('moveend', () => persistViewState(map));
  map.on('zoomend', () => persistViewState(map));
  map.on('zoomstart', () => { suppressHeading = true; });
  map.on('zoomend', () => { suppressHeading = false; });

  return { updatePosition, updateHeading, setUserPosition };
}

function emptyMutable() {
  return { type: 'FeatureCollection', features: [] } as { type: 'FeatureCollection'; features: any[] };
}

const VIEW_STATE_KEY = 'viewState_v3';

function loadViewState(): { center: [number, number]; zoom: number } | null {
  try {
    const raw = localStorage.getItem(VIEW_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// Persist view state
export function persistViewState(map: maplibregl.Map) {
  try {
    const c = map.getCenter();
    const z = map.getZoom();
    localStorage.setItem(VIEW_STATE_KEY, JSON.stringify({ center: [c.lng, c.lat], zoom: z }));
  } catch {}
}

// Zoom controls enabled

