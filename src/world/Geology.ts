import * as THREE from 'three';
import { terrainHeight } from './Terrain';

export type DepositKind = 'stone' | 'iron' | 'sulfur';
export type GeologicalZone = 'mountain' | 'mine' | 'volcanic';

/** Fixed, discoverable resource landmarks. No free-form terrain digging. */
export const GEOLOGICAL_SITES = [
  { x: -52, z: -38, radius: 19, zone: 'mountain' as const, name: 'Каменный хребет' },
  { x: 56, z: -34, radius: 16, zone: 'mine' as const, name: 'Старая шахта' },
  { x: 46, z: 51, radius: 18, zone: 'volcanic' as const, name: 'Серные источники' },
];

export function createGeologicalSites(scene: THREE.Scene, random: () => number,
  addDeposit: (x: number, z: number, kind: DepositKind) => void) {
  const rock = new THREE.MeshStandardMaterial({ color: 0x747874, roughness: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x383d3b, roughness: 1 });
  const sulfur = new THREE.MeshStandardMaterial({ color: 0xc5a840, roughness: .9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x61472e, roughness: 1 });
  for (const site of GEOLOGICAL_SITES) {
    const center = new THREE.Group();
    center.position.set(site.x, terrainHeight(site.x, site.z), site.z);
    center.name = site.name;
    scene.add(center);
    if (site.zone === 'mountain') {
      for (let i = 0; i < 11; i++) {
        const angle = random() * Math.PI * 2;
        const distance = 3 + random() * 13;
        const peak = new THREE.Mesh(new THREE.ConeGeometry(2.5 + random() * 2, 7 + random() * 8, 6), rock);
        peak.position.set(Math.cos(angle) * distance, 2.7, Math.sin(angle) * distance);
        peak.rotation.y = random() * Math.PI;
        peak.castShadow = true;
        center.add(peak);
      }
    } else if (site.zone === 'mine') {
      const entrance = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 1.3), rock);
      entrance.position.y = 2.5;
      center.add(entrance);
      const opening = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.8), dark);
      opening.position.set(0, 2.05, 0.7);
      center.add(opening);
      for (const x of [-2.8, 2.8]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(.45, 4.4, .55), wood);
        beam.position.set(x, 2.2, .9);
        center.add(beam);
      }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.2, .45, .65), wood);
      lintel.position.set(0, 4.4, .9);
      center.add(lintel);
    } else {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(8, 9, 12), rock);
      cone.position.y = 3;
      center.add(cone);
      const crater = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2, .2, 12), sulfur);
      crater.position.y = 7.55;
      center.add(crater);
    }
    const amount = site.zone === 'mountain' ? 13 : 10;
    for (let i = 0; i < amount; i++) {
      const a = random() * Math.PI * 2;
      const d = 5 + random() * (site.radius - 6);
      const x = site.x + Math.cos(a) * d;
      const z = site.z + Math.sin(a) * d;
      const kind: DepositKind = site.zone === 'mountain' ? 'stone'
        : site.zone === 'volcanic' ? 'sulfur' : random() < .75 ? 'iron' : 'stone';
      addDeposit(x, z, kind);
    }
  }
}
