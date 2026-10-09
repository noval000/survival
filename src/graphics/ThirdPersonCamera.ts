import * as THREE from 'three';
import { terrainHeight } from '../world/Terrain';

export class ThirdPersonCamera {
  private readonly desired = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly currentTarget = new THREE.Vector3();
  private initialized = false;
  private motion = 0;

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  update(dt: number, player: THREE.Vector3, yaw: number, pitch: number,
    moving: boolean, running: boolean) {
    const distance = running ? 6.5 : 6;
    const offsetY = 3.7 + pitch * 4.5;
    this.desired.set(
      player.x + Math.sin(yaw) * distance,
      player.y + offsetY,
      player.z + Math.cos(yaw) * distance,
    );
    // Keep the camera above the terrain. Multiple samples avoid crossing a hill.
    const eye = new THREE.Vector3(player.x, player.y + 1.7, player.z);
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      const sx = THREE.MathUtils.lerp(eye.x, this.desired.x, t);
      const sz = THREE.MathUtils.lerp(eye.z, this.desired.z, t);
      const sy = THREE.MathUtils.lerp(eye.y, this.desired.y, t);
      if (terrainHeight(sx, sz) + .45 > sy) {
        const safeT = Math.max(0, (i - 1) / 10);
        this.desired.lerpVectors(eye, this.desired, safeT);
        break;
      }
    }
    this.desired.y = Math.max(this.desired.y, terrainHeight(
      this.desired.x, this.desired.z) + .6);
    if (!this.initialized) {
      this.camera.position.copy(this.desired);
      this.currentTarget.copy(eye);
      this.initialized = true;
    }
    const speed = moving ? 10 : 7;
    const alpha = 1 - Math.exp(-speed * dt);
    this.camera.position.lerp(this.desired, alpha);
    this.motion += dt * (running ? 13 : moving ? 8 : 2);
    const bob = moving ? Math.sin(this.motion) * (running ? .028 : .013) : 0;
    this.lookTarget.copy(eye);
    this.lookTarget.y += bob;
    this.currentTarget.lerp(this.lookTarget, 1 - Math.exp(-12 * dt));
    this.camera.lookAt(this.currentTarget);
  }
}
