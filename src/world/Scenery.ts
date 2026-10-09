import { makeDetailedTree, makeDetailedRock, makeFallenLog, makeStump } from './DetailedAssets';
import * as THREE from 'three';

const materials = {
  cliff: new THREE.MeshStandardMaterial({ color: 0x777d71, roughness: 1, flatShading: true }),
  cliffLight: new THREE.MeshStandardMaterial({ color: 0xa2a18c, roughness: 1, flatShading: true }),
  forest: new THREE.MeshStandardMaterial({ color: 0x38563c, roughness: 1, flatShading: true }),
  forestDark: new THREE.MeshStandardMaterial({ color: 0x2e4936, roughness: 1, flatShading: true }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x5e4937, roughness: 1 }),
  shrub: new THREE.MeshStandardMaterial({ color: 0x688047, roughness: 1 }),
  soil: new THREE.MeshStandardMaterial({ color: 0x655846, roughness: 1 }),
};

function add(parent: THREE.Object3D, geo: THREE.BufferGeometry,
  mat: THREE.Material, x: number, y: number, z: number) {
  const object = new THREE.Mesh(geo, mat);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function createScenery(scene: THREE.Scene, random: () => number) {
  const root = new THREE.Group();
  scene.add(root);
  const cliffGeo = new THREE.IcosahedronGeometry(1, 1);
  const distant = new THREE.Group();
  root.add(distant);

  // The mountainous backdrop sits beyond the playable island edge.
  for (let i = 0; i < 100; i++) {
    const angle = i / 100 * Math.PI * 2;
    const radius = 123 + random() * 28;
    const height = 9 + random() * 24;
    const cliff = add(distant, cliffGeo,
      random() > .45 ? materials.cliff : materials.cliffLight,
      Math.cos(angle) * radius, height * .32 - 2, Math.sin(angle) * radius);
    cliff.scale.set(7 + random() * 12, height * .7, 7 + random() * 13);
    cliff.rotation.set(random() * .3, random() * Math.PI, random() * .15);
  }

  // Small rock outcrops inside the island provide landmarks and cover.
  for (let i = 0; i < 145; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 20 + Math.sqrt(random()) * 71;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const count = 2 + Math.floor(random() * 4);
    for (let j = 0; j < count; j++) {
      const boulder = add(group, cliffGeo,
        random() > .6 ? materials.cliffLight : materials.cliff,
        (random() - .5) * 2, .4 + random() * .4, (random() - .5) * 2);
      boulder.scale.set(.5 + random() * 1.6, .35 + random() * 1.1, .6 + random() * 1.3);
      boulder.rotation.set(random(), random() * 6, random());
    }
    root.add(group);
  }

  // Instanced bushes keep the scene dense without a draw call per bush.
  const bushGeo = new THREE.IcosahedronGeometry(.65, 1);
  const bushCount = 1100;
  const bushes = new THREE.InstancedMesh(bushGeo, materials.shrub, bushCount);
  const dummy = new THREE.Object3D();
  const bushColors = [0x587144, 0x6b7e49, 0x435f3d, 0x80905a].map(x => new THREE.Color(x));
  for (let i = 0; i < bushCount; i++) {
    const a = random() * Math.PI * 2;
    const r = 13 + Math.sqrt(random()) * 78;
    dummy.position.set(Math.cos(a) * r, .34, Math.sin(a) * r);
    dummy.scale.set(.4 + random() * 1.1, .5 + random() * .8, .4 + random() * 1.1);
    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.updateMatrix();
    bushes.setMatrixAt(i, dummy.matrix);
    bushes.setColorAt(i, bushColors[Math.floor(random() * bushColors.length)]);
  }
  bushes.instanceMatrix.needsUpdate = true;
  if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
  bushes.castShadow = false;
  root.add(bushes);

  // Tree groves use shared geometries and instancing; these are scenery,
  // while harvestable trees remain independent objects.
  const trunkGeo = new THREE.CylinderGeometry(.12, .26, 3.5, 7);
  const crownGeo = new THREE.ConeGeometry(1.7, 3.8, 7);
  const treeCount = 650;
  const trunks = new THREE.InstancedMesh(trunkGeo, materials.trunk, treeCount);
  const crowns = new THREE.InstancedMesh(crownGeo, materials.forest, treeCount);
  const crownColors = [0x35583a, 0x446743, 0x294f38, 0x4b7049].map(x => new THREE.Color(x));
  for (let i = 0; i < treeCount; i++) {
    const a = random() * Math.PI * 2;
    const r = 27 + Math.sqrt(random()) * 60;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const size = .65 + random() * .85;
    dummy.position.set(x, 1.75 * size, z);
    dummy.scale.set(size, size, size);
    dummy.rotation.set(0, random() * Math.PI, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = 4.2 * size;
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);
    crowns.setColorAt(i, crownColors[Math.floor(random() * crownColors.length)]);
  }
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
  trunks.castShadow = false;
  crowns.castShadow = false;
  root.add(trunks, crowns);

  // Close-range hero assets: detailed branching silhouettes, fallen logs and stumps.
  // Keep counts bounded to protect mobile GPU budgets.
  for (let i = 0; i < 48; i++) {
    const a = random() * Math.PI * 2;
    const r = 18 + Math.sqrt(random()) * 69;
    const hero = makeDetailedTree(random, i % 5 === 0 ? 'oak' : i % 2 ? 'spruce' : 'pine');
    hero.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    root.add(hero);
  }
  for (let i = 0; i < 85; i++) {
    const a = random() * Math.PI * 2;
    const r = 15 + Math.sqrt(random()) * 75;
    const detail = i % 3 === 0 ? makeDetailedRock(random, .65 + random()) :
      i % 3 === 1 ? makeFallenLog(random) : makeStump(random);
    detail.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    detail.rotation.y = random() * Math.PI * 2;
    root.add(detail);
  }

  // Beach foam rings: transparent bands around the shoreline.
  const foamMaterial = new THREE.MeshBasicMaterial({
    color: 0xd6e6dc, transparent: true, opacity: .28,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const foam = new THREE.Group();
  root.add(foam);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(102 + i * 1.7,
      102.25 + i * 1.7, 192), foamMaterial.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -.09 + i * .012;
    foam.add(ring);
  }

  // Leaf litter and ground cover around the forest.
  const litter = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(.3, .18),
    new THREE.MeshStandardMaterial({
      color: 0x816d42, roughness: 1, side: THREE.DoubleSide,
    }),
    3200,
  );
  const litterColors = [0x8b784e, 0x695e3b, 0xa38c60, 0x53653b].map(x => new THREE.Color(x));
  for (let i = 0; i < 3200; i++) {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * 88;
    dummy.position.set(Math.cos(a) * r, .08, Math.sin(a) * r);
    dummy.rotation.set(-Math.PI / 2, 0, random() * 6.28);
    dummy.scale.setScalar(.4 + random() * 1.4);
    dummy.updateMatrix();
    litter.setMatrixAt(i, dummy.matrix);
    litter.setColorAt(i, litterColors[Math.floor(random() * litterColors.length)]);
  }
  litter.instanceMatrix.needsUpdate = true;
  if (litter.instanceColor) litter.instanceColor.needsUpdate = true;
  root.add(litter);

  return {
    update(time: number) {
      foam.children.forEach((child, index) => {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = .16 + .13 * (1 + Math.sin(time * .8 + index * 1.6)) * .5;
        mesh.scale.setScalar(1 + Math.sin(time * .55 + index) * .003);
      });
    },
  };
}
