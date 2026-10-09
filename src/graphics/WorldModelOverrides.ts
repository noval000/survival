import * as THREE from 'three';
import { AssetLibrary } from './AssetLibrary';
import type { AssetKind } from './AssetLibrary';

type AssetManifest = Partial<Record<AssetKind, { scale?: number; yOffset?: number }>>;

/**
 * Real GLB models override procedural meshes when a local manifest lists
 * them. No network requests for nonexistent files. All models are optional.
 */
export class WorldModelOverrides {
  private readonly library = new AssetLibrary();
  private manifest: AssetManifest = {};

  async initialize() {
    try {
      const response = await fetch('/assets/models/manifest.json');
      if (!response.ok) return;
      const parsed: unknown = await response.json();
      if (parsed && typeof parsed === 'object') this.manifest = parsed as AssetManifest;
    } catch { /* Offline: retain fallback geometry. */ }
  }

  async replace(target: THREE.Group, kind: AssetKind) {
    const config = this.manifest[kind];
    if (!config) return false;
    const model = await this.library.instantiate(kind);
    if (!model || !target.parent) return false;
    const box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) return false;
    const size = new THREE.Vector3();
    box.getSize(size);
    const targetHeight = kind === 'boulder' ? 1.5 :
      kind === 'log' ? 1 : kind === 'oak' ? 7.5 : 6.5;
    const scale = config.scale ?? targetHeight / Math.max(.001, size.y);
    model.scale.setScalar(scale);
    model.position.y = (config.yOffset ?? 0) - box.min.y * scale;
    // Preserve target as the gameplay collision/interaction root.
    for (const child of [...target.children]) {
      if (child.name !== 'resource-lod-proxy') target.remove(child);
    }
    target.add(model);
    return true;
  }
}
