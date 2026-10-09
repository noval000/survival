import * as THREE from 'three';

export type Quality = 'low' | 'medium' | 'high';

export function defaultQuality(): Quality {
  const mobile = matchMedia('(pointer: coarse)').matches;
  return mobile ? 'medium' : 'high';
}

export function applyQuality(
  renderer: THREE.WebGLRenderer,
  sun: THREE.DirectionalLight,
  quality: Quality,
) {
  const maxRatio = quality === 'low' ? 1 : quality === 'medium' ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio, maxRatio));
  renderer.shadowMap.enabled = quality !== 'low';
  sun.castShadow = quality !== 'low';
  const shadowSize = quality === 'high' ? 2048 : 1024;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.map?.dispose();
  sun.shadow.map = null;
  renderer.setSize(innerWidth, innerHeight);
}
