import * as THREE from 'three';

export function createAtmosphere(scene: THREE.Scene, random: () => number) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(650, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        horizon: { value: new THREE.Color(0xb9d7d1) },
        zenith: { value: new THREE.Color(0x528caf) },
      },
      vertexShader: `varying vec3 vDirection;
        void main() {
          vDirection = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `uniform vec3 horizon;
        uniform vec3 zenith;
        varying vec3 vDirection;
        void main() {
          float t = smoothstep(-0.18, 0.85, normalize(vDirection).y);
          gl_FragColor = vec4(mix(horizon, zenith, t), 1.0);
        }`,
    }),
  );
  sky.frustumCulled = false;
  scene.add(sky);

  const clouds = new THREE.Group();
  scene.add(clouds);
  const cloudMaterial = new THREE.MeshBasicMaterial({
    color: 0xf2f1e8, transparent: true, opacity: .46,
    depthWrite: false, fog: false,
  });
  const cloudGeo = new THREE.SphereGeometry(1, 8, 6);
  for (let i = 0; i < 34; i++) {
    const angle = random() * Math.PI * 2;
    const distance = 200 + random() * 210;
    const height = 55 + random() * 75;
    const cloud = new THREE.Group();
    cloud.position.set(Math.cos(angle) * distance, height, Math.sin(angle) * distance);
    const count = 3 + Math.floor(random() * 4);
    for (let j = 0; j < count; j++) {
      const puff = new THREE.Mesh(cloudGeo, cloudMaterial);
      puff.position.set((j - count / 2) * 13, random() * 4, random() * 8);
      puff.scale.set(14 + random() * 12, 3 + random() * 3, 7 + random() * 7);
      cloud.add(puff);
    }
    clouds.add(cloud);
  }
  return {
    update(dt: number, playerPosition: THREE.Vector3) {
      sky.position.copy(playerPosition);
      clouds.rotation.y += dt * .0006;
    },
  };
}

export function animateWater(water: THREE.Mesh, time: number) {
  const material = water.material as THREE.MeshStandardMaterial;
  material.emissive.setHex(0x062a30);
  material.emissiveIntensity = .14 + Math.sin(time * 1.8) * .035;
  water.position.y = -.17 + Math.sin(time * .8) * .035;
}
