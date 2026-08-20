import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const state = {
  wood: 180, stone: 120, food: 220, coin: 250, iron: 0, tool: 6,
  pop: 7, housing: 8, happy: 78, day: 12, hour: 10, season: 0, year: 1, speed: 1,
  buildings: []
};
const seasons = ['春季','夏季','秋季','冬季'];
const BUILD = {
  house:{name:'木屋',icon:'🏠',wood:22,stone:8},
  lumber:{name:'伐木场',icon:'🪵',wood:26,stone:8},
  quarry:{name:'采石场',icon:'🪨',wood:20,stone:12},
  farm:{name:'农田',icon:'🌾',wood:12,stone:0},
  barn:{name:'仓库',icon:'📦',wood:35,stone:18},
  mill:{name:'磨坊',icon:'🌬️',wood:42,stone:24},
  market:{name:'市场',icon:'⛺',wood:38,stone:16},
  blacksmith:{name:'铁匠铺',icon:'⚒️',wood:45,stone:35},
  school:{name:'学校',icon:'📚',wood:50,stone:30},
  clinic:{name:'诊所',icon:'⚕️',wood:48,stone:38},
  tavern:{name:'酒馆',icon:'🍺',wood:44,stone:20}
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x98bdc7);
scene.fog = new THREE.FogExp2(0xb6c9c7, 0.006);

const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.domElement.className = 'gameCanvas';
$('#game').prepend(renderer.domElement);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 500);
camera.position.set(56, 48, 66);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,0,0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 22;
controls.maxDistance = 110;
controls.maxPolarAngle = Math.PI * 0.48;
controls.mouseButtons = { LEFT:THREE.MOUSE.PAN, MIDDLE:THREE.MOUSE.DOLLY, RIGHT:THREE.MOUSE.ROTATE };

const hemi = new THREE.HemisphereLight(0xe8f4ff, 0x496044, 1.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffefd0, 4.2);
sun.position.set(36, 58, 28);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
scene.add(sun);

const world = new THREE.Group();
scene.add(world);
const interactables = [];
const villagers = [];
const windmills = [];

const mat = (color, rough=0.85) => new THREE.MeshStandardMaterial({ color, roughness:rough });
function makeMesh(geo, material, cast=true, receive=true){
  const m = new THREE.Mesh(geo, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

function addGround(){
  const geo = new THREE.PlaneGeometry(150, 120, 70, 56);
  const p = geo.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i), y=p.getY(i);
    let h = Math.sin(x*0.07)*1.7 + Math.cos(y*0.08)*1.3 + Math.sin((x+y)*0.04)*1.0;
    if(Math.abs(x+8)<8) h -= 2.2;
    h += Math.max(0,Math.abs(x)-50)*0.06 + Math.max(0,Math.abs(y)-42)*0.07;
    p.setZ(i,h);
  }
  geo.computeVertexNormals();
  const ground = makeMesh(geo, mat(0x6e9f51,0.98), false, true);
  ground.rotation.x = -Math.PI/2;
  world.add(ground);

  const water = makeMesh(new THREE.PlaneGeometry(15,120), new THREE.MeshPhysicalMaterial({color:0x4fa3bd,roughness:0.2,transparent:true,opacity:0.92}), false, true);
  water.rotation.x = -Math.PI/2;
  water.position.set(-8,0.15,0);
  world.add(water);

  const bridge = new THREE.Group();
  for(let z=-6; z<=6; z+=1.5){
    const plank = makeMesh(new THREE.BoxGeometry(18,0.4,1.1), mat(0x765034,1));
    plank.position.set(-8,1,z); bridge.add(plank);
  }
  world.add(bridge);

  const fall = makeMesh(new THREE.PlaneGeometry(8,10), new THREE.MeshBasicMaterial({color:0xa9e7f7,transparent:true,opacity:0.8,side:THREE.DoubleSide}), false, false);
  fall.position.set(-8,6,-43); fall.rotation.y = Math.PI/2; world.add(fall);
}

