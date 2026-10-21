import * as THREE from 'three';

/** First-person camera attached directly to the survivor eye position.
 * No terrain clamping: underground rooms must remain visible.
 */
export class ThirdPersonCamera {
  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  update(_dt: number, player: THREE.Vector3, yaw: number, pitch: number,
    _moving: boolean, _running: boolean) {
    this.camera.position.set(player.x, player.y + 1.65, player.z);
    // Player forward is (-sin(yaw), 0, -cos(yaw)).
    const horizontal = Math.cos(pitch);
    const direction = new THREE.Vector3(
      -Math.sin(yaw) * horizontal,
      -Math.sin(pitch),
      -Math.cos(yaw) * horizontal,
    );
    this.camera.lookAt(this.camera.position.clone().add(direction));
  }
}
