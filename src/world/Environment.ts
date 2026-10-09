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
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x287f94, roughness: 0.27, metalness: 0.08,
    transparent: true, opacity: 0.87, depthWrite: false,
  });

  const shore = new THREE.Mesh(new THREE.CircleGeometry(104, 128), sand);
  shore.rotation.x = -Math.PI / 2;
  shore.position.y = 0.022;
  shore.receiveShadow = true;
  terrain.add(shore);

  const inner = new THREE.Mesh(new THREE.CircleGeometry(94, 128), grass);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.045;
  inner.receiveShadow = true;
  terrain.add(inner);

  // Large flat ocean: no dense tessellation or expensive transmission shader.
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), waterMaterial);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.17;
  terrain.add(sea);

  // Ground patches create a broken transition between sandy shore and meadow.
  const patchGeometry = new THREE.CircleGeometry(1, 16);
  const patches = new THREE.InstancedMesh(patchGeometry, grass, 240);
  const patchDummy = new THREE.Object3D();
  for (let i = 0; i < 240; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 90 + random() * 11;
    patchDummy.position.set(Math.cos(angle) * radius, .051, Math.sin(angle) * radius);
    patchDummy.rotation.set(-Math.PI / 2, 0, random() * Math.PI * 2);
    patchDummy.scale.set(1.5 + random() * 4, 1 + random() * 2, 1);
    patchDummy.updateMatrix();
    patches.setMatrixAt(i, patchDummy.matrix);
  }
  patches.instanceMatrix.needsUpdate = true;
  terrain.add(patches);

  // Two crossed blades give grass some volume without separate draw calls.
  const bladeGeo = new THREE.BufferGeometry();
  const bladeVertices = new Float32Array([
    -0.045, 0, 0, 0.045, 0, 0, 0, 0.38, 0,
    0, 0, -0.045, 0, 0, 0.045, 0, 0.38, 0,
  ]);
  bladeGeo.setAttribute('position', new THREE.BufferAttribute(bladeVertices, 3));
  bladeGeo.computeVertexNormals();
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x82a257, side: THREE.DoubleSide, roughness: 1,
  });
  const grassCount = 5200;
  const blades = new THREE.InstancedMesh(bladeGeo, bladeMat, grassCount);
  blades.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const colors = [0x668847, 0x829e54, 0x9caa65, 0x637d3c].map(c => new THREE.Color(c));
  for (let i = 0; i < grassCount; i++) {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * 91;
    dummy.position.set(Math.cos(a) * r, 0.065, Math.sin(a) * r);
    dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.22);
    dummy.scale.setScalar(0.65 + random() * 1.35);
    dummy.updateMatrix();
    blades.setMatrixAt(i, dummy.matrix);
    blades.setColorAt(i, colors[Math.floor(random() * colors.length)]);
  }
  blades.instanceMatrix.needsUpdate = true;
  if (blades.instanceColor) blades.instanceColor.needsUpdate = true;
  terrain.add(blades);

  // Scatter shore stones in one instanced draw call.
  const pebbleGeo = new THREE.IcosahedronGeometry(0.12, 0);
  const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x999488, roughness: 1 });
  const pebbleCount = 500;
  const pebbles = new THREE.InstancedMesh(pebbleGeo, pebbleMat, pebbleCount);
  for (let i = 0; i < pebbleCount; i++) {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * 102;
    dummy.position.set(Math.cos(a) * r, 0.10, Math.sin(a) * r);
    dummy.rotation.set(random() * 2, random() * 6, random() * 2);
    dummy.scale.setScalar(0.4 + random() * 2);
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);
  }
  pebbles.instanceMatrix.needsUpdate = true;
  terrain.add(pebbles);

  // Wildflower clusters and low scrub use instancing to keep draw calls low.
  const flowerGeo = new THREE.IcosahedronGeometry(.085, 0);
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xe7d7a5, roughness: 1 });
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, 1600);
  const flowerColors = [0xeed18a, 0xf0e6d2, 0xb7a5d5, 0xc9dca0].map(c => new THREE.Color(c));
  for (let i = 0; i < 1600; i++) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 89;
    dummy.position.set(Math.cos(angle) * radius, .22 + random() * .1, Math.sin(angle) * radius);
    dummy.rotation.set(0, random() * 6, 0);
    dummy.scale.setScalar(.6 + random() * 1.7);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    flowers.setColorAt(i, flowerColors[Math.floor(random() * flowerColors.length)]);
  }
  flowers.instanceMatrix.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  terrain.add(flowers);

  const driftwoodMat = new THREE.MeshStandardMaterial({ color: 0x8b795d, roughness: 1 });
  const driftwoodGeo = new THREE.CylinderGeometry(.09, .16, 2.4, 6);
  const driftwood = new THREE.InstancedMesh(driftwoodGeo, driftwoodMat, 65);
  for (let i = 0; i < 65; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 93 + random() * 9;
    dummy.position.set(Math.cos(angle) * radius, .12, Math.sin(angle) * radius);
    dummy.rotation.set(Math.PI / 2 + (random() - .5) * .2, random() * Math.PI * 2, 0);
    dummy.scale.setScalar(.4 + random() * 1.1);
    dummy.updateMatrix();
    driftwood.setMatrixAt(i, dummy.matrix);
  }
  driftwood.instanceMatrix.needsUpdate = true;
  terrain.add(driftwood);

  const atmosphere = createAtmosphere(scene, random);
  return { water: sea, waterMaterial, atmosphere };
}
