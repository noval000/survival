import * as THREE from 'three';
export function createEnvironment(scene: THREE.Scene, random:()=>number) {
  const terrain = new THREE.Group();scene.add(terrain);
  const sand = new THREE.MeshStandardMaterial({color:0xc9b487,roughness:1});
  const grass = new THREE.MeshStandardMaterial({color:0x577b3e,roughness:1});
  const waterMaterial = new THREE.MeshPhysicalMaterial({color:0x26819b,metalness:.12,roughness:.21,transparent:true,opacity:.83,clearcoat:.7});
  const shore=new THREE.Mesh(new THREE.CircleGeometry(104,96),sand);shore.rotation.x=-Math.PI/2;shore.position.y=.022;shore.receiveShadow=true;terrain.add(shore);
  const inner=new THREE.Mesh(new THREE.CircleGeometry(94,96),grass);inner.rotation.x=-Math.PI/2;inner.position.y=.045;inner.receiveShadow=true;terrain.add(inner);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(1200,1200,32,32),waterMaterial);sea.rotation.x=-Math.PI/2;sea.position.y=-.17;sea.receiveShadow=true;terrain.add(sea);
  const bladeGeo=new THREE.ConeGeometry(.035,.32,3);bladeGeo.translate(0,.16,0);
  const bladeMat=new THREE.MeshStandardMaterial({color:0x77984c,side:THREE.DoubleSide,roughness:1});
  const blades=new THREE.InstancedMesh(bladeGeo,bladeMat,8000);const dummy=new THREE.Object3D();
  for(let i=0;i<8000;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*90;dummy.position.set(Math.cos(a)*r,.06,Math.sin(a)*r);dummy.rotation.y=random()*Math.PI;dummy.rotation.z=(random()-.5)*.5;dummy.scale.setScalar(.6+random()*1.6);dummy.updateMatrix();blades.setMatrixAt(i,dummy.matrix)}blades.instanceMatrix.needsUpdate=true;terrain.add(blades);
  const pebbleGeo=new THREE.IcosahedronGeometry(.12,0);const pebbleMat=new THREE.MeshStandardMaterial({color:0x9b9588,roughness:1});const pebbles=new THREE.InstancedMesh(pebbleGeo,pebbleMat,650);
  for(let i=0;i<650;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*101;dummy.position.set(Math.cos(a)*r,.09,Math.sin(a)*r);dummy.scale.setScalar(.4+random()*2);dummy.rotation.set(random()*2,random()*6,random()*2);dummy.updateMatrix();pebbles.setMatrixAt(i,dummy.matrix)}pebbles.instanceMatrix.needsUpdate=true;terrain.add(pebbles);
  return {water:sea,waterMaterial};
}
