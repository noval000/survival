import * as THREE from 'three';

export type Quality = 'low' | 'medium' | 'high';

export function defaultQuality(): Quality {
  const mobile = matchMedia('(pointer: coarse)').matches;
  return mobile ? 'low' : 'medium';
}

export function applyQuality(
  renderer: THREE.WebGLRenderer,
  sun: THREE.DirectionalLight,
  quality: Quality,
) {
  const maxRatio = quality === 'low' ? 1 : quality === 'medium' ? 1.25 : 1.5;
  renderer.setPixelRatio(Math.min(devicePixelRatio, maxRatio));
  renderer.shadowMap.enabled = quality !== 'low';
  sun.castShadow = quality !== 'low';
  const shadowSize = quality === 'high' ? 1536 : 768;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.map?.dispose();
  sun.shadow.map = null;
  renderer.setSize(innerWidth, innerHeight);
}