function addTree(x,z,s=1){
  const g = new THREE.Group();
  const trunk = makeMesh(new THREE.CylinderGeometry(0.25,0.4,2.4,7), mat(0x67462e,1));
  trunk.position.y = 1.2; g.add(trunk);
  for(let i=0;i<3;i++){
    const crown = makeMesh(new THREE.ConeGeometry((2.2-i*0.3)*s,3.0,8), mat(i%2?0x315f37:0x3f7541,0.95));
    crown.position.y = 2.7 + i*1.25; g.add(crown);
  }
  g.position.set(x,0,z); g.scale.setScalar(s); world.add(g);
}
function populateNature(){
  for(let i=0;i<145;i++){
    let x=(Math.random()-0.5)*140, z=(Math.random()-0.5)*106;
    if(Math.abs(x+8)<18 || Math.hypot(x,z)<27){ i--; continue; }
    addTree(x,z,0.7+Math.random()*0.65);
  }
  for(let i=0;i<50;i++){
    const r = makeMesh(new THREE.DodecahedronGeometry(0.5+Math.random()*1.4), mat(0x808787,1));
    r.position.set((Math.random()-0.5)*140,0.45,(Math.random()-0.5)*104);
    r.rotation.set(Math.random(),Math.random(),Math.random());
    world.add(r);
  }
}

function makeHouse(roofColor=0x9c5a3d, blue=false){
  const g=new THREE.Group();
  const base=makeMesh(new THREE.BoxGeometry(5.7,3.6,5),mat(0xc9b18d,0.92)); base.position.y=1.8; g.add(base);
  const roof=makeMesh(new THREE.ConeGeometry(4.3,2.5,4),mat(blue?0x356a88:roofColor,0.82)); roof.position.y=4.65; roof.rotation.y=Math.PI/4; roof.scale.z=0.82; g.add(roof);
  const door=makeMesh(new THREE.BoxGeometry(1.1,2.1,0.25),mat(0x59402c,1)); door.position.set(0,1.25,2.62); g.add(door);
  for(const x of [-1.7,1.7]){ const w=makeMesh(new THREE.BoxGeometry(0.8,0.85,0.22),new THREE.MeshStandardMaterial({color:0x8fd3e3,emissive:0x274c56,emissiveIntensity:0.22})); w.position.set(x,2,2.62); g.add(w); }
  const ch=makeMesh(new THREE.BoxGeometry(0.7,2,0.7),mat(0x76564a,1)); ch.position.set(1.8,5,-0.6); g.add(ch);
  return g;
}
function makeFarm(){
  const g=new THREE.Group();
  const soil=makeMesh(new THREE.BoxGeometry(8,0.25,6),mat(0x7d5a37,1)); soil.position.y=0.12; g.add(soil);
  for(let x=-3.2;x<=3.2;x+=0.8) for(let z=-2.2;z<=2.2;z+=0.8){ const c=makeMesh(new THREE.ConeGeometry(0.16,0.75,5),mat(0xc3a53e,0.9)); c.position.set(x,0.5,z); g.add(c); }
  return g;
}
function makeMill(){
  const g=makeHouse(0x986044);
  const tower=makeMesh(new THREE.CylinderGeometry(2.2,2.8,6,10),mat(0xc7b18c,0.92)); tower.position.y=3; g.add(tower);
  const blades=new THREE.Group();
  for(let i=0;i<4;i++){ const b=makeMesh(new THREE.BoxGeometry(0.45,5.8,0.2),mat(0xb99c70,0.9)); b.position.y=2.9; b.rotation.z=i*Math.PI/2; blades.add(b); }
  blades.position.set(0,4.3,3); blades.name='blades'; g.add(blades); windmills.push(blades); return g;
}
function makeMarket(){
  const g=new THREE.Group(); const base=makeMesh(new THREE.BoxGeometry(5,1.2,3),mat(0x89613e,1)); base.position.y=0.6; g.add(base);
  const top=makeMesh(new THREE.BoxGeometry(5.5,0.18,3.4),mat(0x3f75a5,0.8)); top.position.y=2.4; g.add(top); return g;
}
function modelFor(type){
  if(type==='farm') return makeFarm();
  if(type==='mill') return makeMill();
  if(type==='market') return makeMarket();
  if(type==='barn'||type==='lumber'||type==='quarry') { const g=makeHouse(0x76513b); g.scale.set(1.18,0.95,1.18); return g; }
  if(type==='school') return makeHouse(0x3d6480,true);
  return makeHouse(type==='clinic'?0x8d745a:type==='blacksmith'?0x4c4b4a:type==='tavern'?0x7d3f33:0x9b573d);
}

