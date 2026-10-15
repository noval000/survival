import * as THREE from 'three';
import { AssetLibrary } from './AssetLibrary';
import type { AssetKind } from './AssetLibrary';

type AssetManifest = Partial<Record<AssetKind, { scale?: number; yOffset?: number }>>;

/** Replace procedural visuals without changing the gameplay collision root. */
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

    // Load one copy of each GLB; clones share geometries and textures.
    // Align each LOD by its own bounding box to prevent visual jumps.
    const lodModels: THREE.Group[] = [model];
    if (kind === 'pine') {
      for (const lodKind of ['pineLod1', 'pineLod2'] as const) {
        const lod = await this.library.instantiate(lodKind);
        if (!lod) break;
        const lodBox = new THREE.Box3().setFromObject(lod);
        if (lodBox.isEmpty()) break;
        const lodSize = new THREE.Vector3();
        lodBox.getSize(lodSize);
        const lodScale = config.scale ?? targetHeight / Math.max(.001, lodSize.y);
        lod.scale.setScalar(lodScale);
        lod.position.y = (config.yOffset ?? 0) - lodBox.min.y * lodScale;
        lodModels.push(lod);
      }
    }
    if (!target.parent) return false;
    for (const child of [...target.children]) {
      if (child.name !== 'resource-lod-proxy') target.remove(child);
    }
    lodModels.forEach((lod, index) => {
      lod.name = 'resource-model-lod-' + index;
      lod.visible = index === 0;
      target.add(lod);
    });
    return true;
  }
}
