export type TouchState = { x: number; y: number; sprint: boolean };

export function createTouchControls(actions: {
  look(dx: number, dy: number): void;
  attack(): void;
  inventory(): void;
  build(): void;
  place(): void;
  axe(): void;
  pickaxe(): void;
}) {
  const state: TouchState = { x: 0, y: 0, sprint: false };
  const root = document.createElement('div');
  root.className = 'touch-ui';
  root.innerHTML = `
    <div class="touch-stick" aria-label="Джойстик движения"><div class="touch-knob"></div></div>
    <div class="touch-buttons">
      <button data-action="attack" aria-label="Удар">⚒</button>
      <button data-action="place" aria-label="Установить">✓</button>
      <button data-action="build" aria-label="Строительство">⌂</button>
      <button data-action="inventory" aria-label="Рюкзак">▦</button>
      <button data-action="axe" aria-label="Топор">🪓</button>
      <button data-action="pickaxe" aria-label="Кирка">⛏</button>
      <button data-action="sprint" aria-label="Бег">БЕГ</button>
    </div>`;
  document.querySelector('#hud')?.append(root);
  const stick = root.querySelector<HTMLElement>('.touch-stick')!;
  const knob = root.querySelector<HTMLElement>('.touch-knob')!;
  let stickId: number | null = null;
  function moveStick(e: PointerEvent) {
    const bounds = stick.getBoundingClientRect();
    const dx = e.clientX - (bounds.left + bounds.width / 2);
    const dy = e.clientY - (bounds.top + bounds.height / 2);
    const radius = bounds.width * 0.35;
    const factor = Math.min(1, radius / Math.max(1, Math.hypot(dx, dy)));
    state.x = dx * factor / radius;
    state.y = -dy * factor / radius;
    knob.style.transform = `translate(${dx * factor}px,${dy * factor}px)`;
  }
  stick.addEventListener('pointerdown', e => {
    e.preventDefault(); stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId); moveStick(e);
  });
  stick.addEventListener('pointermove', e => {
    if (e.pointerId === stickId) moveStick(e);
  });
  function reset(e: PointerEvent) {
    if (e.pointerId !== stickId) return;
    stickId = null; state.x = 0; state.y = 0;
    knob.style.transform = 'translate(0,0)';
  }
  stick.addEventListener('pointerup', reset);
  stick.addEventListener('pointercancel', reset);
  root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => {
    button.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      const action = button.dataset.action;
      if (action === 'sprint') {
        state.sprint = !state.sprint;
        button.classList.toggle('selected', state.sprint);
      } else if (action && action in actions) {
        actions[action as keyof typeof actions]();
      }
    });
  });
  const canvas = document.querySelector<HTMLCanvasElement>('#app canvas');
  let lookId: number | null = null;
  let lastX = 0, lastY = 0;
  canvas?.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    lookId = e.pointerId;
    lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas?.addEventListener('pointermove', e => {
    if (e.pointerId !== lookId) return;
    actions.look(e.clientX - lastX, e.clientY - lastY);
    lastX = e.clientX; lastY = e.clientY;
  });
  const endLook = (e: PointerEvent) => {
    if (e.pointerId === lookId) lookId = null;
  };
  canvas?.addEventListener('pointerup', endLook);
  canvas?.addEventListener('pointercancel', endLook);
  return state;
}
