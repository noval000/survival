import * as THREE from 'three';

type Animal = {
  root: THREE.Group;
  legs: THREE.Group[];
  heading: number;
  speed: number;
  phase: number;
  home: THREE.Vector3;
};
const fur = new THREE.MeshStandardMaterial({ color: 0x997a54, roughness: 1 });
const furDark = new THREE.MeshStandardMaterial({ color: 0x5b4738, roughness: 1 });
const eyes = new THREE.MeshStandardMaterial({ color: 0x151511, roughness: .5 });
const bodyGeo = new THREE.SphereGeometry(1, 12, 8);
const legGeo = new THREE.CapsuleGeometry(.10, .4, 4, 6);

export class Wildlife {
  private animals: Animal[] = [];
  constructor(scene: THREE.Scene, random: () => number, count = 14) {
    for (let i = 0; i < count; i++) {
      const root = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, fur);
      body.position.y = .86;
      body.scale.set(.85, .45, .36);
      body.castShadow = true;
      root.add(body);
      const head = new THREE.Mesh(bodyGeo, furDark);
      head.position.set(.7, 1.05, 0);
      head.scale.set(.27, .27, .26);
      head.castShadow = true;
      root.add(head);
      for (const z of [-.18, .18]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(.038, 6, 5), eyes);
        eye.position.set(.89, 1.1, z);
        root.add(eye);
        const ear = new THREE.Mesh(new THREE.ConeGeometry(.10, .32, 5), fur);
        ear.position.set(.69, 1.37, z);
        root.add(ear);
      }
      const legs: THREE.Group[] = [];
      for (const x of [-.5, .5]) for (const z of [-.24, .24]) {
        const pivot = new THREE.Group();
        pivot.position.set(x, .65, z);
        const leg = new THREE.Mesh(legGeo, furDark);
        leg.position.y = -.31;
        leg.castShadow = true;
        pivot.add(leg);
        root.add(pivot);
        legs.push(pivot);
      }
      const angle = random() * Math.PI * 2;
      const radius = 28 + random() * 55;
      root.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      const animal: Animal = {
        root, legs, heading: random() * Math.PI * 2,
        speed: .5 + random() * .6, phase: random() * 10,
        home: root.position.clone(),
      };
      this.animals.push(animal);
      scene.add(root);
    }
  }

  update(dt: number, player: THREE.Vector3) {
    for (const animal of this.animals) {
      const distance = animal.root.position.distanceTo(player);
      if (distance > 120) {
        animal.root.visible = false;
        continue;
      }
      animal.root.visible = true;
      animal.phase += dt * 4;
      const fromHome = animal.root.position.clone().sub(animal.home);
      if (fromHome.length() > 18) {
        animal.heading = Math.atan2(-fromHome.z, -fromHome.x);
      } else if (distance < 12) {
        const away = animal.root.position.clone().sub(player);
        animal.heading = Math.atan2(away.z, away.x);
      } else {
        animal.heading += Math.sin(animal.phase * .17) * dt * .3;
      }
      const speed = distance < 12 ? animal.speed * 3 : animal.speed;
      animal.root.position.x += Math.cos(animal.heading) * speed * dt;
      animal.root.position.z += Math.sin(animal.heading) * speed * dt;
      animal.root.rotation.y = -animal.heading;
      animal.legs.forEach((leg, i) => {
        leg.rotation.z = Math.sin(animal.phase * (distance < 12 ? 2.4 : 1) + i * Math.PI * .7) * .45;
      });
    }
  }
}
