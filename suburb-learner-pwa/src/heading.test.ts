import { smoothHeading } from './heading';

function assertNear(a: number, b: number, eps = 1) {
  if (Math.abs(a - b) > eps) throw new Error(`Expected ${a} ≈ ${b}`);
}

// Minimal ad-hoc test (runs only in dev if explicitly imported)
export function runHeadingTests() {
  // wrap-around smoothing near 359 → 1 should move across 0 properly
  const a = smoothHeading(359, 1, 0.5);
  assertNear(a, 0);
}


