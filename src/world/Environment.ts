import { OceanSurface } from '../graphics/OceanSurface';
import { createTerrain } from './Terrain';
import * as THREE from 'three';
import { createSurfaceTextures } from './SurfaceTextures';
import { createAtmosphere } from './Atmosphere';

/**
 * Mobile-first coastal biome. Keep the playable ground at y=0 until
 * character movement and resource placement support terrain heights.
 */
export function createEnvironment(scene: THREE.Scene, random: () => number) {
  const terrain = new THREE.Group();
  scene.add(terrain);

  const textures = createSurfaceTextures();
  const sand = new THREE.MeshStandardMaterial({ map: textures.sand, roughness: 1 });
  const grass = new THREE.MeshStandardMaterial({ map: textures.grass, roughness: 1 });
  const oceanSurface = new OceanSurface();
  const waterMaterial = oceanSurface.material;

  createTerrain(scene, sand, grass);

  // Keep ocean outside the island footprint. A full water plane used to
  // intersect the below-sea-level mine ramp and appear as cyan ground.
  const sea = new THREE.Mesh(new THREE.RingGeometry(103, 600, 256, 1), waterMaterial);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.17;
  terrain.add(sea);

  const atmosphere = createAtmosphere(scene, random);
  return { water: sea, waterMaterial, oceanSurface, atmosphere };
}
