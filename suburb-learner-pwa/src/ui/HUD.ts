import { formatHeading } from '../heading';
import type { PositionUpdate } from '../types';

export function createHUD(container: HTMLElement) {
  container.innerHTML = `
    <div class="banner">
      <div class="suburb" id="hud-suburb">—</div>
      <div class="road" id="hud-road"></div>
    </div>
    <div class="compass" id="hud-compass"><div class="dial"><div class="north">N</div><div class="deg">—</div></div></div>
    <div class="pill" id="hud-approach">—</div>
  `;

  const elSuburb = container.querySelector<HTMLDivElement>('#hud-suburb')!;
  const elRoad = container.querySelector<HTMLDivElement>('#hud-road')!;
  const elCompass = container.querySelector<HTMLDivElement>('#hud-compass')!;
  const elDeg = elCompass.querySelector<HTMLDivElement>('.deg')!;
  const elPill = container.querySelector<HTMLDivElement>('#hud-approach')!;

  function updateHeading(h: number) {
    elDeg.textContent = formatHeading(h);
    const dial = elCompass.querySelector<HTMLDivElement>('.dial')!;
    dial.style.transform = `rotate(${Math.round(h)}deg)`;
  }

  function updatePosition(_pos: PositionUpdate) {
    // Updates are primarily shown from map/worker responses; stub for now
  }

  function setSuburb(name: string) {
    elSuburb.textContent = name || '—';
  }

  function setRoad(name: string | null) {
    if (name && name.trim()) {
      elRoad.textContent = name;
      elRoad.style.display = 'block';
    } else {
      elRoad.textContent = '';
      elRoad.style.display = 'none';
    }
  }

  function setApproach(nextName: string | null, distM: number | null) {
    if (!nextName || distM == null) {
      elPill.textContent = '—';
      return;
    }
    elPill.textContent = `Approaching ${nextName} in ${Math.round(distM)} m`;
  }

  return { updateHeading, updatePosition, setSuburb, setRoad, setApproach };
}


