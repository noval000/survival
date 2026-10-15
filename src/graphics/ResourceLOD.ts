import * as THREE from 'three';
import type { Harvestable } from '../world/Resources';

const trunk = new THREE.CylinderGeometry(.16, .31, 4.6, 6);
const crown = new THREE.ConeGeometry(1.9, 5.2, 7);
const stone = new THREE.IcosahedronGeometry(1, 0);
const bark = new THREE.MeshStandardMaterial({ color: 0x65513d, roughness: 1 });
const leaves = new THREE.MeshStandardMaterial({ color: 0x3b6243, roughness: 1 });
const granite = new THREE.MeshStandardMaterial({ color: 0x868b83, roughness: 1 });

/** Switch only visible meshes; cached LOD geometries are shared across trees. */
export class ResourceLOD {
  private readonly entries: {
    node: Harvestable;
    proxy: THREE.Group;
    level: number;
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
    proxy.name = 'resource-lod-proxy';
    proxy.visible = false;
    node.mesh.add(proxy);
    this.entries.push({ node, proxy, level: 0 });
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
      const distanceSq = entry.node.mesh.position.distanceToSquared(camera);
      const lods = [0, 1, 2].map(index =>
        entry.node.mesh.getObjectByName('resource-model-lod-' + index));
      const hasFullLods = entry.node.kind === 'tree' && lods.every(Boolean);
      // Hysteresis prevents rapid switching at distance boundaries.
      const thresholds = hasFullLods ? [10, 25, 50] :
        [entry.node.kind === 'tree' ? 22 : 27];
      let level = entry.level;
      while (level < thresholds.length && distanceSq > (thresholds[level] + 2) ** 2) level++;
      while (level > 0 && distanceSq < (thresholds[level - 1] - 2) ** 2) level--;
      entry.level = level;

      entry.proxy.visible = level === thresholds.length;
      if (hasFullLods) {
        lods.forEach((lod, index) => { if (lod) lod.visible = level === index; });
      } else {
        for (const child of entry.node.mesh.children) {
          if (child !== entry.proxy) child.visible = level === 0;
        }
      }
    }
  }
}
