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
    center: saved?.center ?? [-6.225, 53.333],
    zoom: saved?.zoom ?? 13,
  });

  // User line layer
  map.on('load', () => {
    // Zoom controls (move to bottom-left to avoid HUD overlap)
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');

    map.addSource('user-ray', { type: 'geojson', data: emptyMutable() as any });
    map.addLayer({ id: 'user-ray-casing', type: 'line', source: 'user-ray', paint: { 'line-color': '#00121f', 'line-width': 8, 'line-opacity': 0.8 } });
    map.addLayer({ id: 'user-ray-inner', type: 'line', source: 'user-ray', paint: { 'line-color': '#00e5ff', 'line-width': 4 } });
    map.addLayer({ id: 'user-ray-center', type: 'line', source: 'user-ray', paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-dasharray': [2, 2] } });

    // Demo roads removed per request; rely on map labels only
  });

  let lastPos: PositionUpdate | null = null;
  let lastHeading = 0;

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

  return { updatePosition, updateHeading, setUserPosition };
}

function emptyMutable() {
  return { type: 'FeatureCollection', features: [] } as { type: 'FeatureCollection'; features: any[] };
}

function loadViewState(): { center: [number, number]; zoom: number } | null {
  try {
    const raw = localStorage.getItem('viewState');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

// Persist view state
export function persistViewState(map: maplibregl.Map) {
  try {
    const c = map.getCenter();
    const z = map.getZoom();
    localStorage.setItem('viewState', JSON.stringify({ center: [c.lng, c.lat], zoom: z }));
  } catch {}
}