const slots=[[-28,-18],[-19,-15],[-10,-18],[5,-17],[15,-14],[25,-17],[-27,-4],[-17,-2],[-5,-5],[7,-3],[18,-2],[29,-4],[-28,11],[-17,12],[-4,10],[8,12],[20,10],[30,12],[-22,25],[-10,23],[3,25],[16,23],[28,25]];
function seedBuildings(){
  const list=[['house',7],['house',8],['barn',9],['farm',14],['farm',15],['mill',10],['market',16]];
  list.forEach(([type,slot],i)=>state.buildings.push({id:i+1,type,slot,level:1}));
}
function addRoad(x,z){
  const len=Math.hypot(x,z); if(len<1) return;
  const road=makeMesh(new THREE.BoxGeometry(2.0,0.12,len),mat(0xa68d61,1),false,true);
  road.position.set(x/2,0.08,z/2); road.rotation.y=Math.atan2(x,z); world.add(road);
}
function rebuildBuildings(){
  interactables.length=0;
  state.buildings.forEach(b=>{
    const [x,z]=slots[b.slot]; const g=modelFor(b.type); g.position.set(x,0,z); world.add(g); addRoad(x,z);
    g.traverse(o=>{ if(o.isMesh){ o.userData.buildingId=b.id; interactables.push(o); } });
  });
}

function addVillagers(){
  for(let i=0;i<state.pop;i++){
    const g=new THREE.Group();
    const body=makeMesh(new THREE.CapsuleGeometry(0.32,0.8,4,8),mat([0x4d6f98,0x9b5e4c,0x5d855b,0x77598a][i%4],0.8)); body.position.y=0.85; g.add(body);
    const head=makeMesh(new THREE.SphereGeometry(0.32,10,8),mat(0xd9ad86,0.85)); head.position.y=1.65; g.add(head);
    g.userData={angle:Math.random()*Math.PI*2,radius:8+Math.random()*16,speed:0.18+Math.random()*0.18}; world.add(g); villagers.push(g);
  }
}
function addAnimals(){
  for(let i=0;i<8;i++){
    const g=new THREE.Group(); const body=makeMesh(new THREE.BoxGeometry(1.1,0.65,0.6),mat(i<5?0xf1eee2:0x7a523e,0.9)); body.position.y=0.65; g.add(body);
    const head=makeMesh(new THREE.BoxGeometry(0.45,0.5,0.45),body.material); head.position.set(0.65,0.8,0); g.add(head);
    g.position.set(20+Math.random()*9,0,7+Math.random()*8); world.add(g);
  }
}

