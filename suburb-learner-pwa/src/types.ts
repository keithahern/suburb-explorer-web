export type LngLat = { lng: number; lat: number };

export type GeoWorkerResult = {
  suburbName: string | null;
  nextName: string | null;
  nextDistanceM: number | null;
};

export type PositionUpdate = {
  coord: LngLat;
  accuracy: number;
  heading?: number | null;
  speedMps?: number | null;
};


