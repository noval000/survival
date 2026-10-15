import * as THREE from 'three';

// Mesh-level collision: an open doorway remains open because no triangle
// intersects the player's horizontal movement ray.
export class WorldCollisions {
  private readonly objects = new Set<THREE.Object3D>();
  private readonly ray = new THREE.Raycaster();
  private readonly direction = new THREE.Vector3();
  private readonly origin = new THREE.Vector3();
  private readonly bounds = new THREE.Box3();
  private readonly candidates: THREE.Object3D[] = [];

  register(root: THREE.Object3D) { this.objects.add(root); }
  unregister(root: THREE.Object3D) { this.objects.delete(root); }

  canMove(from: THREE.Vector3, x: number, z: number): boolean {
    const dx = x - from.x, dz = z - from.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.00001) return true;
    this.direction.set(dx / distance, 0, dz / distance);
    // Cast at several body heights and from the player radius.
    for (const height of [0.4, 1.1, 1.9]) {
      for (const side of [-0.35, 0, 0.35]) {
        this.origin.set(from.x - this.direction.z * side, from.y + height, from.z + this.direction.x * side);
        this.ray.set(this.origin, this.direction);
        this.ray.near = 0;
        this.ray.far = distance + 0.45;
        this.candidates.length = 0;
        for (const root of this.objects) {
          if (!root.parent) continue;
          this.bounds.setFromObject(root);
          if (this.bounds.isEmpty() || !this.ray.ray.intersectsBox(this.bounds)) continue;
          // LOD collision always uses its full-detail geometry.
          root.traverse(object => {
            if (object instanceof THREE.LOD) {
              const level = object.levels[0]?.object;
              if (level) level.traverse(mesh => {
                if (mesh instanceof THREE.Mesh) this.candidates.push(mesh);
              });
            }
          });
        }
        if (this.ray.intersectObjects(this.candidates, false).length) return false;
      }
    }
    return true;
  }
}
