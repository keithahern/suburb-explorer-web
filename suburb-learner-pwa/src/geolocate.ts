import type { PositionUpdate } from './types';

type GeoCb = (pos: PositionUpdate) => void;

export function startGeolocationLoop(
  opts: { demo?: boolean },
  onUpdate: GeoCb
) {
  if (opts.demo) return demoLoop(onUpdate);

  if (!('geolocation' in navigator)) return;
  let lastEmit = 0;
  navigator.geolocation.watchPosition(
    (pos) => {
      const now = Date.now();
      if (now - lastEmit < 500) return; // ≤2 Hz
      lastEmit = now;
      onUpdate({
        coord: { lng: pos.coords.longitude, lat: pos.coords.latitude },
        accuracy: pos.coords.accuracy,
        heading: pos.coords.heading ?? null,
        speedMps: pos.coords.speed ?? null,
      });
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  );
}

function demoLoop(onUpdate: GeoCb) {
  // Waypoints trace along demo roads to maximize road-name hits
  const pts = [
    // Strand Road segment
    { lng: -6.2145, lat: 53.3245 },
    { lng: -6.2145, lat: 53.3315 },
    // connector to Irishtown Road start
    { lng: -6.2205, lat: 53.3340 },
    { lng: -6.2260, lat: 53.3360 },
    // Irishtown Road segment
    { lng: -6.2295, lat: 53.3405 },
    // connector to Ringsend segment
    { lng: -6.2320, lat: 53.3410 },
    { lng: -6.2340, lat: 53.3415 },
    // Ringsend segment
    { lng: -6.2365, lat: 53.3455 },
  ];
  let seg = 0;
  let t = 0; // 0→1 along current segment
  const stepM = 20; // finer step to stay near lines
  const tickMs = 800; // slightly faster cadence

  const dist = (a: {lng:number;lat:number}, b: {lng:number;lat:number}) => {
    const dx = (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI)/180);
    const dy = (b.lat - a.lat) * 110540;
    return Math.hypot(dx, dy);
  };
  const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
  const bearingDeg = (a: {lng:number;lat:number}, b: {lng:number;lat:number}) => {
    const y = Math.sin((b.lng - a.lng) * Math.PI/180) * Math.cos(b.lat * Math.PI/180);
    const x = Math.cos(a.lat * Math.PI/180) * Math.sin(b.lat * Math.PI/180) -
              Math.sin(a.lat * Math.PI/180) * Math.cos(b.lat * Math.PI/180) * Math.cos((b.lng - a.lng) * Math.PI/180);
    const brng = Math.atan2(y, x) * 180/Math.PI;
    return (brng + 360) % 360;
  };

  setInterval(() => {
    const a = pts[seg];
    const b = pts[(seg + 1) % pts.length];
    const d = dist(a, b);
    const du = stepM / Math.max(1, d);
    t += du;
    if (t >= 1) {
      seg = (seg + 1) % pts.length;
      t = 0;
    }
    const lng = lerp(a.lng, b.lng, t);
    const lat = lerp(a.lat, b.lat, t);
    const heading = bearingDeg(a, b);
    onUpdate({ coord: { lng, lat }, accuracy: 5, heading });
  }, tickMs);
}


