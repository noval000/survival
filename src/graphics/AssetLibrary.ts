import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type AssetKind =
  | 'pine' | 'spruce' | 'oak' | 'boulder' | 'log'
  | 'axe' | 'pickaxe' | 'survivor';

const assetPaths: Record<AssetKind, string> = {
  pine: '/assets/models/trees/pine_01.glb',
  spruce: '/assets/models/spruce.glb',
  oak: '/assets/models/oak.glb',
  boulder: '/assets/models/boulder.glb',
  log: '/assets/models/log.glb',
  axe: '/assets/models/axe.glb',
  pickaxe: '/assets/models/pickaxe.glb',
  survivor: '/assets/models/survivor.glb',
};

type CachedAsset = { scene: THREE.Group; animations: THREE.AnimationClip[] };

/**
 * Optional GLB asset pipeline. Missing models resolve to null so that the
 * procedural fallback world remains playable. Models must be licensed and
 * placed in public/assets/models; no remote hotlinking or implicit downloads.
 */
export class AssetLibrary {
  private readonly loader = new GLTFLoader();
  private readonly cache = new Map<AssetKind, Promise<CachedAsset | null>>();

  load(kind: AssetKind): Promise<CachedAsset | null> {
    const cached = this.cache.get(kind);
    if (cached) return cached;
    const task = new Promise<CachedAsset | null>(resolve => {
      this.loader.load(
        assetPaths[kind],
        gltf => {
          gltf.scene.traverse(object => {
            if (!(object instanceof THREE.Mesh)) return;
            object.castShadow = true;
            object.receiveShadow = true;
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
              if (material instanceof THREE.MeshStandardMaterial) {
                material.roughness = THREE.MathUtils.clamp(material.roughness, .06, 1);
                material.needsUpdate = true;
              }
            }
          });
          resolve({ scene: gltf.scene, animations: gltf.animations });
        },
        undefined,
        () => resolve(null),
      );
    });
    this.cache.set(kind, task);
    return task;
  }

  async instantiate(kind: AssetKind): Promise<THREE.Group | null> {
    const asset = await this.load(kind);
    return asset ? asset.scene.clone(true) : null;
  }

  clear() {
    this.cache.clear();
  }
}
