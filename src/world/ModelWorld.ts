import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { terrainHeight } from './Terrain';
import { createUndergroundMine, mineFloorAtDistance } from './UndergroundMine';

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
  private readonly mineDebugHelpers: THREE.Box3Helper[] = [];
  private mineDebugVisible = false;
  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', event => {
        if (event.code !== 'F8' || event.repeat) return;
        event.preventDefault();
        this.mineDebugVisible = !this.mineDebugVisible;
        for (const helper of this.mineDebugHelpers) helper.visible = this.mineDebugVisible;
        console.info('Mine GLB bounds:', this.mineDebugVisible ? 'ON' : 'OFF');
      });
    }
  }
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
  // Decorative Meshy sections are fitted to side alcoves. Their raw meshes
  // are never used as collision geometry or as the navigation floor.
  async placeMineDecoration(scene: THREE.Scene, name: string, x: number, y: number, z: number,
    maxWidth: number, maxHeight: number, maxDepth: number, rotation = 0): Promise<THREE.Group | null> {
    const url = models.get(name)?.levels[0];
    if (!url) { console.warn('Missing mine model:', name); return null; }
    const group = await this.load(url);
    if (!group) return null;
    const bounds = new THREE.Box3().setFromObject(group);
    if (bounds.isEmpty()) return null;
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = Math.min(maxWidth / Math.max(size.x, .001),
      maxHeight / Math.max(size.y, .001),
      maxDepth / Math.max(size.z, .001));
    // Center the GLB in its own safe decoration zone; never fill the route.
    group.scale.setScalar(scale);
    // Align visual origin to the bounding-box footprint and lowest vertex.
    // This is a geometric pivot normalization, not a guarantee of open portals.
    group.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    group.traverse(node => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = false;
        node.receiveShadow = true;
        node.frustumCulled = false;
      }
    });
    const root = new THREE.Group();
    root.name = 'MineDecoration_' + name;
    root.position.set(x, y, z);
    root.rotation.y = rotation;
    root.add(group);
    scene.add(root);
    const worldBounds = new THREE.Box3().setFromObject(root);
    const helper = new THREE.Box3Helper(worldBounds, 0x00ffcc);
    helper.visible = this.mineDebugVisible;
    helper.name = 'DebugBounds_' + name;
    scene.add(helper);
    this.mineDebugHelpers.push(helper);
    const dimensions = worldBounds.getSize(new THREE.Vector3());
    console.table({ name, originalX: size.x, originalY: size.y, originalZ: size.z,
      placedX: dimensions.x, placedY: dimensions.y, placedZ: dimensions.z,
      worldX: root.position.x, worldY: root.position.y, worldZ: root.position.z,
      yawDegrees: Math.round(THREE.MathUtils.radToDeg(rotation)) });
    console.info('Mine GLB decoration loaded:', name, { scale, originalSize: size.toArray() });
    return root;
  }

  // The verified straight tunnel runs along its local X axis. Rotate it to
  // the world's -Z mine axis, preserving uniform scale and its actual proportions.
  // Return the world-space length so the next module meets the previous end.
  async placeStraightMineModule(scene: THREE.Scene, centerDistance: number): Promise<number | null> {
    const url = models.get('mine_tunnel_01')?.levels[0];
    if (!url) return null;
    const model = await this.load(url);
    if (!model) return null;
    const bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty()) return null;
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    // Local Z is the cross-section; local X is the tunnel's length.
    const scale = 3.1 / Math.max(size.z, 0.001);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    model.traverse(node => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = false;
        node.receiveShadow = true;
      }
    });
    const root = new THREE.Group();
    root.name = 'WalkableMineMeshyStraight';
    root.position.set(53, mineFloorAtDistance(centerDistance), -32 - centerDistance);
    root.rotation.y = Math.PI / 2;
    root.add(model);
    scene.add(root);
    const worldBounds = new THREE.Box3().setFromObject(root);
    const helper = new THREE.Box3Helper(worldBounds, 0x00ffcc);
    helper.name = 'MineModuleBounds';
    helper.visible = this.mineDebugVisible;
    scene.add(helper);
    this.mineDebugHelpers.push(helper);
    console.info('Mine straight module', {
      centerDistance, scale, length: size.x * scale,
      worldSize: worldBounds.getSize(new THREE.Vector3()).toArray(),
    });
    return size.x * scale;
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
      // Every LOD must share the same footprint origin and ground contact.
      // Without this, trees and rocks visibly jump as LOD switches.
      const center = box.getCenter(new THREE.Vector3());
      group.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
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

  // Preserve the proven walkable ramp and collision-free central aisle.
  createUndergroundMine(scene);
  // First integration milestone: repeat the verified open-ended Meshy
  // tunnel along the flat section. Keep the existing navigation floor.
  // Model length is measured at runtime, not guessed from accessor bounds.
  if (hasWorldModel('mine_tunnel_01')) {
    const firstCenter = 21;
    const moduleLength = await assets.placeStraightMineModule(scene, firstCenter);
    if (moduleLength && Number.isFinite(moduleLength)) {
      for (let i = 1; i < 3; i++) {
        const center = firstCenter + moduleLength * i;
        if (center + moduleLength / 2 > 46) break;
        await assets.placeStraightMineModule(scene, center);
      }
    }
  }
  // Cave models remain surface previews, separate from the mine.
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
