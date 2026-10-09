import * as THREE from 'three';

export type Foundation = { x: number; z: number };
export type Wall = { x: number; z: number; rot: number };
export type Placement = { x: number; z: number; rot: number; valid: boolean };

const SIZE = 4;
const REACH = 7;
const EPS = 0.01;
const same = (a: number, b: number) => Math.abs(a - b) < EPS;

/** A wall belongs to a foundation edge; neighbouring foundations share the same edge. */
export function placement(
  type: 'foundation' | 'wall',
  position: THREE.Vector3,
  yaw: number,
  foundations: Foundation[],
  walls: Wall[],
): Placement {
  const aim = position.clone().add(
    new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).multiplyScalar(5),
  );
  if (type === 'foundation') {
    const x = Math.round(aim.x / SIZE) * SIZE;
    const z = Math.round(aim.z / SIZE) * SIZE;
    return {
      x, z, rot: 0,
      valid: Math.hypot(x, z) < 90
        && Math.hypot(x - position.x, z - position.z) <= REACH
        && !foundations.some(f => same(f.x, x) && same(f.z, z)),
    };
  }

  let nearest: Placement | null = null;
  let distance = Infinity;
  for (const f of foundations) {
    const edges = [
      { x: f.x + SIZE / 2, z: f.z, rot: Math.PI / 2 },
      { x: f.x - SIZE / 2, z: f.z, rot: Math.PI / 2 },
      { x: f.x, z: f.z + SIZE / 2, rot: 0 },
      { x: f.x, z: f.z - SIZE / 2, rot: 0 },
    ];
    for (const edge of edges) {
      const d = Math.hypot(edge.x - aim.x, edge.z - aim.z);
      if (d >= distance) continue;
      distance = d;
      nearest = {
        ...edge,
        valid: d <= 3.5
          && Math.hypot(edge.x - position.x, edge.z - position.z) <= REACH
          && !walls.some(w => same(w.x, edge.x) && same(w.z, edge.z)),
      };
    }
  }
  return nearest ?? { x: aim.x, z: aim.z, rot: 0, valid: false };
}

export function createGhost(scene: THREE.Scene) {
  const material = new THREE.MeshBasicMaterial({
    color: 0x30ff73, transparent: true, opacity: 0.38,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const foundationGeometry = new THREE.BoxGeometry(SIZE, 0.32, SIZE);
  const wallGeometry = new THREE.BoxGeometry(SIZE, 3, 0.25);
  const mesh = new THREE.Mesh(foundationGeometry, material);
  mesh.visible = false;
  mesh.renderOrder = 10;
  scene.add(mesh);

  return {
    mesh, material,
    update(type: 'foundation' | 'wall', p: Placement, active: boolean) {
      mesh.visible = active;
      if (!active) return;
      mesh.geometry = type === 'foundation' ? foundationGeometry : wallGeometry;
      mesh.position.set(p.x, type === 'foundation' ? 0.16 : 1.65, p.z);
      mesh.rotation.y = p.rot;
      material.color.setHex(p.valid ? 0x30ff73 : 0xff4444);
    },
    dispose() {
      scene.remove(mesh);
      foundationGeometry.dispose();
      wallGeometry.dispose();
      material.dispose();
    },
  };
}
