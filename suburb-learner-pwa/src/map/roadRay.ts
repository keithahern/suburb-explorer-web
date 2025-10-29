export type Point = { x: number; y: number };

// Compute intersection of a ray from (x0,y0) at heading degrees (0=N, 90=E)
// with the viewport rectangle [0,w]x[0,h]. Returns the closest point on the edge.
export function computeRayToViewportEdge(
  x0: number,
  y0: number,
  headingDeg: number,
  w: number,
  h: number
): Point | null {
  // Convert compass heading (0°=north, clockwise) to screen vector (x right, y down)
  const rad = (headingDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const tValues: number[] = [];

  // Avoid division by zero by using large numbers
  const EPS = 1e-9;
  const tx1 = (0 - x0) / (dx === 0 ? EPS : dx);
  const tx2 = (w - x0) / (dx === 0 ? EPS : dx);
  const ty1 = (0 - y0) / (dy === 0 ? EPS : dy);
  const ty2 = (h - y0) / (dy === 0 ? EPS : dy);

  // Candidate intersections where ray crosses vertical lines x=0 or x=w
  for (const t of [tx1, tx2]) {
    const y = y0 + t * dy;
    if (t > 0 && y >= 0 - 1 && y <= h + 1) tValues.push(t);
  }
  // and horizontal lines y=0 or y=h
  for (const t of [ty1, ty2]) {
    const x = x0 + t * dx;
    if (t > 0 && x >= 0 - 1 && x <= w + 1) tValues.push(t);
  }

  if (tValues.length === 0) return null;
  const tmin = Math.min(...tValues);
  return { x: x0 + tmin * dx, y: y0 + tmin * dy };
}

// Dev-only quick checks (non-fatal)
if (import.meta && (import.meta as any).env && (import.meta as any).env.DEV) {
  try {
    const p = computeRayToViewportEdge(50, 50, 0, 100, 100);
    if (!p || Math.round(p.y) !== 0) console.warn('Ray north should hit top edge', p);
  } catch {}
}


