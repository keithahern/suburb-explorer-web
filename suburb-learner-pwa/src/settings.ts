const KEY_HEADING_TRIM = 'headingTrimDeg_v1';

export function clampHeadingTrim(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  return Math.max(-90, Math.min(90, Math.round(deg)));
}

export function getHeadingTrimDeg(): number {
  try {
    const raw = localStorage.getItem(KEY_HEADING_TRIM);
    if (!raw) return 0;
    return clampHeadingTrim(parseFloat(raw));
  } catch {
    return 0;
  }
}

export function setHeadingTrimDeg(deg: number): void {
  const v = clampHeadingTrim(deg);
  try { localStorage.setItem(KEY_HEADING_TRIM, String(v)); } catch {}
  // Notify listeners (map/HUD) to re-render immediately
  try { window.dispatchEvent(new CustomEvent('heading-trim-changed', { detail: { deg: v } })); } catch {}
}


