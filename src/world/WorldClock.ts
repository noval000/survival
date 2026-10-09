import * as THREE from 'three';

export class WorldClock {
  private elapsed = 0;
  private readonly dayLength = 900;
  private readonly dayColor = new THREE.Color(0x91c4d3);
  private readonly duskColor = new THREE.Color(0xb58c7b);
  private readonly nightColor = new THREE.Color(0x152b45);
  private readonly daySun = new THREE.Color(0xffe3af);
  private readonly duskSun = new THREE.Color(0xff9d69);
  private readonly fog = new THREE.FogExp2(0x91c4d3, .007);
  private readonly color = new THREE.Color();
  private readonly lightColor = new THREE.Color();
  private readonly ambient: THREE.HemisphereLight;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly sun: THREE.DirectionalLight,
  ) {
    this.ambient = scene.children.find(
      (item): item is THREE.HemisphereLight => item instanceof THREE.HemisphereLight,
    ) ?? new THREE.HemisphereLight(0xcbe2fa, 0x344437, 1);
    if (!this.ambient.parent) scene.add(this.ambient);
    scene.fog = this.fog;
  }

  update(dt: number, weatherDarkness: number) {
    this.elapsed += dt;
    const phase = this.elapsed / this.dayLength * Math.PI * 2 + Math.PI * .28;
    const elevation = Math.sin(phase);
    const daylight = THREE.MathUtils.smoothstep(elevation, -.16, .35);
    const dusk = Math.pow(1 - Math.min(1, Math.abs(elevation) * 2.8), 2);
    const sky = this.color.copy(this.nightColor).lerp(this.dayColor, daylight);
    sky.lerp(this.duskColor, dusk * daylight * .65);
    sky.multiplyScalar(1 - weatherDarkness * .35);
    this.scene.background = sky;
    this.fog.color.copy(sky);
    this.fog.density = .0055 + weatherDarkness * .004;
    this.sun.position.set(Math.cos(phase) * 115, Math.max(8, elevation * 135), 35);
    this.sun.color.copy(this.lightColor.copy(this.daySun).lerp(this.duskSun, dusk * .9));
    this.sun.intensity = (.18 + daylight * 2.6) * (1 - weatherDarkness * .55);
    this.ambient.intensity = .32 + daylight * 1.8;
    return { daylight, time: (this.elapsed / this.dayLength) % 1 };
  }
}
