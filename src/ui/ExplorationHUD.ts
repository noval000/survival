import * as THREE from 'three';

export class ExplorationHUD {
  private readonly element: HTMLDivElement;
  private readonly compass: HTMLDivElement;
  private readonly clock: HTMLDivElement;
  private readonly weather: HTMLDivElement;
  private readonly coords: HTMLDivElement;
  private readonly map: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly points: THREE.Vector2[] = [];
  private frame = 0;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('div');
    this.element.className = 'exploration-hud';
    this.element.innerHTML = `
      <div class="exploration-heading">
        <span class="exploration-compass">N</span>
        <span class="exploration-time">ДЕНЬ 1 · 12:00</span>
        <span class="exploration-weather">ЯСНО</span>
      </div>
      <canvas class="exploration-map" width="180" height="180" aria-label="Карта острова"></canvas>
      <div class="exploration-coords">X 0 · Z 0</div>
    `;
    parent.append(this.element);
    this.compass = this.element.querySelector('.exploration-compass')!;
    this.clock = this.element.querySelector('.exploration-time')!;
    this.weather = this.element.querySelector('.exploration-weather')!;
    this.coords = this.element.querySelector('.exploration-coords')!;
    this.map = this.element.querySelector('.exploration-map')!;
    this.context = this.map.getContext('2d')!;
  }

  update(player: THREE.Vector3, yaw: number, time: number, storm: number) {
    const direction = ((yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const headings = ['N', 'NW', 'W', 'SW', 'S', 'SE', 'E', 'NE'];
    this.compass.textContent = headings[Math.round(direction / (Math.PI / 4)) % 8];
    const minutes = Math.floor(((time + .28) % 1) * 1440);
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minute = String(minutes % 60).padStart(2, '0');
    this.clock.textContent = `ДЕНЬ 1 · ${hour}:${minute}`;
    this.weather.textContent = storm > .65 ? 'ШТОРМ' : storm > .1 ? 'ДОЖДЬ' : 'ЯСНО';
    this.coords.textContent = `X ${Math.round(player.x)} · Z ${Math.round(player.z)}`;
    if (++this.frame % 10 !== 0) return;
    this.drawMap(player, yaw);
  }

  private drawMap(player: THREE.Vector3, yaw: number) {
    const ctx = this.context;
    const size = this.map.width;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#194957';
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    const scale = .78;
    ctx.fillStyle = '#d1b988';
    ctx.beginPath();
    ctx.arc(0, 0, 104 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4b774b';
    ctx.beginPath();
    ctx.arc(0, 0, 94 * scale, 0, Math.PI * 2);
    ctx.fill();
    // Deterministic terrain markings show the interior's varied terrain.
    if (this.points.length === 0) {
      let seed = 77631;
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let i = 0; i < 160; i++) {
        const a = random() * Math.PI * 2;
        const r = Math.sqrt(random()) * 90;
        this.points.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
      }
    }
    ctx.fillStyle = '#345c39';
    for (const point of this.points) {
      ctx.beginPath();
      ctx.arc(point.x * scale, point.y * scale, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.translate(player.x * scale, player.z * scale);
    ctx.rotate(-yaw);
    ctx.fillStyle = '#fff5cc';
    ctx.strokeStyle = '#1c302c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(-5, 6);
    ctx.lineTo(5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  }
}
