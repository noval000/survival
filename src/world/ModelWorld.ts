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
  } catch { /* No models means no spawned world objects. */ }
}

export function hasWorldModel(name: string) { return Boolean(models.get(name)?.levels[0]); }
export function availableWorldModels() { return [...models.keys()].filter(hasWorldModel); }

export class WorldAssets {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<string, Promise<THREE.Group | null>>();
  private async load(url: string): Promise<THREE.Group | null> {
    let task = this.cache.get(url);
    if (!task) {
      task = new Promise(resolve => this.loader.load(url, gltf => resolve(gltf.scene), undefined, () => resolve(null)));
      this.cache.set(url, task);
    }
    const original = await task;
    return original?.clone(true) ?? null;
  }
  async place(scene: THREE.Scene, name: string, x: number, z: number, height: number, rotation = 0): Promise<THREE.Group | null> {
    const config = models.get(name);
    if (!config?.levels[0]) return null;
    const lod = new THREE.LOD();
    for (let i = 0; i < 3; i++) {
      const url = config.levels[i];
      if (!url) continue;
      const group = await this.load(url);
      if (!group) continue;
      const box = new THREE.Box3().setFromObject(group);
      if (box.isEmpty()) continue;
      const size = new THREE.Vector3();
      box.getSize(size);
      const scale = height / Math.max(.001, size.y);
      group.scale.setScalar(scale);
      group.position.y = -box.min.y * scale;
      group.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      lod.addLevel(group, i === 0 ? 0 : i === 1 ? 28 : 65);
    }
    if (!lod.levels.length) return null;
    const root = new THREE.Group();
    root.position.set(x, terrainHeight(x, z), z);
    root.rotation.y = rotation;
    root.add(lod);
    scene.add(root);
    return root;
  }
}

export async function populateModelWorld(scene: THREE.Scene, random: () => number, onTree?: (tree: THREE.Group) => void) {
  await initializeWorldModels();
  const assets = new WorldAssets();
  const sites = [
    { name: 'rocky_mountain_01', x: -53, z: -37, h: 17 },
    { name: 'cliff_01', x: -69, z: -28, h: 12 },
    { name: 'cliff_01', x: -38, z: -47, h: 11 },
    { name: 'mine_entrance_01', x: 52, z: -36, h: 6 },
    { name: 'mine_tunnel_01', x: 58, z: -42, h: 5 },
    { name: 'mine_junction_01', x: 64, z: -48, h: 5 },
    { name: 'cave_entrance_01', x: -56, z: 44, h: 6 },
    { name: 'cave_tunnel_01', x: -63, z: 50, h: 5 },
  ];
  await Promise.all(sites.filter(site => hasWorldModel(site.name)).map(site =>
    assets.place(scene, site.name, site.x, site.z, site.h)));
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
    if (tree) onTree?.(tree);
  }));
}
