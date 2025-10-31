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

// Geocoding provider settings (injected by Vite at build time)
export function getGeocoderProvider(): string {
  const v = (import.meta as any).env?.VITE_GEOCODER_PROVIDER;
  return typeof v === 'string' && v ? v : 'locationiq';
}

const KEY_GEOCODER = 'geocoderApiKey_v1';

export function getGeocoderApiKey(): string | null {
  // Prefer user-provided key stored locally
  try {
    const k = localStorage.getItem(KEY_GEOCODER);
    if (k && k.trim()) return k.trim();
  } catch {}
  const v = (import.meta as any).env?.VITE_GEOCODER_KEY;
  return typeof v === 'string' && v ? v : null;
}

export function setGeocoderApiKey(key: string | null): void {
  try {
    if (key && key.trim()) localStorage.setItem(KEY_GEOCODER, key.trim());
    else localStorage.removeItem(KEY_GEOCODER);
  } catch {}
}


