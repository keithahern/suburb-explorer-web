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
    const { coord, heading } = msg;
    const candidates = tree.search({ minX: coord.lng, minY: coord.lat, maxX: coord.lng, maxY: coord.lat });
    let suburbName: string | null = null;
    for (const c of candidates) {
      const feat = features[c.idx];
      if (booleanPointInPolygon([coord.lng, coord.lat], feat as any)) {
        suburbName = feat.properties.name;
        break;
      }
    }
    // Simple hysteresis: require change only if different and we are not undecided
    if (suburbName && suburbName !== lastSuburb) lastSuburb = suburbName;

    // Approaching distance stub: not implementing heavy sampling in this lean demo
    ctx.postMessage({ type: 'loc-result', suburbName: lastSuburb, nextName: null, nextDistanceM: null, heading });
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


