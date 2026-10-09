import { Footsteps } from '../graphics/Footsteps';
import { SurvivalVitals } from './SurvivalVitals';
import { terrainHeight, terrainSlope } from '../world/Terrain';
import * as THREE from 'three';
import { createEnvironment } from '../world/Environment';
import { placement, createGhost } from '../building/Placement';
import { Survivor } from '../character/Survivor';
import { WorldClock } from '../world/WorldClock';
import { Weather } from '../world/Weather';
import { Wildlife } from '../world/Wildlife';
import { createScenery } from '../world/Scenery';
import { ExplorationHUD } from '../ui/ExplorationHUD';
import { makeTree, makeRock, HarvestEffects, destroyResource } from '../world/Resources';
import type { Harvestable } from '../world/Resources';
import { createTouchControls } from '../input/TouchControls';
import { applyQuality, defaultQuality } from '../graphics/Quality';
import type { Quality } from '../graphics/Quality';

type Node = Harvestable;
type Save={wood:number;stone:number;walls:{x:number;z:number;rot:number}[];foundations:{x:number;z:number}[]};
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<div id="hud"><div class="top"><div class="brand">ISLAND <span>//</span> SURVIVAL</div><div class="pill">ALPHA 0.3 · ОДИНОЧНЫЙ МИР</div></div><div class="help"><b>W A S D</b> — движение<br><b>Мышь</b> — осмотр<br><b>ЛКМ</b> — добывать ресурс<br><b>1</b> — топор · <b>2</b> — кирка<br><b>I</b> — инвентарь · <b>B</b> — стройка<br><b>E</b> — построить · <b>ESC</b> — курсор</div><div class="crosshair">+</div><div id="prompt" class="prompt">Найдите дерево или камень</div><div id="toast" class="toast"></div><div class="stats"><div class="stat"><small>ЗДОРОВЬЕ <span id="healthNum">100</span></small><div class="track"><div class="fill" style="width:100%"></div></div></div><div class="stat"><small>ВОДА <span id="waterNum">100</span></small><div class="track"><div id="waterBar" class="fill" style="width:100%"></div></div></div><div class="stat"><small>ЕДА <span id="foodNum">100</span></small><div class="track"><div id="foodBar" class="fill" style="width:100%"></div></div></div></div><div class="right"><div id="tool1" class="slot active">🪓<small>1 · ТОПОР</small></div><div id="tool2" class="slot">⛏️<small>2 · КИРКА</small></div><div id="buildSlot" class="slot">🏠<small>B · СТРОИТЬ</small></div></div><div id="panel" class="panel hidden"></div></div><div id="start"><div class="intro"><div class="brand">SURVIVAL SANDBOX · PROTOTYPE</div><h1>ISLAND</h1><p>Исследуйте остров. Рубите деревья, добывайте камень, стройте собственную базу. Ваш прогресс сохраняется в браузере.</p><button id="play" class="btn">НАЧАТЬ ВЫЖИВАНИЕ →</button><p style="font-size:12px">Для управления нужен компьютер с клавиатурой и мышью.</p></div></div>`;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x91c4d3);scene.fog=new THREE.FogExp2(0x91c4d3,.007);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,.1,700);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;app.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe0f5ff,0x6e7958,2.2));const sun=new THREE.DirectionalLight(0xffe3af,2.5);sun.position.set(80,110,40);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-120;sun.shadow.camera.right=120;sun.shadow.camera.top=120;sun.shadow.camera.bottom=-120;scene.add(sun);
const mat=(c:number)=>new THREE.MeshStandardMaterial({color:c,roughness:.9});const grass=mat(0x668d54),sand=mat(0xd1bd86),wood=mat(0x73543a),leaf=mat(0x356d3e),rockmat=mat(0x828985),building=mat(0x977655);
let seed=112233;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const environment=createEnvironment(scene,rand);
const scenery=createScenery(scene,rand);
const wildlife=new Wildlife(scene,rand);
const weather=new Weather(scene);
const worldClock=new WorldClock(scene,sun);
const exploration=new ExplorationHUD(document.querySelector<HTMLElement>('#hud')!);
let quality:Quality=defaultQuality();
applyQuality(renderer,sun,quality);
const survivor=new Survivor();
const footsteps=new Footsteps(scene);
const player=survivor.root;
scene.add(player);
player.position.set(0,0,8);
let swingTime=0;
function animateCharacter(dt:number,moving:boolean,running:boolean){
  survivor.update(dt,moving,running,tool);
  swingTime=Math.max(0,swingTime-dt);
}
const nodes:Node[]=[];
const harvestEffects = new HarvestEffects(scene);
function tree(x:number,z:number){const node=makeTree(x,z,rand);scene.add(node.mesh);nodes.push(node)}
function rock(x:number,z:number){const node=makeRock(x,z,rand);scene.add(node.mesh);nodes.push(node)}
for(let i=0;i<100;i++){const x=(rand()-.5)*160,z=(rand()-.5)*160;if(Math.hypot(x,z)<17)continue;(rand()<.73?tree:rock)(x,z)}for(let i=0;i<12;i++){const a=i*2.4;tree(Math.cos(a)* (17+i*2),Math.sin(a)*(17+i*2))}for(let i=0;i<8;i++){const a=i*3.7;rock(Math.cos(a)* (13+i*3),Math.sin(a)*(13+i*3))}
const saved=(()=>{try{return JSON.parse(localStorage.getItem('island-save-v1')||'null') as Save|null}catch{return null}})();let resources={wood:saved?.wood??0,stone:saved?.stone??0};let foundations=saved?.foundations??[];let walls=saved?.walls??[];
function foundation(x:number,z:number){const m=new THREE.Mesh(new THREE.BoxGeometry(4,.32,4),building);m.position.set(x,.16,z);m.receiveShadow=true;m.castShadow=true;scene.add(m)}function wall(x:number,z:number,rot:number){const m=new THREE.Mesh(new THREE.BoxGeometry(4,3,.25),building);m.position.set(x,1.65,z);m.rotation.y=rot;m.castShadow=true;scene.add(m)}foundations.forEach(v=>foundation(v.x,v.z));walls.forEach(v=>wall(v.x,v.z,v.rot));
function save(){localStorage.setItem('island-save-v1',JSON.stringify({...resources,foundations,walls}))}let toastTimeout=0;function toast(msg:string){const el=document.querySelector<HTMLElement>('#toast')!;el.textContent=msg;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=window.setTimeout(()=>el.classList.remove('show'),2300)}
const ghost=createGhost(scene);
const touchDevice=matchMedia('(pointer: coarse)').matches;
const panel=document.querySelector<HTMLElement>('#panel')!;let openPanel='' ;let tool=1;let buildMode=false;let buildType:'foundation'|'wall'='foundation';
type Item={id:string;label:string;icon:string;count:number};
const inventory:Item[]=[{id:'axe',label:'Топор',icon:'🪓',count:1},{id:'pickaxe',label:'Кирка',icon:'⛏️',count:1}];
function inventoryItems(){return [...inventory,{id:'wood',label:'Древесина',icon:'🪵',count:resources.wood},{id:'stone',label:'Камень',icon:'🪨',count:resources.stone}].filter(i=>i.count>0)}
let selectedSlot=0;
function renderPanel(){if(!openPanel){panel.classList.add('hidden');panel.classList.remove('fullscreen');return}panel.classList.remove('hidden');panel.classList.toggle('fullscreen',openPanel==='inventory');
if(openPanel==='inventory'){
const items=inventoryItems();panel.innerHTML=`<div class="bag-head"><div><span class="bag-kicker">SURVIVAL / ИНВЕНТАРЬ</span><h2>РЮКЗАК</h2><p>24 слота · предметы и ресурсы</p></div><button id="closeBtn" class="bag-close">✕ ЗАКРЫТЬ [I]</button></div><div class="bag-layout"><div class="bag-grid">${Array.from({length:24},(_,i)=>{const item=items[i];return `<button class="bag-slot ${selectedSlot===i?'selected':''}" data-slot="${i}" ${item?'':'aria-label="Пустой слот"'}>${item?`<span class="item-icon">${item.icon}</span><span class="item-count">${item.count}</span><span class="item-label">${item.label}</span>`:'<span class="empty-dot">·</span>'}</button>`}).join('')}</div><aside class="bag-details"><div class="details-title">ПРЕДМЕТ</div>${items[selectedSlot]?`<div class="details-icon">${items[selectedSlot].icon}</div><h3>${items[selectedSlot].label}</h3><p>Количество: ${items[selectedSlot].count}</p>${items[selectedSlot].id==='axe'||items[selectedSlot].id==='pickaxe'?`<button id="equipBtn" class="btn">ВЗЯТЬ В РУКИ</button>`:''}`:'<p>Выберите предмет в рюкзаке</p>'}<div class="bag-tip">Нажмите на слот, чтобы посмотреть предмет. Клавиши 1 и 2 переключают инструменты.</div></aside></div>`;
panel.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(b=>b.addEventListener('click',()=>{selectedSlot=Number(b.dataset.slot);renderPanel()}));panel.querySelector('#equipBtn')?.addEventListener('click',()=>{const id=items[selectedSlot]?.id;if(id==='axe'||id==='pickaxe'){tool=id==='axe'?1:2;buildMode=false;updateSlots();openPanel='';renderPanel()}})
}else{panel.innerHTML=`<h3>СТРОИТЕЛЬСТВО</h3><div class="resource">🪵 Дерево <strong>${resources.wood}</strong></div><div class="resource">🪨 Камень <strong>${resources.stone}</strong></div><p>Выберите конструкцию и нажмите E после закрытия меню.</p><button id="foundationBtn" class="btn ${buildType==='foundation'?'':'secondary'}">Фундамент · 10 дерева</button><button id="wallBtn" class="btn ${buildType==='wall'?'':'secondary'}">Стена · 6 дерева, 2 камня</button><button id="closeBtn" class="btn secondary">ЗАКРЫТЬ</button>`;panel.querySelector('#foundationBtn')?.addEventListener('click',()=>{buildType='foundation';renderPanel()});panel.querySelector('#wallBtn')?.addEventListener('click',()=>{buildType='wall';renderPanel()})}
panel.querySelector('#closeBtn')?.addEventListener('click',()=>{openPanel='';renderPanel()})}
function updateSlots(){document.querySelector('#tool1')?.classList.toggle('active',!buildMode&&tool===1);document.querySelector('#tool2')?.classList.toggle('active',!buildMode&&tool===2);document.querySelector('#buildSlot')?.classList.toggle('active',buildMode)}
let yaw=0,pitch=.25,locked=false,started=false;const keys=new Set<string>();const temp=new THREE.Vector3();
function target(){let best:Node|null=null,dist=4.5;for(const n of nodes){const d=player.position.distanceTo(n.mesh.position);if(d<dist){best=n;dist=d}}return best}
function hit(){if(!buildMode&&swingTime>0)return;if(!buildMode){if(!survivor.attack())return;swingTime=.48;}if(buildMode){place();return}const n=target();if(!n){toast('Подойдите ближе к дереву или камню');return}if((n.kind==='tree'&&tool!==1)||(n.kind==='rock'&&tool!==2)){toast(n.kind==='tree'?'Нужен топор (1)':'Нужна кирка (2)');return}n.hp--;
harvestEffects.impact(n);
if(n.hp<=0){
  const count=n.kind==='tree'?8:6;
  resources[n.kind==='tree'?'wood':'stone']+=count;
  nodes.splice(nodes.indexOf(n),1);
  destroyResource(n,scene,player.position);
 toast(`+${count} ${n.kind==='tree'?'дерева':'камня'}`);save();renderPanel()}else toast('Удар! Еще '+n.hp)}
