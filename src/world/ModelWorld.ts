import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { terrainHeight } from './Terrain';

// Generated before dev/build from the actual GLB files.
type Model = { name: string; levels: string[] };
const models = new Map<string, Model>();
export async function initializeWorldModels() {
  try {
    const response = await fetch('/assets/models/world-registry.json');
    if (!response.ok) return;
    const entries = await response.json() as Record<string, string[]>;
    for (const [name, levels] of Object.entries(entries)) models.set(name, { name, levels });
  } catch (error) { console.error('World model registry unavailable', error); }
}

export function hasWorldModel(name: string) { return Boolean(models.get(name)?.levels[0]); }
export function availableWorldModels() { return [...models.keys()].filter(hasWorldModel); }

export class WorldAssets {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Promise<THREE.Group | null>>();
  private async load(url: string): Promise<THREE.Group | null> {
    let task = this.cache.get(url);
    if (!task) {
      task = new Promise(resolve => this.loader.load(url, gltf => resolve(gltf.scene), undefined, error => { console.error('GLB load failed:', url, error); resolve(null); }));
      this.cache.set(url, task);
    }
    const original = await task;
    return original?.clone(true) ?? null;
  }
  async place(scene: THREE.Scene, name: string, x: number, z: number, height: number, rotation = 0, modular = false): Promise<THREE.Group | null> {
    const config = models.get(name);
    if (!config?.levels[0]) return null;
    // Display LOD0 as soon as it loads. Do not block the entire world
    // waiting for every high-poly LOD of every object.
    const first = await this.load(config.levels[0]);
    if (!first) return null;
    const lod = new THREE.LOD();
    const setup = (group: THREE.Group, distance: number) => {
      const box = new THREE.Box3().setFromObject(group);
      if (box.isEmpty()) return false;
      const size = new THREE.Vector3();
      box.getSize(size);
      const scale = modular ? 1 : height / Math.max(.001, size.y);
      group.scale.setScalar(scale);
      group.position.y = modular ? 0 : -box.min.y * scale;
      group.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      lod.addLevel(group, distance);
      return true;
    };
    if (!setup(first, 0)) {
      console.error('Empty GLB scene:', name);
      return null;
    }
    const root = new THREE.Group();
    root.position.set(x, terrainHeight(x, z), z);
    root.rotation.y = rotation;
    root.add(lod);
    scene.add(root);
    // Load optional distance levels without delaying visible objects.
    void (async () => {
      for (let i = 1; i < 3; i++) {
        const url = config.levels[i];
        if (!url) continue;
        const group = await this.load(url);
        if (group) setup(group, i === 1 ? 28 : 65);
      }
    })();
    return root;
  }
}

export async function populateModelWorld(scene: THREE.Scene, random: () => number, onTree?: (tree: THREE.Group) => void, onCollider?: (object: THREE.Group) => void) {
  await initializeWorldModels();
  console.info('Available world GLBs:', availableWorldModels());
  const assets = new WorldAssets();
  const place = async (name: string, x: number, z: number, height: number) => {
    const object = await assets.place(scene, name, x, z, height);
    if (object) onCollider?.(object);
    return object;
  };
  const sites = [
    { name: 'rocky_mountain_01', x: -53, z: -37, h: 17 },
    { name: 'cliff_01', x: -69, z: -28, h: 12 },
    { name: 'cliff_01', x: -38, z: -47, h: 11 },
  ];
  await Promise.all(sites.filter(site => hasWorldModel(site.name)).map(site =>
    place(site.name, site.x, site.z, site.h)));

  // Prototype route: keep Meshy GLBs as visuals, while navigation is handled
  // by an explicit corridor floor rather than their decorative triangles.
  const mineNames = ['mine_entrance_01', 'mine_decline_01', 'mine_tunnel_01', 'mine_junction_01', 'mine_corner_01'];
  const mineX = 53, mineZ = -34;
  const surfaceY = terrainHeight(mineX, mineZ);
  const lengths = [4, 8, 6, 6, 6];
  let distance = 0;
  for (let i = 0; i < mineNames.length; i++) {
    const name = mineNames[i];
    const length = lengths[i];
    const centerZ = mineZ - distance - length / 2;
    const floorY = i === 0 ? surfaceY : i === 1 ? surfaceY - 1 : surfaceY - 2;
    if (hasWorldModel(name)) {
      const object = await assets.place(scene, name, mineX, centerZ, 3.5);
      if (object) {
        // Meshy geometry is visual only: its rails and irregular mesh must not
        // block the test corridor.
        object.position.y = floorY;
      }
    }
    distance += length;
  }
  // Cave assets remain surface previews until their own underground route exists.
  for (const [name, x, z] of [['cave_entrance_01', -55, 45], ['cave_tunnel_01', -55, 39]] as const) {
    if (hasWorldModel(name)) await assets.place(scene, name, x, z, 4);
  }
  const trees = ['pine_01', 'spruce_01'].filter(hasWorldModel);
  if (!trees.length) return;
  const positions: {x:number;z:number}[] = [];
  for (let attempt = 0; attempt < 180 && positions.length < 24; attempt++) {
    const x = (random() - .5) * 165;
    const z = (random() - .5) * 165;
    if (Math.hypot(x, z) < 22 || Math.hypot(x, z) > 87) continue;
    if (sites.some(site => Math.hypot(x - site.x, z - site.z) < 17)) continue;
    if (positions.some(pos => Math.hypot(x - pos.x, z - pos.z) < 9)) continue;
    positions.push({x,z});
  }
  await Promise.all(positions.map(async ({x,z}) => {
    const tree = await assets.place(scene, trees[Math.floor(random() * trees.length)], x, z, 6 + random() * 3, random() * Math.PI * 2);
    if (tree) { onTree?.(tree); onCollider?.(tree); }
  }));
}
