import * as THREE from 'three';
export function createTool(parent:THREE.Group,kind:'axe'|'pickaxe'){
 const wood=new THREE.MeshStandardMaterial({color:0x70472c,roughness:.9});const steel=new THREE.MeshStandardMaterial({color:0x79858c,metalness:.7,roughness:.35});
 const root=new THREE.Group();parent.add(root);const handle=new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,.92,10),wood);handle.position.y=-.42;handle.castShadow=true;root.add(handle);
 const head=kind==='axe'?new THREE.Mesh(new THREE.BoxGeometry(.55,.24,.12),steel):new THREE.Mesh(new THREE.ConeGeometry(.16,.72,5),steel);
 head.position.set(kind==='axe'?.19:0,-.79,0);if(kind==='pickaxe')head.rotation.z=Math.PI/2;head.castShadow=true;root.add(head);return root;
}
