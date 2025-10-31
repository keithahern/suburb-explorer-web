// Lightweight grid id (~100–150 m) without pulling a geohash library.
// Rounds lat/lng to 3 decimals (≈111 m in latitude).
export function gridId(lat: number, lng: number): string {
  const latRounded = Math.round(lat * 1000) / 1000; // ~111 m
  const lngRounded = Math.round(lng * 1000) / 1000; // varies with cos(lat)
  return `${latRounded.toFixed(3)}:${lngRounded.toFixed(3)}`;
}


