import { getGeocoderApiKey, getGeocoderProvider } from '../settings';
import { gridId } from './geohash';

export type LngLat = { lng: number; lat: number };

export type SuburbProvider = {
  resolve(lat: number, lng: number, signal?: AbortSignal): Promise<string | null>;
};

function createLocationIqProvider(apiKey: string): SuburbProvider {
  return {
    async resolve(lat: number, lng: number, signal?: AbortSignal) {
      const url = new URL('https://us1.locationiq.com/v1/reverse');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('format', 'json');
      url.searchParams.set('normalizeaddress', '1');
      const r = await fetch(url.toString(), { signal });
      if (!r.ok) {
        if (r.status === 429) throw new Error('rate_limited');
        return null;
      }
      const j = await r.json();
      const a = j?.address ?? {};
      const candidates: Array<string | undefined> = [
        a.suburb,
        a.neighbourhood,
        a.city_district,
        a.city,
        a.town,
        a.village,
      ];
      const name = candidates.find((x) => typeof x === 'string' && x.trim().length > 0);
      return name ? String(name) : null;
    },
  };
}

export function createSuburbResolver() {
  const apiKey = getGeocoderApiKey();
  const providerName = getGeocoderProvider();
  const provider: SuburbProvider | null = apiKey && providerName === 'locationiq'
    ? createLocationIqProvider(apiKey)
    : null;

  const cache = new Map<string, string | null>();
  const pending = new Map<string, Promise<string | null>>();
  let backoffUntil = 0;
  let nextAllowedAt = 0; // simple global throttle (≈1 req/sec)

  async function resolve(coord: LngLat): Promise<string | null> {
    if (!provider) return null;

    const cell = gridId(coord.lat, coord.lng);
    if (cache.has(cell)) return cache.get(cell) ?? null;

    const now = Date.now();
    if (now < backoffUntil) return null;
    if (pending.has(cell)) return pending.get(cell)!;
    const p = (async () => {
      try {
        const waitMs = Math.max(0, nextAllowedAt - Date.now());
        if (waitMs > 0) await new Promise((res) => setTimeout(res, waitMs));
        nextAllowedAt = Date.now() + 1100;
        const name = await provider.resolve(coord.lat, coord.lng);
        cache.set(cell, name ?? null);
        return name ?? null;
      } catch (e: any) {
        if (String(e && e.message) === 'rate_limited') {
          backoffUntil = Date.now() + 60000; // pause requests for 60s
        }
        return null;
      } finally {
        pending.delete(cell);
      }
    })();
    pending.set(cell, p);
    return p;
  }

  return { resolve };
}


