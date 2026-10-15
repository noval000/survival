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
  async place(scene: THREE.Scene, name: string, x: number, z: number, height: number, rotation = 0): Promise<THREE.Group | null> {
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
      const scale = height / Math.max(.001, size.y);
      group.scale.setScalar(scale);
      group.position.y = -box.min.y * scale;
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
  // Each modular piece is placed using the measured footprint of its
  // predecessor, not independent hand-picked coordinates.
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

  async function buildPassage(
    entranceName: string, tunnelName: string, junctionName: string | null,
    x: number, z: number,
  ) {
    const entrance = await place(entranceName, x, z, 5);
    if (!entrance) return;
    const entranceSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(entrance).getSize(entranceSize);
    // Modules share their local Z axis. The entrance faces toward +Z,
    // with the passage extending toward -Z.
    const step = Math.max(3, entranceSize.z * .75);
    const tunnel = await place(tunnelName, x, z - step, 5);
    if (!tunnel || !junctionName) return;
    const tunnelSize = new THREE.Vector3();
    new THREE.Box3().setFromObject(tunnel).getSize(tunnelSize);
    await place(junctionName, x, z - step - Math.max(3, tunnelSize.z * .85), 5);
  }
  await Promise.all([
    buildPassage('mine_entrance_01', 'mine_tunnel_01', 'mine_junction_01', 53, -34),
    buildPassage('cave_entrance_01', 'cave_tunnel_01', null, -55, 45),
  ]);
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
