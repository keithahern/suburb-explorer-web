/// <reference lib="webworker" />
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import RBush, { type BBox } from 'rbush';

type PolygonFeature = {
  type: 'Feature';
  properties: { name: string; id: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: any };
  bbox?: [number, number, number, number];
};

type TreeItem = BBox & { idx: number };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
let features: PolygonFeature[] = [];
const tree = new RBush<TreeItem>();
let lastSuburb: string | null = null;

ctx.addEventListener('message', (e) => {
  const msg = e.data;
  if (msg.type === 'build-index') {
    features = msg.polygons as PolygonFeature[];
    const items: TreeItem[] = [];
    features.forEach((f, idx) => {
      const b = f.bbox ?? computeBBox(f);
      items.push({ minX: b[0], minY: b[1], maxX: b[2], maxY: b[3], idx });
    });
    tree.clear();
    tree.load(items);
    ctx.postMessage({ type: 'ready' });
  }
  if (msg.type === 'loc-update') {
    const { coord, heading } = msg as { coord: {lng:number;lat:number}; heading?: number };
    const hereSuburb = getSuburbAt(coord.lng, coord.lat);
    if (hereSuburb) lastSuburb = hereSuburb;

    const h = (typeof heading === 'number' && !Number.isNaN(heading)) ? heading : 0;
    const norm = (a: number) => (a % 360 + 360) % 360;
    const next = {
      top: castUntilChange(coord, norm(h)),
      bottom: castUntilChange(coord, norm(h + 180)),
      left: castUntilChange(coord, norm(h - 90)),
      right: castUntilChange(coord, norm(h + 90)),
    } as const;

    ctx.postMessage({ type: 'loc-result', suburbName: lastSuburb, nextDirs: next });
  }
});

function computeBBox(f: PolygonFeature): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const iterate = (coords: any[]) => {
    for (const ring of coords) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  };
  if (f.geometry.type === 'Polygon') iterate(f.geometry.coordinates);
  else for (const poly of f.geometry.coordinates) iterate(poly);
  return [minX, minY, maxX, maxY];
}

function getSuburbAt(lng: number, lat: number): string | null {
  const candidates = tree.search({ minX: lng, minY: lat, maxX: lng, maxY: lat });
  for (const c of candidates) {
    const feat = features[c.idx];
    if (booleanPointInPolygon([lng, lat], feat as any)) return feat.properties.name;
  }
  return null;
}

function castUntilChange(coord: {lng:number;lat:number}, bearingDeg: number): { name: string|null; distM: number|null } {
  const startName = getSuburbAt(coord.lng, coord.lat);
  const stepM = 50;
  const maxM = 3000;
  let traveled = 0;
  const rad = (bearingDeg * Math.PI) / 180;
  const cosLat = Math.cos((coord.lat * Math.PI) / 180);
  const dLngPerM = 1 / (111320 * cosLat);
  const dLatPerM = 1 / 110540;
  let lng = coord.lng;
  let lat = coord.lat;
  while (traveled <= maxM) {
    lng += Math.sin(rad) * stepM * dLngPerM;
    lat += Math.cos(rad) * stepM * dLatPerM;
    traveled += stepM;
    const name = getSuburbAt(lng, lat);
    if (name && name !== startName) return { name, distM: traveled };
  }
  return { name: null, distM: null };
}


