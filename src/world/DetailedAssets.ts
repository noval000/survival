import { surfaceMaterial } from '../graphics/ProceduralPBR';
import * as THREE from 'three';

const bark = surfaceMaterial('bark');
const barkDark = new THREE.MeshStandardMaterial({ color: 0x342b23, roughness: 1 });
const cut = new THREE.MeshStandardMaterial({ color: 0xc9a879, roughness: 1 });
const foliage = [
  new THREE.MeshStandardMaterial({ color: 0x31553a, roughness: .96, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ color: 0x426c43, roughness: .96, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ color: 0x254b38, roughness: .96, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ color: 0x567847, roughness: .96, side: THREE.DoubleSide }),
];
const granite = [
  surfaceMaterial('stone'),
  surfaceMaterial('stone'),
  new THREE.MeshStandardMaterial({ color: 0x676f6c, roughness: .98, flatShading: true }),
];
const moss = new THREE.MeshStandardMaterial({ color: 0x536d42, roughness: 1 });
const trunkGeometry = new THREE.CylinderGeometry(.12, .37, 5.4, 12, 6);
const branchGeometry = new THREE.CylinderGeometry(.025, .09, 1, 7);
const rockGeometry = new THREE.IcosahedronGeometry(1, 2);
const needleGeometry = new THREE.ConeGeometry(1, 2.5, 9, 2);
const leafGeometry = new THREE.IcosahedronGeometry(1, 1);
const scratchGeometry = new THREE.BoxGeometry(.012, .36, .016);
const seed01 = (v: number) => {
  const s = Math.sin(v * 127.1 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

function part(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material,
  x: number, y: number, z: number) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function between(random: () => number, low: number, high: number) {
  return low + (high - low) * random();
}

export type TreeVariant = 'pine' | 'spruce' | 'oak';

export function makeDetailedTree(random: () => number, variant: TreeVariant = 'pine') {
  const root = new THREE.Group();
  const height = between(random, .83, 1.25);
  const trunk = part(root, trunkGeometry, bark, 0, 2.7, 0);
  trunk.scale.set(height, height, height);
  // Irregular bark streaks, buttress roots and dark fissures.
  for (let i = 0; i < 17; i++) {
    const angle = random() * Math.PI * 2;
    const radius = .29 - i * .006;
    const y = between(random, .4, 4.5);
    const streak = part(root, scratchGeometry, barkDark,
      Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    streak.rotation.y = -angle;
    streak.scale.y = between(random, .4, 2.5);
  }
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5 + random() * .3;
    const rootBranch = part(root, branchGeometry, bark,
      Math.cos(a) * .34, .25, Math.sin(a) * .34);
    rootBranch.scale.set(1.5, 1.2, 1.5);
    rootBranch.rotation.z = Math.cos(a) * .95;
    rootBranch.rotation.x = -Math.sin(a) * .95;
  }
  if (variant === 'oak') {
    for (let i = 0; i < 12; i++) {
      const angle = i * 2.399 + random() * .4;
      const reach = between(random, 1.0, 2.6);
      const y = between(random, 3.4, 5.5);
      const branch = part(root, branchGeometry, bark,
        Math.cos(angle) * reach * .4, y - .5, Math.sin(angle) * reach * .4);
      branch.scale.set(1.7, 1.9, 1.7);
      branch.rotation.z = Math.cos(angle) * .9;
      branch.rotation.x = -Math.sin(angle) * .9;
      const crown = part(root, leafGeometry, foliage[i % foliage.length],
        Math.cos(angle) * reach, y, Math.sin(angle) * reach);
      crown.scale.set(between(random, .9, 1.45), between(random, .65, 1.15),
        between(random, .9, 1.45));
    }
  } else {
    const tiers = variant === 'spruce' ? 9 : 7;
    for (let i = 0; i < tiers; i++) {
      const y = 2.6 + i * .54;
      const width = (variant === 'spruce' ? 2.3 : 2.1) * (1 - i / (tiers + 1));
      const crown = part(root, needleGeometry, foliage[i % foliage.length],
        between(random, -.09, .09), y, between(random, -.09, .09));
      crown.scale.set(width / 1.5, .72, width / 1.5);
      crown.rotation.y = random() * Math.PI;
      for (let j = 0; j < 5; j++) {
        const angle = j * Math.PI * 2 / 5 + i * .6;
        const twig = part(root, branchGeometry, bark,
          Math.cos(angle) * width * .32, y - .5, Math.sin(angle) * width * .32);
        twig.scale.set(.65, width * .8, .65);
        twig.rotation.z = Math.cos(angle) * .85;
        twig.rotation.x = -Math.sin(angle) * .85;
      }
    }
  }
  root.scale.setScalar(height);
  root.rotation.y = random() * Math.PI * 2;
  return root;
}

export function makeDetailedRock(random: () => number, size = 1) {
  const root = new THREE.Group();
  const count = 3 + Math.floor(random() * 4);
  for (let i = 0; i < count; i++) {
    const stone = part(root, rockGeometry, granite[i % granite.length],
      between(random, -.85, .85), between(random, .22, .6), between(random, -.85, .85));
    stone.scale.set(between(random, .55, 1.2), between(random, .35, .9),
      between(random, .5, 1.1));
    stone.rotation.set(random() * 3, random() * 6, random() * 3);
    // Patches of moss are inset into the surface of selected stones.
    if (i % 2 === 0) {
      const patch = part(root, leafGeometry, moss,
        stone.position.x, stone.position.y + stone.scale.y * .7,
        stone.position.z);
      patch.scale.set(stone.scale.x * .65, .045, stone.scale.z * .65);
    }
  }
  root.scale.setScalar(size);
  return root;
}

export function makeStump(random: () => number) {
  const root = new THREE.Group();
  const trunk = part(root, new THREE.CylinderGeometry(.27, .36, .5, 12), bark, 0, .25, 0);
  trunk.rotation.z = between(random, -.1, .1);
  part(root, new THREE.CylinderGeometry(.275, .275, .018, 12), cut, 0, .51, 0);
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 2 / 5;
    const ring = part(root, new THREE.TorusGeometry(.055 + i * .038, .006, 4, 24),
      barkDark, 0, .523, 0);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = angle;
  }
  return root;
}

export function makeFallenLog(random: () => number) {
  const root = new THREE.Group();
  const log = part(root, new THREE.CylinderGeometry(.21, .3, 3.5, 12, 6),
    bark, 0, .3, 0);
  log.rotation.z = Math.PI / 2;
  for (const x of [-1.75, 1.75]) {
    const end = part(root, new THREE.CylinderGeometry(.25, .25, .02, 12),
      cut, x, .3, 0);
    end.rotation.z = Math.PI / 2;
  }
  for (let i = 0; i < 7; i++) {
    const x = between(random, -1.5, 1.5);
    const mark = part(root, scratchGeometry, barkDark, x, .52, 0);
    mark.rotation.z = Math.PI / 2;
    mark.scale.y = between(random, .3, 1.5);
  }
  return root;
}

export function assetSeed(index: number) {
  let state = Math.floor(seed01(index + 1) * 0xffffffff) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