function renderDock(){
  $('#buildDock').innerHTML = Object.entries(BUILD).map(([k,d])=>`<button class="buildBtn" data-build="${k}"><i>${d.icon}</i><span>${d.name}</span></button>`).join('');
  $$('[data-build]').forEach(btn=>btn.addEventListener('click',()=>build(btn.dataset.build)));
}
function toast(text){ const e=$('#toast'); e.textContent=text; e.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>e.classList.remove('show'),1600); }
function build(type){
  const d=BUILD[type]; if(state.wood<d.wood||state.stone<d.stone) return toast('资源不足');
  const used=new Set(state.buildings.map(b=>b.slot)); const slot=slots.findIndex((_,i)=>!used.has(i)); if(slot<0) return toast('村庄中心已满');
  state.wood-=d.wood; state.stone-=d.stone; const id=state.buildings.length+1; state.buildings.push({id,type,slot,level:1});
  const [x,z]=slots[slot],g=modelFor(type); g.position.set(x,0,z); world.add(g); addRoad(x,z); g.traverse(o=>{if(o.isMesh){o.userData.buildingId=id;interactables.push(o);}}); toast('建造 '+d.name);
}
function inspect(id){
  const b=state.buildings.find(x=>x.id===id); if(!b) return; const d=BUILD[b.type];
  const p=$('#rightPanel'); p.classList.add('show'); p.innerHTML=`<h3>${d.icon} ${d.name} · 等级 ${b.level}</h3><p>当前建筑正常运作。</p><div class="kv"><span>等级</span><b>${b.level}</b><span>居民</span><b>${state.pop}</b></div>`;
}
function renderHUD(){
  const set=(id,v)=>{const e=$('#'+id); if(e) e.textContent=v;};
  set('wood',Math.floor(state.wood)); set('stone',Math.floor(state.stone)); set('food',Math.floor(state.food)); set('coin',Math.floor(state.coin)); set('iron',Math.floor(state.iron)); set('tool',Math.floor(state.tool));
  set('pop',state.pop+'/'+state.housing); set('happy',Math.floor(state.happy)+'%'); set('date',seasons[state.season]+' '+(state.day%30||30)+'日 · Year '+state.year); set('time',String(state.hour).padStart(2,'0')+':00');
}

const ray=new THREE.Raycaster(); const mouse=new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown',(e)=>{
  if(e.button!==0) return; const r=renderer.domElement.getBoundingClientRect(); mouse.x=((e.clientX-r.left)/r.width)*2-1; mouse.y=-((e.clientY-r.top)/r.height)*2+1; ray.setFromCamera(mouse,camera); const hit=ray.intersectObjects(interactables,true)[0]; if(hit) inspect(hit.object.userData.buildingId); else $('#rightPanel').classList.remove('show');
});
$$('.speedBtns button').forEach(btn=>btn.addEventListener('click',()=>{ $$('.speedBtns button').forEach(x=>x.classList.remove('on')); btn.classList.add('on'); state.speed=Number(btn.dataset.s)||1; }));

function resize(){ renderer.setSize(innerWidth,innerHeight); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize',resize); resize();

seedBuildings(); addGround(); populateNature(); rebuildBuildings(); addVillagers(); addAnimals(); renderDock(); renderHUD();
let last=performance.now(), hourAcc=0;
function animate(now){
  requestAnimationFrame(animate); const dt=Math.min(0.06,(now-last)/1000); last=now; hourAcc+=dt*state.speed;
  if(hourAcc>1.2){ hourAcc=0; state.hour++; if(state.hour>=24){state.hour=0;state.day++;state.food=Math.max(0,state.food-state.pop*1.5);} }
  state.buildings.forEach(b=>{ if(b.type==='lumber')state.wood+=dt*0.35*state.speed; if(b.type==='quarry')state.stone+=dt*0.22*state.speed; if(b.type==='farm'&&state.season!==3)state.food+=dt*0.45*state.speed; if(b.type==='market')state.coin+=dt*0.08*state.speed; });
  villagers.forEach(v=>{ v.userData.angle+=dt*v.userData.speed*state.speed; const a=v.userData.angle,r=v.userData.radius; v.position.set(Math.cos(a)*r*0.75,0,Math.sin(a)*r*0.55); v.rotation.y=-a+Math.PI/2; });
  windmills.forEach(w=>w.rotation.z+=dt*0.7*state.speed);
  const day=state.hour>=6&&state.hour<19; sun.intensity=day?4.2:0.4; hemi.intensity=day?1.7:0.6; scene.background.set(day?0x98bdc7:0x1d2a42);
  renderHUD(); controls.update(); renderer.render(scene,camera);
}
requestAnimationFrame(animate);
setTimeout(()=>$('#loading')?.classList.add('hide'),700);
