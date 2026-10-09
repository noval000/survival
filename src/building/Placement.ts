import * as THREE from 'three';
export type Foundation={x:number;z:number};export type Wall={x:number;z:number;rot:number};
export type Placement={x:number;z:number;rot:number;valid:boolean};
export function placement(type:'foundation'|'wall',position:THREE.Vector3,yaw:number,foundations:Foundation[],walls:Wall[]):Placement{
 const dir=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));const aim=position.clone().addScaledVector(dir,5);
 if(type==='foundation'){
  const x=Math.round(aim.x/4)*4,z=Math.round(aim.z/4)*4;
  return {x,z,rot:0,valid:Math.hypot(x,z)<90&&!foundations.some(f=>f.x===x&&f.z===z)};
 }
 let best:Placement|null=null,dist=Infinity;
 for(const f of foundations){for(let edge=0;edge<4;edge++){
  const x=f.x+(edge===0?2:edge===1?-2:0),z=f.z+(edge===2?2:edge===3?-2:0),rot=edge<2?Math.PI/2:0;
  const d=Math.hypot(x-aim.x,z-aim.z);if(d<dist){dist=d;best={x,z,rot,valid:d<3.5&&!walls.some(w=>Math.abs(w.x-x)<.1&&Math.abs(w.z-z)<.1)}};
 }}return best??{x:aim.x,z:aim.z,rot:0,valid:false};
}
export function createGhost(scene:THREE.Scene){const material=new THREE.MeshBasicMaterial({color:0x33ee79,transparent:true,opacity:.37,depthWrite:false});const mesh=new THREE.Mesh(new THREE.BoxGeometry(4,.32,4),material);mesh.visible=false;scene.add(mesh);return {mesh,material,update(type:'foundation'|'wall',p:Placement,active:boolean){mesh.visible=active;mesh.geometry.dispose();mesh.geometry=new THREE.BoxGeometry(4,type==='foundation'?.32:3,type==='foundation'?4:.25);mesh.position.set(p.x,type==='foundation'?.16:1.65,p.z);mesh.rotation.y=p.rot;material.color.setHex(p.valid?0x30ff73:0xff4444)}}}
