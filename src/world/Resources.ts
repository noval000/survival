import * as THREE from 'three';
import { makeDetailedTree, makeDetailedRock } from './DetailedAssets';

export type Harvestable = {
  kind: 'tree' | 'rock';
  mesh: THREE.Group;
  hp: number;
  maxHp: number;
  falling?: boolean;
};

const barkCut = new THREE.MeshStandardMaterial({ color: 0xc9a778, roughness: 1 });
const stoneInterior = new THREE.MeshStandardMaterial({ color: 0xabb0aa, roughness: 1 });
const chipGeo = new THREE.IcosahedronGeometry(0.15, 0);

export function makeTree(x: number, z: number, random: () => number): Harvestable {
  const variant = random() < .2 ? 'oak' : random() < .5 ? 'spruce' : 'pine';
  const root = makeDetailedTree(random, variant);
  root.scale.multiplyScalar(.75 + random() * .58);
  root.position.set(x, 0, z);
  return { kind: 'tree', mesh: root, hp: 5, maxHp: 5 };
}

export function makeRock(x: number, z: number, random: () => number): Harvestable {
  const root = makeDetailedRock(random, .8 + random() * .65);
  root.position.set(x, 0, z);
  return { kind: 'rock', mesh: root, hp: 5, maxHp: 5 };
}

/** Lightweight impact particles. Updated inside the existing render loop. */
export class HarvestEffects {
  private particles: { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number }[] = [];
  constructor(private scene: THREE.Scene) {}

  impact(node: Harvestable) {
    const count = node.kind === 'tree' ? 5 : 7;
    const material = node.kind === 'tree' ? barkCut : stoneInterior;
    for (let i = 0; i < count; i++) {
      const piece = new THREE.Mesh(chipGeo, material);
      piece.position.copy(node.mesh.position).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.6, 1 + Math.random() * 0.8, (Math.random() - 0.5) * 0.6));
      piece.scale.setScalar(0.45 + Math.random() * 0.9);
      this.scene.add(piece);
      this.particles.push({
        mesh: piece,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 3,
          2 + Math.random() * 2, (Math.random() - 0.5) * 3),
        life: 0.6 + Math.random() * 0.35,
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.velocity.y -= 9.8 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.z += dt * 4;
      if (p.mesh.position.y < 0.08) {
        p.mesh.position.y = 0.08;
        p.velocity.multiplyScalar(0.35);
      }
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }
}

/** Smoothly tilt a tree away from the player, or crumble a mined rock. */
export function destroyResource(node: Harvestable, scene: THREE.Scene,
  origin: THREE.Vector3) {
  if (node.falling) return;
  node.falling = true;
  const duration = node.kind === 'tree' ? 1.45 : 0.55;
  const start = performance.now();
  const direction = node.mesh.position.clone().sub(origin);
  const axis = new THREE.Vector3(direction.z, 0, -direction.x).normalize();
  if (axis.lengthSq() < 0.01) axis.set(0, 0, 1);
  const initialScale = node.mesh.scale.clone();
  const initialQuaternion = node.mesh.quaternion.clone();
  function tick() {
    const t = Math.min(1, (performance.now() - start) / (duration * 1000));
    const eased = t * t * (3 - 2 * t);
    if (node.kind === 'tree') {
      node.mesh.quaternion.copy(initialQuaternion).premultiply(
        new THREE.Quaternion().setFromAxisAngle(axis, eased * Math.PI * 0.48));
    } else {
      node.mesh.scale.copy(initialScale).multiplyScalar(Math.max(0.001, 1 - eased));
      node.mesh.rotation.y += 0.05;
    }
    if (t < 1) requestAnimationFrame(tick);
    else scene.remove(node.mesh);
  }
  tick();
}
