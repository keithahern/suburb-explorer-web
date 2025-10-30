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
    const handler = (ev: DeviceOrientationEvent) => {
      const anyEv = ev as any;
      const a = anyEv.webkitCompassHeading ?? (360 - (ev.alpha ?? 0));
      if (a != null && !Number.isNaN(a)) emit(a);
    };
    window.addEventListener('deviceorientation', handler);
    // Some iOS versions only fire absolute orientation reliably here
    window.addEventListener('deviceorientationabsolute' as any, handler as any);
  }

  // Attach on user gesture for iOS, immediately for others
  document.addEventListener('click', requestPermissionIOS, { once: true });
  document.addEventListener('touchstart', requestPermissionIOS, { once: true, passive: true } as any);
  document.addEventListener('pointerdown', requestPermissionIOS, { once: true });
  document.addEventListener('keydown', requestPermissionIOS, { once: true });
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

// Allow explicit user-invoked permission request from UI
export function requestHeadingPermission() {
  const anyDO = DeviceOrientationEvent as any;
  if (anyDO && typeof anyDO.requestPermission === 'function') {
    return anyDO.requestPermission().then((res: string) => {
      if (res === 'granted') {
        attachForExternal();
        return true;
      }
      return false;
    }).catch(() => false);
  }
  // Non-iOS or no permission flow needed
  attachForExternal();
  return Promise.resolve(true);
}

function attachForExternal() {
  if (!hasDO) {
    // replicate attachDO without toggling hasDO externally
    hasDO = true;
    const handler = (ev: DeviceOrientationEvent) => {
      const anyEv = ev as any;
      const a = anyEv.webkitCompassHeading ?? (360 - (ev.alpha ?? 0));
      if (a != null && !Number.isNaN(a)) {
        lastHeading = smoothHeading(lastHeading, a);
      }
    };
    window.addEventListener('deviceorientation', handler);
    window.addEventListener('deviceorientationabsolute' as any, handler as any);
  }
}

export function formatHeading(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(deg / 45) % 8;
  const dir = dirs[idx];
  return `${dir} ${Math.round(deg)}°`;
}

export { smoothHeading };


