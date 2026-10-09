import * as THREE from 'three';
import { terrainHeight, terrainNormal } from '../world/Terrain';

type Footprint = {
  mesh: THREE.Mesh;
  age: number;
  duration: number;
};

const dustMaterial = new THREE.MeshBasicMaterial({
  color: 0xb9a78b, transparent: true, opacity: .35,
  depthWrite: false, side: THREE.DoubleSide,
});
const footprintMaterial = new THREE.MeshBasicMaterial({
  color: 0x302b22, transparent: true, opacity: .17,
  depthWrite: false, side: THREE.DoubleSide, polygonOffset: true,
  polygonOffsetFactor: -1,
});
const printGeometry = new THREE.PlaneGeometry(.2, .39);
const dustGeometry = new THREE.PlaneGeometry(.16, .16);

export class Footsteps {
  private prints: Footprint[] = [];
  private dust: { mesh: THREE.Mesh; velocity: THREE.Vector3; age: number }[] = [];
  private distance = 0;
  private side = 1;
  private lastPosition = new THREE.Vector3();
  private initialized = false;

  constructor(private readonly scene: THREE.Scene) {}

  update(dt: number, position: THREE.Vector3, yaw: number, moving: boolean,
    running: boolean, grounded: boolean) {
    if (!this.initialized) {
      this.lastPosition.copy(position);
      this.initialized = true;
    }
    const traveled = Math.hypot(position.x - this.lastPosition.x,
      position.z - this.lastPosition.z);
    this.lastPosition.copy(position);
    if (moving && grounded) {
      this.distance += traveled;
      const interval = running ? .85 : 1.15;
      if (this.distance >= interval) {
        this.distance = 0;
        this.side *= -1;
        this.spawn(position, yaw, running);
      }
    } else this.distance = Math.min(this.distance, .25);
    for (let i = this.prints.length - 1; i >= 0; i--) {
      const print = this.prints[i];
      print.age += dt;
      (print.mesh.material as THREE.MeshBasicMaterial).opacity =
        .15 * Math.max(0, 1 - print.age / print.duration);
      if (print.age >= print.duration) {
        this.scene.remove(print.mesh);
        print.mesh.material.dispose();
        this.prints.splice(i, 1);
      }
    }
    for (let i = this.dust.length - 1; i >= 0; i--) {
      const particle = this.dust[i];
      particle.age += dt;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.velocity.multiplyScalar(Math.exp(-dt * 2));
      particle.mesh.scale.setScalar(1 + particle.age * 2.3);
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity =
        .2 * Math.max(0, 1 - particle.age / .65);
      if (particle.age >= .65) {
        this.scene.remove(particle.mesh);
        particle.mesh.material.dispose();
        this.dust.splice(i, 1);
      }
    }
  }

  private spawn(position: THREE.Vector3, yaw: number, running: boolean) {
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const x = position.x + rightX * this.side * .16;
    const z = position.z + rightZ * this.side * .16;
    const ground = terrainHeight(x, z);
    const normal = terrainNormal(x, z);
    if (normal.y < .72 || ground < -.1) return;
    const print = new THREE.Mesh(printGeometry, footprintMaterial.clone());
    print.rotation.x = -Math.PI / 2;
    print.rotation.z = yaw;
    print.position.set(x, ground + .022, z);
    print.renderOrder = 2;
    this.scene.add(print);
    this.prints.push({ mesh: print, age: 0, duration: 9 });
    if (this.prints.length > 65) {
      const oldest = this.prints.shift()!;
      this.scene.remove(oldest.mesh);
      oldest.mesh.material.dispose();
    }
    if (running) {
      for (let i = 0; i < 2; i++) {
        const particle = new THREE.Mesh(dustGeometry, dustMaterial.clone());
        particle.position.set(x, ground + .08, z);
        particle.rotation.x = -Math.PI / 2;
        this.scene.add(particle);
        this.dust.push({
          mesh: particle, age: 0,
          velocity: new THREE.Vector3((Math.random() - .5) * .5,
            .3 + Math.random() * .35, (Math.random() - .5) * .5),
        });
      }
    }
  }
}
