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
    // Update even when null to avoid stale labels persisting outside covered areas
    lastSuburb = hereSuburb;

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
  const stepM = 25;
  const maxM = 10000; // 10 km window
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
  // Fallback: choose nearest suburb roughly along this bearing (centroid angle within 60°)
  const candidates = features
    .map((f, idx) => ({ f, idx, center: bboxCenter(f.bbox ?? computeBBox(f)) }))
    .filter((c) => c.f.properties.name !== startName)
    .map((c) => {
      const brg = bearingDegBetween(coord, { lng: c.center[0], lat: c.center[1] });
      const ang = angleDiff(bearingDeg, brg);
      const dist = distanceToBBoxMeters(coord, c.f.bbox ?? computeBBox(c.f));
      return { name: c.f.properties.name, ang, dist };
    })
    .filter((x) => x.ang <= 60)
    .sort((a, b) => a.dist - b.dist);
  if (candidates.length > 0) return { name: candidates[0].name, distM: candidates[0].dist };
  return { name: null, distM: null };
}

function bboxCenter(b: [number, number, number, number]): [number, number] {
  return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
}

function bearingDegBetween(a: {lng:number;lat:number}, b: {lng:number;lat:number}): number {
  const y = Math.sin((b.lng - a.lng) * Math.PI/180) * Math.cos(b.lat * Math.PI/180);
  const x = Math.cos(a.lat * Math.PI/180) * Math.sin(b.lat * Math.PI/180) -
            Math.sin(a.lat * Math.PI/180) * Math.cos(b.lat * Math.PI/180) * Math.cos((b.lng - a.lng) * Math.PI/180);
  const brng = Math.atan2(y, x) * 180/Math.PI;
  return (brng + 360) % 360;
}

function angleDiff(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function distanceToBBoxMeters(p: {lng:number;lat:number}, b: [number, number, number, number]): number {
  // Approximate planar distance to rectangle (clamp to edges)
  const cosLat = Math.cos((p.lat * Math.PI) / 180);
  const toMetersX = (lng: number) => (lng - p.lng) * 111320 * cosLat;
  const toMetersY = (lat: number) => (lat - p.lat) * 110540;
  const px = 0, py = 0;
  const rx1 = toMetersX(b[0]);
  const ry1 = toMetersY(b[1]);
  const rx2 = toMetersX(b[2]);
  const ry2 = toMetersY(b[3]);
  const cx = clamp(px, Math.min(rx1, rx2), Math.max(rx1, rx2));
  const cy = clamp(py, Math.min(ry1, ry2), Math.max(ry1, ry2));
  return Math.hypot(px - cx, py - cy);
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }


