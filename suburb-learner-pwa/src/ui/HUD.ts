import { formatHeading } from '../heading';
import type { PositionUpdate } from '../types';

export function createHUD(container: HTMLElement) {
  container.innerHTML = `
    <div class="dir dir-top" id="dir-top"></div>
    <div class="banner">
      <div class="suburb" id="hud-suburb">—</div>
      <div class="road" id="hud-road"></div>
    </div>
    <div class="dir dir-left" id="dir-left"></div>
    <div class="dir dir-right" id="dir-right"></div>
    <div class="dir dir-bottom" id="dir-bottom"></div>
    <div class="compass" id="hud-compass"><div class="dial"><div class="north">N</div><div class="deg">—</div></div></div>
    <div class="pill" id="hud-approach">—</div>
  `;

  const elSuburb = container.querySelector<HTMLDivElement>('#hud-suburb')!;
  const elRoad = container.querySelector<HTMLDivElement>('#hud-road')!;
  const elCompass = container.querySelector<HTMLDivElement>('#hud-compass')!;
  const elDeg = elCompass.querySelector<HTMLDivElement>('.deg')!;
  const elPill = container.querySelector<HTMLDivElement>('#hud-approach')!;
  const elTop = container.querySelector<HTMLDivElement>('#dir-top')!;
  const elBottom = container.querySelector<HTMLDivElement>('#dir-bottom')!;
  const elLeft = container.querySelector<HTMLDivElement>('#dir-left')!;
  const elRight = container.querySelector<HTMLDivElement>('#dir-right')!;

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

  function setNextDirs(next: {top:{name:string|null;distM:number|null};bottom:{name:string|null;distM:number|null};left:{name:string|null;distM:number|null};right:{name:string|null;distM:number|null}}) {
    const fmt = (n: string | null, d: number | null) => n && d != null ? `${n} · ${(d/1000).toFixed(1)} km` : '';
    elTop.textContent = fmt(next.top.name, next.top.distM);
    elBottom.textContent = fmt(next.bottom.name, next.bottom.distM);
    elLeft.textContent = fmt(next.left.name, next.left.distM);
    elRight.textContent = fmt(next.right.name, next.right.distM);
  }

  return { updateHeading, updatePosition, setSuburb, setRoad, setApproach, setNextDirs };
}


