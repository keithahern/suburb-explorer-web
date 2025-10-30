import { requestHeadingPermission } from '../heading';
import { getHeadingTrimDeg, setHeadingTrimDeg } from '../settings';

export function createToggles(container: HTMLElement) {
  container.className = 'toggles';
  container.innerHTML = `
    <button id="btn-gear" class="gear" title="Settings">⚙</button>
    <div class="toggles-panel">
      <button title="Keep screen on" id="btn-wake">Wake</button>
      <button title="Enable compass" id="btn-compass">Calibrate</button>
      <div class="trim">
        <label for="trim">Trim</label>
        <input id="trim" type="range" min="-90" max="90" step="1" />
        <span id="trim-val"></span>
      </div>
    </div>
  `;
  const btnGear = container.querySelector<HTMLButtonElement>('#btn-gear')!;
  const btnWake = container.querySelector<HTMLButtonElement>('#btn-wake')!;
  const btnCompass = container.querySelector<HTMLButtonElement>('#btn-compass')!;
  const trim = container.querySelector<HTMLInputElement>('#trim')!;
  const trimVal = container.querySelector<HTMLSpanElement>('#trim-val')!;

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

  // Heading trim control
  function renderTrim() {
    const v = getHeadingTrimDeg();
    trim.value = String(v);
    trimVal.textContent = `${v}°`;
  }
  trim.addEventListener('input', () => {
    const v = parseFloat(trim.value);
    setHeadingTrimDeg(v);
    renderTrim();
  });
  renderTrim();

  // Gear toggle
  function togglePanel() {
    container.classList.toggle('open');
  }
  btnGear.addEventListener('click', togglePanel);
}


