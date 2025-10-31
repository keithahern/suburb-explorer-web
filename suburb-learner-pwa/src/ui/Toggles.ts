import { requestHeadingPermission } from '../heading';
import { getHeadingTrimDeg, setHeadingTrimDeg, getGeocoderApiKey, setGeocoderApiKey } from '../settings';

export function createToggles(container: HTMLElement) {
  container.className = 'toggles';
  container.innerHTML = `
    <button id="btn-gear" class="gear" title="Settings">⚙</button>
    <div class="toggles-panel">
      <div class="panel-header">
        <div class="title">Settings</div>
        <button id="btn-close" class="close" title="Close">✕</button>
      </div>
      <button title="Enable compass" id="btn-compass">Calibrate</button>
      <div class="trim">
        <label for="trim">Trim</label>
        <input id="trim" type="range" min="-90" max="90" step="1" />
        <span id="trim-val"></span>
      </div>
      <div class="geo-key">
        <label for="geokey">Geocoder key</label>
        <input id="geokey" type="password" placeholder="Enter API key" />
        <button id="geokey-save" title="Save key">Save</button>
        <button id="geokey-clear" title="Clear key">Clear</button>
        <span id="geokey-status"></span>
      </div>
    </div>
  `;
  const btnGear = container.querySelector<HTMLButtonElement>('#btn-gear')!;
  const btnCompass = container.querySelector<HTMLButtonElement>('#btn-compass')!;
  const btnClose = container.querySelector<HTMLButtonElement>('#btn-close')!;
  const trim = container.querySelector<HTMLInputElement>('#trim')!;
  const trimVal = container.querySelector<HTMLSpanElement>('#trim-val')!;
  const keyInput = container.querySelector<HTMLInputElement>('#geokey')!;
  const keySave = container.querySelector<HTMLButtonElement>('#geokey-save')!;
  const keyClear = container.querySelector<HTMLButtonElement>('#geokey-clear')!;
  const keyStatus = container.querySelector<HTMLSpanElement>('#geokey-status')!;

  // Wake Lock (enabled by default, no UI button)
  let wake: any = null;
  const wakeDesired = true;

  async function requestWake() {
    try {
      if (!('wakeLock' in navigator)) throw new Error('unsupported');
      if (wake) return;
      wake = await (navigator as any).wakeLock.request('screen');
      if (wake) {
        wake.addEventListener('release', () => {
          if (wakeDesired && document.visibilityState === 'visible') {
            requestWake().catch(() => {});
          }
        });
      }
    } catch (err) {
      console.warn('Wake Lock request failed:', err);
    }
  }

  // Try on init
  requestWake().catch(() => {});

  // Retry when returning to foreground
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wakeDesired && !wake) {
      requestWake().catch(() => {});
    }
  });

  // As a fallback for iOS requiring a user gesture, attempt on first tap
  const onFirstPointer = () => {
    if (wakeDesired && !wake) requestWake().catch(() => {});
    window.removeEventListener('pointerdown', onFirstPointer);
  };
  window.addEventListener('pointerdown', onFirstPointer, { once: true });

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

  // Geocoder API key controls
  function renderKey() {
    const k = getGeocoderApiKey();
    keyInput.value = k ?? '';
    keyInput.placeholder = 'Enter API key';
    keyStatus.textContent = k ? 'Saved locally' : '';
  }
  keySave.addEventListener('click', () => {
    const v = keyInput.value.trim();
    setGeocoderApiKey(v || null);
    keyStatus.textContent = v ? 'Saved locally' : 'Cleared';
  });
  keyClear.addEventListener('click', () => {
    setGeocoderApiKey(null);
    keyInput.value = '';
    keyStatus.textContent = 'Cleared';
  });
  renderKey();

  // Gear toggle
  function togglePanel() {
    container.classList.toggle('open');
  }
  btnGear.addEventListener('click', togglePanel);
  btnClose.addEventListener('click', togglePanel);

  // Close on Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && container.classList.contains('open')) togglePanel();
  });
}


