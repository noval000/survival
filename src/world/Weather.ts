import * as THREE from 'three';

type RainDrop = { x: number; y: number; z: number; speed: number };
export class Weather {
  private readonly geometry: THREE.BufferGeometry;
  private readonly rain: THREE.Points;
  private readonly positions: Float32Array;
  private readonly drops: RainDrop[] = [];
  private elapsed = 0;
  private storm = 0;
  private lightning = 0;
  private readonly wind = new THREE.Vector3(.35, 0, .15);
  private readonly flash = new THREE.PointLight(0xdceaff, 0, 200);

  constructor(private readonly scene: THREE.Scene, count = 1600) {
    this.positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const drop = {
        x: (Math.random() - .5) * 75,
        y: Math.random() * 35,
        z: (Math.random() - .5) * 75,
        speed: 19 + Math.random() * 20,
      };
      this.drops.push(drop);
      this.positions.set([drop.x, drop.y, drop.z], i * 3);
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position',
      new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.rain = new THREE.Points(this.geometry, new THREE.PointsMaterial({
      color: 0xb7d4e8, size: .075, transparent: true,
      opacity: .6, depthWrite: false, sizeAttenuation: true,
    }));
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);
    scene.add(this.flash);
  }

  update(dt: number, player: THREE.Vector3) {
    this.elapsed += dt;
    // Gentle changes between clear skies and rainy periods.
    const cycle = (Math.sin(this.elapsed / 140 - 1.3) + Math.sin(this.elapsed / 87)) * .5;
    this.storm = THREE.MathUtils.smoothstep(cycle, .12, .65);
    this.rain.visible = this.storm > .08;
    this.rain.position.copy(player);
    this.flash.position.copy(player).add(new THREE.Vector3(15, 55, -20));
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      drop.y -= drop.speed * dt;
      drop.x += this.wind.x * dt * 8;
      drop.z += this.wind.z * dt * 8;
      if (drop.y < 0) {
        drop.y += 35;
        drop.x = (Math.random() - .5) * 75;
        drop.z = (Math.random() - .5) * 75;
      }
      if (drop.x > 38) drop.x = -38;
      if (drop.z > 38) drop.z = -38;
      this.positions.set([drop.x, drop.y, drop.z], i * 3);
    }
    if (this.rain.visible)
      this.geometry.attributes.position.needsUpdate = true;
    if (this.storm > .7 && Math.random() < dt * .012) this.lightning = .18;
    this.lightning = Math.max(0, this.lightning - dt);
    this.flash.intensity = this.lightning > 0 ? 9 * this.storm : 0;
    return this.storm;
  }
}
