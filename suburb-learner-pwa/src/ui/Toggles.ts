import { requestHeadingPermission } from '../heading';

export function createToggles(container: HTMLElement) {
  container.className = 'toggles';
  container.innerHTML = `
    <button title="Keep screen on" id="btn-wake">Wake</button>
    <button title="Enable compass" id="btn-compass">Calibrate</button>
  `;
  const btnWake = container.querySelector<HTMLButtonElement>('#btn-wake')!;
  const btnCompass = container.querySelector<HTMLButtonElement>('#btn-compass')!;

  // Wake Lock
  let wake: any = null;
  async function toggleWake() {
    try {
      if (!('wakeLock' in navigator)) throw new Error('unsupported');
      if (wake) {
        wake.release();
        wake = null;
      } else {
        wake = await (navigator as any).wakeLock.request('screen');
        if (wake) wake.addEventListener('release', () => updateLabel());
      }
    } catch {
      alert('Screen Wake Lock not supported on this device.');
    } finally {
      updateLabel();
    }
  }
  function updateLabel() { btnWake.ariaPressed = wake ? 'true' : 'false'; }
  btnWake.addEventListener('click', toggleWake);
  updateLabel();

  // Compass permission/calibration button
  async function enableCompass() {
    const ok = await requestHeadingPermission();
    if (!ok) alert('Compass permission was not granted. Please enable Motion & Orientation Access in Settings > Safari.');
  }
  btnCompass.addEventListener('click', enableCompass);
}


