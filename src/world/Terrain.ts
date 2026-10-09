import * as THREE from 'three';

const ISLAND_RADIUS = 104;
const clamp = THREE.MathUtils.clamp;
const smooth = THREE.MathUtils.smoothstep;

function hash(x: number, z: number) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function noise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = THREE.MathUtils.lerp(hash(ix, iz), hash(ix + 1, iz), u);
  const b = THREE.MathUtils.lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), u);
  return THREE.MathUtils.lerp(a, b, v) * 2 - 1;
}

function fractal(x: number, z: number) {
  let total = 0, amplitude = 1, frequency = 1, sum = 0;
  for (let i = 0; i < 5; i++) {
    total += noise(x * frequency, z * frequency) * amplitude;
    sum += amplitude;
    amplitude *= .5;
    frequency *= 2.1;
  }
  return total / sum;
}

/**
 * Deterministic continuous height field. The central camp is flat for
 * construction; forest ridges rise beyond it. Beach falls into the sea.
 */
export function terrainHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const camp = smooth(r, 17, 37);
  const forest = smooth(r, 24, 56);
  const shore = 1 - smooth(r, 87, ISLAND_RADIUS);
  const broad = fractal(x * .018 + 17, z * .018 - 12);
  const fine = fractal(x * .083, z * .083);
  const ridge = Math.max(0, 2.4 + broad * 7 + fine * 1.5);
  const height = camp * (forest * ridge + (1 - forest) * .45)
    + fine * .24 * camp;
  return height * shore - smooth(r, 97, 105) * 1.6;
}

export function terrainNormal(x: number, z: number) {
  const e = .35;
  return new THREE.Vector3(
    terrainHeight(x - e, z) - terrainHeight(x + e, z),
    2 * e,
    terrainHeight(x, z - e) - terrainHeight(x, z + e),
  ).normalize();
}

export function terrainSlope(x: number, z: number) {
  return Math.acos(clamp(terrainNormal(x, z).y, -1, 1));
}

export function createTerrain(
  scene: THREE.Scene,
  sandMaterial: THREE.MeshStandardMaterial,
  grassMaterial: THREE.MeshStandardMaterial,
) {
  const segments = 224;
  const radius = ISLAND_RADIUS;
  const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  const grass = new THREE.Color(0xffffff);
  const beach = new THREE.Color(0xc3b894);
  const stone = new THREE.Color(0x8a8b83);
  const tint = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const r = Math.hypot(x, z);
    const edge = clamp((ISLAND_RADIUS - r) * 1.2, 0, 1);
    const y = terrainHeight(x, z);
    positions.setY(i, y);
    const beachBlend = smooth(r, 83, 99);
    const cliffBlend = smooth(terrainSlope(x, z), .36, .72);
    tint.copy(grass).lerp(beach, beachBlend).lerp(stone, cliffBlend * .45);
    const shade = .86 + hash(x * .6, z * .6) * .23;
    colors[i * 3] = tint.r * shade;
    colors[i * 3 + 1] = tint.g * shade;
    colors[i * 3 + 2] = tint.b * shade;
    if (r > radius) positions.setY(i, -1.8);
    else if (edge < 1) positions.setY(i, y * edge - 1.8 * (1 - edge));
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const groundMaterial = grassMaterial.clone();
  groundMaterial.vertexColors = true;
  groundMaterial.side = THREE.DoubleSide;
  const ground = new THREE.Mesh(geometry, groundMaterial);
  ground.receiveShadow = true;
  scene.add(ground);

  // Separate sand apron follows the coastline and covers the last few metres.
  const sandGeo = new THREE.RingGeometry(98, 104, 256, 12);
  sandGeo.rotateX(-Math.PI / 2);
  const sandPositions = sandGeo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < sandPositions.count; i++) {
    const x = sandPositions.getX(i), z = sandPositions.getZ(i);
    sandPositions.setY(i, terrainHeight(x, z) + .015);
  }
  sandGeo.computeVertexNormals();
  const apron = new THREE.Mesh(sandGeo, sandMaterial);
  apron.receiveShadow = true;
  scene.add(apron);
  return { ground, apron };
}
