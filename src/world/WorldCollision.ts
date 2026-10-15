import * as THREE from 'three';

/**
 * Raycasts against visible world model triangles, so open doorways and
 * tunnels remain passable rather than being blocked by bounding boxes.
 */
export class WorldCollision {
  private readonly roots = new Map<THREE.Object3D, THREE.Box3>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly direction = new THREE.Vector3();
  private readonly origin = new THREE.Vector3();

  add(root: THREE.Object3D) { root.updateWorldMatrix(true, true); this.roots.set(root, new THREE.Box3().setFromObject(root)); }
  remove(root: THREE.Object3D) { this.roots.delete(root); }

  canMove(from: THREE.Vector3, x: number, z: number): boolean {
    const dx = x - from.x;
    const dz = z - from.z;
    const length = Math.hypot(dx, dz);
    if (length < 1e-6) return true;
    this.direction.set(dx / length, 0, dz / length);
    // Sample at several heights to catch walls, trunks and low obstacles.
    for (const height of [0.3, 0.95, 1.65]) {
      this.origin.set(from.x, from.y + height, from.z);
      this.raycaster.set(this.origin, this.direction);
      this.raycaster.near = 0;
      this.raycaster.far = length + 0.48;
      for (const [root, bounds] of this.roots) {
        if (!root.parent) { this.roots.delete(root); continue; }
        if (bounds.distanceToPoint(this.origin) > length + 0.5) continue;
        const hits = this.raycaster.intersectObject(root, true);
        if (hits.length) return false;
      }
    }
    return true;
  }
}
