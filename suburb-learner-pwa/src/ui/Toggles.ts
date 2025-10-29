export function createToggles(container: HTMLElement) {
  container.className = 'toggles';
  container.innerHTML = `
    <button id="btn-wake">Wake Lock: Off</button>
    <button id="btn-install">Install</button>
  `;
  const btnWake = container.querySelector<HTMLButtonElement>('#btn-wake')!;
  const btnInstall = container.querySelector<HTMLButtonElement>('#btn-install')!;

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
  function updateLabel() {
    btnWake.textContent = `Wake Lock: ${wake ? 'On' : 'Off'}`;
  }
  btnWake.addEventListener('click', toggleWake);
  updateLabel();

  // Install
  let deferred: any = null;
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    deferred = e;
  });
  btnInstall.addEventListener('click', async () => {
    if (!deferred) return alert('Already installed or not installable.');
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
  });
}


