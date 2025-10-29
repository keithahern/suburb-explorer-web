type HeadingCallback = (deg: number) => void;

let lastHeading = 0;
let hasDO = false;

function smoothHeading(prev: number, next: number, factor = 0.15): number {
  // Handle wrap-around near 0/360
  let delta = next - prev;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  const smoothed = prev + delta * factor;
  return (smoothed + 360) % 360;
}

export function startHeading(onHeading: HeadingCallback) {
  const emit = (h: number) => {
    lastHeading = smoothHeading(lastHeading, h);
    onHeading(lastHeading);
  };

  function requestPermissionIOS() {
    const anyDO = DeviceOrientationEvent as any;
    if (anyDO && typeof anyDO.requestPermission === 'function') {
      anyDO.requestPermission().catch(() => {}).then((res: string) => {
        if (res === 'granted') attachDO();
      });
    }
  }

  function attachDO() {
    if (hasDO) return;
    hasDO = true;
    window.addEventListener('deviceorientation', (ev) => {
      const anyEv = ev as any;
      const a = anyEv.webkitCompassHeading ?? (360 - (ev.alpha ?? 0));
      if (a != null && !Number.isNaN(a)) emit(a);
    });
  }

  // Attach on user gesture for iOS, immediately for others
  document.addEventListener('click', requestPermissionIOS, { once: true });
  attachDO();

  // Fallback: geolocation heading
  if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition(
      (pos) => {
        const h = pos.coords.heading;
        if (h != null) emit(h);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }
}

export function formatHeading(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(deg / 45) % 8;
  const dir = dirs[idx];
  return `${dir} ${Math.round(deg)}°`;
}

export { smoothHeading };


