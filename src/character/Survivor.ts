import * as THREE from 'three';
import { createTool } from '../items/Tools';

const mat = (color: number, roughness = .85) =>
  new THREE.MeshStandardMaterial({ color, roughness });
const skin = mat(0xb98969), jacket = mat(0x455c4a),
  trim = mat(0x283b32), pants = mat(0x353d3b),
  leather = mat(0x65503c), hair = mat(0x302820),
  metal = mat(0x91999a, .4);

function mesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material,
  x: number, y: number, z: number) {
  const object = new THREE.Mesh(geo, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  parent.add(object);
  return object;
}

export class Survivor {
  readonly root = new THREE.Group();
  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly leftLeg = new THREE.Group();
  private readonly rightLeg = new THREE.Group();
  private readonly axe: THREE.Group;
  private readonly pickaxe: THREE.Group;
  private swing = 0;
  private phase = 0;
  private blend = 0;

  constructor() {
    const body = this.root;
    mesh(body, new THREE.CapsuleGeometry(.34, .55, 6, 12), jacket, 0, 1.48, 0);
    mesh(body, new THREE.CylinderGeometry(.29, .32, .28, 12), pants, 0, 1.04, 0);
    mesh(body, new THREE.CylinderGeometry(.12, .13, .2, 10), skin, 0, 2.04, 0);
    mesh(body, new THREE.SphereGeometry(.27, 18, 14), skin, 0, 2.27, 0);
    mesh(body, new THREE.SphereGeometry(.274, 18, 12, 0, Math.PI * 2, 0, 1.13),
      hair, 0, 2.32, 0);
    mesh(body, new THREE.BoxGeometry(.57, .55, .22), leather, 0, 1.49, .33);
    mesh(body, new THREE.BoxGeometry(.67, .12, .15), trim, 0, 1.85, 0);
    mesh(body, new THREE.BoxGeometry(.55, .09, .36), leather, 0, 1.13, 0);
    for (const x of [-.11, .11])
      mesh(body, new THREE.SphereGeometry(.023, 8, 6), hair, x, 2.29, -.26);
    mesh(body, new THREE.BoxGeometry(.14, .045, .055), leather, 0, 2.12, -.267);
    this.leftArm.position.set(-.48, 1.86, 0);
    this.rightArm.position.set(.48, 1.86, 0);
    this.leftLeg.position.set(-.21, 1.02, 0);
    this.rightLeg.position.set(.21, 1.02, 0);
    for (const limb of [this.leftArm, this.rightArm, this.leftLeg, this.rightLeg])
      body.add(limb);
    for (const arm of [this.leftArm, this.rightArm]) {
      mesh(arm, new THREE.CapsuleGeometry(.13, .48, 5, 10), jacket, 0, -.32, 0);
      mesh(arm, new THREE.BoxGeometry(.25, .15, .25), trim, 0, -.65, 0);
      mesh(arm, new THREE.CapsuleGeometry(.1, .12, 4, 8), skin, 0, -.78, 0);
    }
    for (const leg of [this.leftLeg, this.rightLeg]) {
      mesh(leg, new THREE.CapsuleGeometry(.15, .62, 5, 10), pants, 0, -.41, 0);
      mesh(leg, new THREE.BoxGeometry(.3, .25, .45), leather, 0, -.87, -.09);
      mesh(leg, new THREE.BoxGeometry(.31, .045, .46), metal, 0, -.99, -.09);
    }
    const hand = new THREE.Group();
    hand.position.set(0, -.83, -.08);
    this.rightArm.add(hand);
    this.axe = createTool(hand, 'axe');
    this.pickaxe = createTool(hand, 'pickaxe');
  }

  attack(): boolean {
    if (this.swing > 0) return false;
    this.swing = .48;
    return true;
  }

  update(dt: number, moving: boolean, running: boolean, tool: number) {
    this.blend = THREE.MathUtils.damp(this.blend, moving ? 1 : 0, 9, dt);
    this.phase += dt * (running ? 12 : 8);
    const stride = Math.sin(this.phase) * this.blend * (running ? .75 : .52);
    this.leftLeg.rotation.x = stride;
    this.rightLeg.rotation.x = -stride;
    this.leftArm.rotation.x = -stride * .7;
    this.rightArm.rotation.x = stride * .7;
    if (this.swing > 0) {
      this.swing = Math.max(0, this.swing - dt);
      const progress = 1 - this.swing / .48;
      this.rightArm.rotation.x = -.4 - Math.sin(progress * Math.PI) * 1.65;
      this.rightArm.rotation.z = -.18;
    } else this.rightArm.rotation.z = 0;
    this.axe.visible = tool === 1;
    this.pickaxe.visible = tool === 2;
  }
}
