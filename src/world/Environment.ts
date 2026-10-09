import * as THREE from 'three';

/**
 * Mobile-first coastal biome. Keep the playable ground at y=0 until
 * character movement and resource placement support terrain heights.
 */
export function createEnvironment(scene: THREE.Scene, random: () => number) {
  const terrain = new THREE.Group();
  scene.add(terrain);

  const sand = new THREE.MeshStandardMaterial({ color: 0xc9b68c, roughness: 1 });
  const grass = new THREE.MeshStandardMaterial({ color: 0x526f39, roughness: 1 });
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

  return { water: sea, waterMaterial };
}