function place(){const p=placement(buildType,player.position,yaw,foundations,walls);if(!p.valid){toast(buildType==='wall'?'Стена должна крепиться к краю фундамента':'Здесь нельзя строить');return}if(buildType==='foundation'){if(resources.wood<10){toast('Нужно 10 дерева');return}resources.wood-=10;foundations.push({x:p.x,z:p.z});foundation(p.x,p.z)}else{if(resources.wood<6||resources.stone<2){toast('Нужно 6 дерева и 2 камня');return}resources.wood-=6;resources.stone-=2;walls.push({x:p.x,z:p.z,rot:p.rot});wall(p.x,p.z,p.rot)}toast('Постройка установлена');save();renderPanel()}
function toggleStart(show:boolean){document.querySelector('#start')?.classList.toggle('hidden',!show)}document.querySelector('#play')?.addEventListener('click',()=>{if(touchDevice){started=true;toggleStart(false)}else renderer.domElement.requestPointerLock()});renderer.domElement.addEventListener('click',()=>{if(touchDevice)return;if(!locked){renderer.domElement.requestPointerLock();return}if(!openPanel)hit()});document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;if(locked)started=true;toggleStart(!started);if(locked){openPanel='';renderPanel()}});document.addEventListener('mousemove',e=>{if(!locked)return;yaw-=e.movementX*.0025;pitch=THREE.MathUtils.clamp(pitch+e.movementY*.002,-.45,1.0)});
const touch=createTouchControls({
  look(dx,dy){yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch+dy*.003,-.45,1)},
  attack(){if(!openPanel)hit()},
  inventory(){openPanel=openPanel==='inventory'?'':'inventory';renderPanel()},
  build(){buildMode=true;openPanel=openPanel==='build'?'':'build';updateSlots();renderPanel()},
  place(){if(buildMode&&!openPanel)place()},
  axe(){tool=1;buildMode=false;updateSlots()},
  pickaxe(){tool=2;buildMode=false;updateSlots()},
});
document.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='Digit1'){tool=1;buildMode=false;updateSlots()}if(e.code==='Digit2'){tool=2;buildMode=false;updateSlots()}if(e.code==='KeyI'||e.code==='KeyB'){const next=e.code==='KeyI'?'inventory':'build';openPanel=openPanel===next?'':next;if(e.code==='KeyB')buildMode=true;updateSlots();renderPanel();if(openPanel&&document.pointerLockElement)document.exitPointerLock()}if(e.code==='KeyE'&&buildMode&&!openPanel)place()});document.addEventListener('keyup',e=>keys.delete(e.code));
let verticalVelocity=0;
let grounded=true;
const vitals=new SurvivalVitals();
const stats=document.querySelector<HTMLElement>('.stats')!;
const staminaStat=document.createElement('div');
staminaStat.className='stat';
staminaStat.innerHTML='<small>ВЫНОСЛИВОСТЬ <span id="staminaNum">100</span></small><div class="track"><div id="staminaBar" class="fill" style="width:100%"></div></div>';
stats.append(staminaStat);
const tempStat=document.createElement('div');
tempStat.className='stat';
tempStat.innerHTML='<small>ТЕМПЕРАТУРА <span id="tempNum">36.8°C</span></small><div class="track"><div id="tempBar" class="fill" style="width:50%"></div></div>';
stats.append(tempStat);const clock=new THREE.Clock();let elapsed=0;function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);harvestEffects.update(dt);
const storm=weather.update(dt,player.position);
const timeState=worldClock.update(dt,storm);
environment.atmosphere.setDaylight(timeState.daylight,storm);
exploration.update(player.position,yaw,timeState.time,storm);
wildlife.update(dt,player.position);
scenery.update(elapsed);
if((locked||touchDevice&&started)&&!openPanel){const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));const move=new THREE.Vector3();if(keys.has('KeyW'))move.add(forward);if(keys.has('KeyS'))move.sub(forward);if(keys.has('KeyD'))move.add(right);if(keys.has('KeyA'))move.sub(right);if(touchDevice){move.addScaledVector(forward,touch.y);move.addScaledVector(right,touch.x)}const moving=move.lengthSq()>0;if(moving){
const direction=move.normalize();
const nextX=player.position.x+direction.x*dt*((keys.has('ShiftLeft')||touch.sprint)&&vitals.canSprint()?10:6);
const nextZ=player.position.z+direction.z*dt*(keys.has('ShiftLeft')||touch.sprint?10:6);
const nextHeight=terrainHeight(nextX,nextZ);
const climb=nextHeight-terrainHeight(player.position.x,player.position.z);
if(terrainSlope(nextX,nextZ)<.83&&climb<dt*7){player.position.x=nextX;player.position.z=nextZ;}
}animateCharacter(dt,moving,(keys.has('ShiftLeft')||touch.sprint)&&vitals.canSprint());
footsteps.update(dt,player.position,yaw,moving,(keys.has('ShiftLeft')||touch.sprint)&&vitals.canSprint(),grounded);if(keys.has('Space')&&grounded){verticalVelocity=6.3;grounded=false;}
verticalVelocity-=18*dt;
player.position.y+=verticalVelocity*dt;
const groundY=terrainHeight(player.position.x,player.position.z);
if(player.position.y<=groundY){player.position.y=groundY;verticalVelocity=0;grounded=true;}
player.position.x=THREE.MathUtils.clamp(player.position.x,-98,98);player.position.z=THREE.MathUtils.clamp(player.position.z,-98,98);player.rotation.y=yaw;elapsed+=dt;const r=Math.hypot(player.position.x,player.position.z);
const swimming=r>101&&player.position.y<.5;
const v=vitals.update(dt,{
  moving:keys.has('KeyW')||keys.has('KeyA')||keys.has('KeyS')||keys.has('KeyD')||Math.abs(touch.x)+Math.abs(touch.y)>.1,
  sprinting:(keys.has('ShiftLeft')||touch.sprint)&&vitals.canSprint(),
  swimming,storm,daylight:timeState.daylight,
});
document.querySelector('#foodNum')!.textContent=String(Math.ceil(v.hunger));
document.querySelector('#waterNum')!.textContent=String(Math.ceil(v.hydration));
document.querySelector('#healthNum')!.textContent=String(Math.ceil(v.health));
document.querySelector('#staminaNum')!.textContent=String(Math.ceil(v.stamina));
document.querySelector('#tempNum')!.textContent=v.temperature.toFixed(1)+'°C';
document.querySelector<HTMLElement>('#foodBar')!.style.width=v.hunger+'%';
document.querySelector<HTMLElement>('#waterBar')!.style.width=v.hydration+'%';
document.querySelector<HTMLElement>('#staminaBar')!.style.width=v.stamina+'%';
document.querySelector<HTMLElement>('#tempBar')!.style.width=THREE.MathUtils.clamp((v.temperature-32)*12,0,100)+'%';
const p=placement(buildType,player.position,yaw,foundations,walls);ghost.update(buildType,p,buildMode);environment.oceanSurface.update(dt,sun);const n=target();document.querySelector('#prompt')!.textContent=buildMode?`Стройка: ${buildType==='foundation'?'фундамент':'стена'} · E — установить`:n?`${n.kind==='tree'?'ДЕРЕВО · ТОПОР':'КАМЕНЬ · КИРКА'} · ЛКМ — добыть`:'Исследуйте остров · I — рюкзак · B — стройка'}camera.position.copy(player.position).add(new THREE.Vector3(Math.sin(yaw)*6,4+pitch*5,Math.cos(yaw)*6));temp.copy(player.position).add(new THREE.Vector3(0,1.6,0));camera.lookAt(temp);environment.atmosphere.update(dt,player.position);renderer.render(scene,camera)}animate();window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
const qualityButton=document.createElement('button');qualityButton.id='quality-button';qualityButton.textContent='ГРАФИКА: '+quality.toUpperCase();document.querySelector('#hud')?.append(qualityButton);qualityButton.addEventListener('click',()=>{quality=quality==='high'?'medium':quality==='medium'?'low':'high';applyQuality(renderer,sun,quality);qualityButton.textContent='ГРАФИКА: '+quality.toUpperCase()});
