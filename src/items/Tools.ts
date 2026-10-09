import { surfaceMaterial } from '../graphics/ProceduralPBR';
import * as THREE from 'three';

const handleMaterial = surfaceMaterial('wood');
const gripMaterial = surfaceMaterial('leather');
const steelMaterial = surfaceMaterial('metal');
const edgeMaterial = new THREE.MeshStandardMaterial({
  color: 0xb9c5ca, metalness: .85, roughness: .2,
});

function add(parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material,
  x: number, y: number, z: number) {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z);
  part.castShadow = true;
  parent.add(part);
  return part;
}

export function createTool(parent: THREE.Group, kind: 'axe' | 'pickaxe') {
  const root = new THREE.Group();
  parent.add(root);
  add(root, new THREE.CylinderGeometry(.038, .052, 1.03, 10),
    handleMaterial, 0, -.44, 0);
  for (let i = 0; i < 5; i++) {
    add(root, new THREE.CylinderGeometry(.052, .052, .025, 10),
      gripMaterial, 0, -.10 - i * .075, 0);
  }
  add(root, new THREE.CylinderGeometry(.063, .063, .065, 12),
    gripMaterial, 0, -.92, 0);
  if (kind === 'axe') {
    const head = add(root, new THREE.BoxGeometry(.42, .23, .16),
      steelMaterial, .16, -.83, 0);
    head.rotation.z = -.06;
    const blade = add(root, new THREE.CylinderGeometry(.18, .25, .34, 3),
      edgeMaterial, .41, -.83, 0);
    blade.rotation.z = Math.PI / 2;
    blade.rotation.y = Math.PI / 2;
    add(root, new THREE.BoxGeometry(.15, .26, .18), steelMaterial, -.06, -.83, 0);
  } else {
    add(root, new THREE.BoxGeometry(.57, .15, .15), steelMaterial, 0, -.84, 0);
    const left = add(root, new THREE.ConeGeometry(.115, .39, 6),
      edgeMaterial, -.45, -.84, 0);
    left.rotation.z = Math.PI / 2;
    const right = add(root, new THREE.ConeGeometry(.115, .39, 6),
      edgeMaterial, .45, -.84, 0);
    right.rotation.z = -Math.PI / 2;
  }
  return root;
}
