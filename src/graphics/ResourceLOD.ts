import * as THREE from 'three';
import type { Harvestable } from '../world/Resources';

const trunk = new THREE.CylinderGeometry(.16, .31, 4.6, 6);
const crown = new THREE.ConeGeometry(1.9, 5.2, 7);
const stone = new THREE.IcosahedronGeometry(1, 0);
const bark = new THREE.MeshStandardMaterial({ color: 0x65513d, roughness: 1 });
const leaves = new THREE.MeshStandardMaterial({ color: 0x3b6243, roughness: 1 });
const granite = new THREE.MeshStandardMaterial({ color: 0x868b83, roughness: 1 });

/**
 * Distant harvestables are 1-2 cheap meshes; detailed geometry only exists
 * on screen near the player. All proxy geometries/materials are shared.
 */
export class ResourceLOD {
  private readonly entries: {
    node: Harvestable;
    proxy: THREE.Group;
    detailed: THREE.Object3D[];
    isNear: boolean;
  }[] = [];
  private elapsed = 0;

  register(node: Harvestable) {
    const proxy = new THREE.Group();
    if (node.kind === 'tree') {
      const stem = new THREE.Mesh(trunk, bark);
      stem.position.y = 2.3;
      const needles = new THREE.Mesh(crown, leaves);
      needles.position.y = 5.4;
      proxy.add(stem, needles);
    } else {
      const boulder = new THREE.Mesh(stone, granite);
      boulder.position.y = .65;
      boulder.scale.set(1.3, .9, 1.1);
      proxy.add(boulder);
    }
    proxy.visible = false;
    node.mesh.add(proxy);
    this.entries.push({
      node, proxy, detailed: node.mesh.children.filter(child => child !== proxy),
      isNear: true,
    });
  }

  unregister(node: Harvestable) {
    const index = this.entries.findIndex(entry => entry.node === node);
    if (index !== -1) this.entries.splice(index, 1);
  }

  update(dt: number, camera: THREE.Vector3) {
    this.elapsed += dt;
    if (this.elapsed < .35) return;
    this.elapsed = 0;
    for (const entry of this.entries) {
      const distance = entry.node.mesh.position.distanceToSquared(camera);
      const threshold = entry.node.kind === 'tree' ? 22 : 27;
      const near = distance < threshold * threshold;
      if (near === entry.isNear) continue;
      entry.isNear = near;
      entry.proxy.visible = !near;
      for (const child of entry.detailed) child.visible = near;
    }
  }
}
