import * as THREE from 'three';

export type VitalsSnapshot = {
  health: number;
  hydration: number;
  hunger: number;
  stamina: number;
  temperature: number;
};

const STORAGE_KEY = 'island-vitals-v2';
const defaults: VitalsSnapshot = {
  health: 100, hydration: 100, hunger: 100, stamina: 100, temperature: 36.8,
};

export class SurvivalVitals {
  readonly state: VitalsSnapshot;
  private saveTimer = 0;
  private lastDamage = 0;

  constructor() {
    let stored: Partial<VitalsSnapshot> = {};
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (parsed && typeof parsed === 'object') stored = parsed as Partial<VitalsSnapshot>;
    } catch { /* Corrupt save: begin with default stats. */ }
    this.state = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof VitalsSnapshot)[]) {
      const value = stored[key];
      if (typeof value === 'number' && Number.isFinite(value)) this.state[key] = value;
    }
  }

  update(dt: number, options: {
    moving: boolean;
    sprinting: boolean;
    swimming: boolean;
    storm: number;
    daylight: number;
  }) {
    const s = this.state;
    const exertion = options.sprinting ? 2.4 : options.moving ? 1.4 : 1;
    s.hunger = Math.max(0, s.hunger - dt * .018 * exertion);
    s.hydration = Math.max(0, s.hydration - dt * .038 * exertion);
    const drain = options.sprinting ? 16 : options.swimming ? 10 : 0;
    const regen = options.sprinting ? 0 : s.hydration < 5 ? 3 : 13;
    s.stamina = THREE.MathUtils.clamp(s.stamina + (regen - drain) * dt, 0, 100);
    const ambient = 35.8 + options.daylight * 1.4 - options.storm * 1.7
      - (options.swimming ? 3.8 : 0);
    s.temperature = THREE.MathUtils.damp(s.temperature, ambient, .035, dt);
    this.lastDamage += dt;
    if (this.lastDamage >= 1) {
      const ticks = Math.floor(this.lastDamage);
      this.lastDamage -= ticks;
      if (s.hunger <= 0 || s.hydration <= 0 || s.temperature < 35)
        s.health = Math.max(0, s.health - ticks * .75);
      else if (s.hunger > 60 && s.hydration > 60 && s.health < 100)
        s.health = Math.min(100, s.health + ticks * .12);
    }
    this.saveTimer += dt;
    if (this.saveTimer > 10) {
      this.saveTimer = 0;
      this.save();
    }
    return s;
  }

  canSprint() {
    return this.state.stamina > 4 && this.state.health > 0;
  }

  drink(amount: number) {
    this.state.hydration = Math.min(100, this.state.hydration + amount);
    this.save();
  }

  eat(amount: number) {
    this.state.hunger = Math.min(100, this.state.hunger + amount);
    this.save();
  }

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
}
