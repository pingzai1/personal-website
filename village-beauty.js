import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const SAVE = 'riverValleyBeauty_v1';

const BUILD = {
  house:{name:'木屋',icon:'🏠',wood:24,stone:8,food:0,desc:'提供 4 个住房，夜晚窗户会亮起。'},
  lumber:{name:'伐木场',icon:'🪵',wood:28,stone:8,food:0,desc:'持续生产木材。'},
  quarry:{name:'采石场',icon:'🪨',wood:20,stone:14,food:0,desc:'持续生产石材。'},
  farm:{name:'小麦农田',icon:'🌾',wood:12,stone:0,food:0,desc:'春夏秋持续生产粮食。'},
  barn:{name:'谷仓',icon:'📦',wood:36,stone:18,food:0,desc:'提高全村资源容量。'},
  mill:{name:'磨坊',icon:'🌬️',wood:46,stone:24,food:25,desc:'提高农田效率，风车会真实转动。'},
  market:{name:'市场',icon:'⛺',wood:38,stone:15,food:18,desc:'提高幸福度并产生金币。'},
  smith:{name:'铁匠铺',icon:'⚒️',wood:48,stone:38,food:0,desc:'提升全村生产效率。'},
  tavern:{name:'酒馆',icon:'🍺',wood:44,stone:22,food:22,desc:'提高幸福度并吸引移民。'}
};

let S = {
  wood:170, stone:115, food:245, coin:420, iron:18, tool:6,
  pop:11, housing:12, happy:82, health:86,
  day:12, hour:9, season:0, year:1, speed:1,
  buildings:[], nextId:1, events:[]
};
try {
  const raw = localStorage.getItem(SAVE);
  if (raw) {
    const v = JSON.parse(raw);
    S = {...S, ...v};
    if (!Array.isArray(S.buildings)) S.buildings = [];
    if (!Array.isArray(S.events)) S.events = [];
  }
} catch(e) {}

const seasons = ['春季','夏季','秋季','冬季'];
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91b8c2);
scene.fog = new THREE.FogExp2(0xb1c7c2, 0.0068);

const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.domElement.style.position='absolute';
renderer.domElement.style.inset='0';
$('#game').prepend(renderer.domElement);

const camera = new THREE.PerspectiveCamera(40, innerWidth/innerHeight, 0.1, 500);
camera.position.set(48, 37, 54);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(3, 1, 2);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.minDistance = 24;
controls.maxDistance = 88;
controls.maxPolarAngle = Math.PI * 0.46;
controls.screenSpacePanning = false;
controls.mouseButtons = {LEFT:THREE.MOUSE.PAN, MIDDLE:THREE.MOUSE.DOLLY, RIGHT:THREE.MOUSE.ROTATE};

const hemi = new THREE.HemisphereLight(0xe9f7ff, 0x4a5836, 1.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe4b0, 4.9);
sun.position.set(35, 55, 28);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left = -75;
sun.shadow.camera.right = 75;
sun.shadow.camera.top = 75;
sun.shadow.camera.bottom = -75;
sun.shadow.bias = -0.00045;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x8fc7ff, 0.7);
fill.position.set(-35,22,-20);
scene.add(fill);

const world = new THREE.Group();
scene.add(world);
const interactables=[];
const buildingGroups=[];
const villagers=[];
const animals=[];
const smokes=[];
const windmills=[];
const waterBits=[];

const mat = (color, rough=.86, metal=0) => new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
const M = {
  grass:mat(0x6f9b4f,.98), grass2:mat(0x82ab59,.98), dirt:mat(0x9a7950,.98),
  stone:mat(0x858a83,.98), stoneDark:mat(0x5f645f,.98), wood:mat(0x795238,.96),
  woodDark:mat(0x4f3527,.98), plaster:mat(0xd2c09d,.9), roof:mat(0x944837,.9),
  roofBlue:mat(0x375f76,.86), crop:mat(0xd1ad43,.92), leaf:mat(0x426f3d,.95), leaf2:mat(0x5f8d49,.95),
  water:new THREE.MeshPhysicalMaterial({color:0x4b9bb4,roughness:.22,metalness:.03,transparent:true,opacity:.9})
};
function mesh(g,m,cast=true,receive=true){const o=new THREE.Mesh(g,m);o.castShadow=cast;o.receiveShadow=receive;return o;}

function terrainHeight(x,z){
  let h = Math.sin(x*.055)*1.6 + Math.cos(z*.06)*1.25 + Math.sin((x+z)*.035)*.85;
  h += Math.max(0, Math.abs(x)-48)*.055 + Math.max(0,Math.abs(z)-42)*.07;
  const riverX = -13 + Math.sin(z*.075)*6;
  const d = Math.abs(x-riverX);
  if(d<8) h -= (8-d)*.32;
  return h;
}
function addTerrain(){
  const g=new THREE.PlaneGeometry(170,135,90,72);
  const p=g.attributes.position;
  const colors=[];
  const c1=new THREE.Color(0x6e9950),c2=new THREE.Color(0x87ac5a),c3=new THREE.Color(0x597f43);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i), z=p.getY(i), h=terrainHeight(x,z);
    p.setZ(i,h);
    const t=Math.max(0,Math.min(1,(h+3)/9));
    const c=c1.clone().lerp(t>.55?c3:c2,Math.abs(t-.5)*1.25);
    colors.push(c.r,c.g,c.b);
  }
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.computeVertexNormals();
  const land=mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),false,true);
  land.rotation.x=-Math.PI/2;
  world.add(land);

  for(let i=0;i<34;i++){
    const a=i/33, z=-58+a*116, x=-13+Math.sin(z*.075)*6, nx=-13+Math.sin((z+1)*.075)*6;
    const dx=nx-x, ang=Math.atan2(dx,1);
    const seg=mesh(new THREE.BoxGeometry(15.5,.12,4.2),M.water,false,true);
    seg.position.set(x,terrainHeight(x,z)+.38,z);
    seg.rotation.y=ang;
    world.add(seg); waterBits.push(seg);
    if(i%2===0){
      const foam=mesh(new THREE.BoxGeometry(12.5,.03,.13),new THREE.MeshBasicMaterial({color:0xc9edf2,transparent:true,opacity:.33}),false,false);
      foam.position.set(x,seg.position.y+.08,z+(Math.random()-.5)*2);
      foam.rotation.y=ang; world.add(foam); waterBits.push(foam);
    }
  }

  for(let i=0;i<76;i++){
    const z=-56+Math.random()*112, rx=-13+Math.sin(z*.075)*6;
    const side=Math.random()<.5?-1:1;
    const x=rx+side*(8.5+Math.random()*4.5);
    const r=mesh(new THREE.DodecahedronGeometry(.45+Math.random()*1.45,0),Math.random()<.4?M.stoneDark:M.stone);
    r.position.set(x,terrainHeight(x,z)+.4,z); r.rotation.set(Math.random(),Math.random(),Math.random());
    r.scale.y=.65+Math.random()*.7; world.add(r);
  }

  const fallX=-13+Math.sin(-52*.075)*6;
  const fall=new THREE.Mesh(new THREE.PlaneGeometry(8,9),new THREE.MeshBasicMaterial({color:0xa8e4f1,transparent:true,opacity:.67,side:THREE.DoubleSide}));
  fall.position.set(fallX,5.1,-54); fall.rotation.y=.1; world.add(fall);
  for(let i=0;i<18;i++){
    const s=mesh(new THREE.SphereGeometry(.08+Math.random()*.12,6,5),new THREE.MeshBasicMaterial({color:0xe9fbff,transparent:true,opacity:.65}),false,false);
    s.position.set(fallX+(Math.random()-.5)*4,.6+Math.random()*7,-53.6+(Math.random()-.5)*1.2);
    s.userData.v=.7+Math.random()*1.1; world.add(s); waterBits.push(s);
  }
}

function addConifer(x,z,s=1){
  const g=new THREE.Group();
  const trunk=mesh(new THREE.CylinderGeometry(.23,.38,2.3,7),M.woodDark); trunk.position.y=1.15;g.add(trunk);
  for(let i=0;i<4;i++){
    const cone=mesh(new THREE.ConeGeometry((2.1-i*.28)*s,2.55,9),i%2?M.leaf:M.leaf2);
    cone.position.y=2.3+i*1.05; cone.rotation.y=Math.random();g.add(cone);
  }
  g.position.set(x,terrainHeight(x,z),z);g.scale.setScalar(s);world.add(g);return g;
}
function addBroadleaf(x,z,s=1){
  const g=new THREE.Group();
  const trunk=mesh(new THREE.CylinderGeometry(.28,.45,2.6,7),M.woodDark);trunk.position.y=1.3;g.add(trunk);
  const positions=[[0,3.2,0],[-.8,3,.35],[.75,3.15,.2],[0,4,.1]];
  positions.forEach((p,i)=>{const crown=mesh(new THREE.IcosahedronGeometry(1.3+(i===3?.2:0),1),i%2?M.leaf:M.leaf2);crown.position.set(...p);g.add(crown)});
  g.position.set(x,terrainHeight(x,z),z);g.scale.setScalar(s);world.add(g);return g;
}
function addForest(){
  for(let i=0;i<185;i++){
    let x=(Math.random()-.5)*156,z=(Math.random()-.5)*120;
    const riverX=-13+Math.sin(z*.075)*6;
    if(Math.abs(x-riverX)<15 || (Math.abs(x)<38&&Math.abs(z)<30)){i--;continue;}
    (Math.random()<.72?addConifer:addBroadleaf)(x,z,.65+Math.random()*.7);
  }
  for(let i=0;i<220;i++){
    let x=(Math.random()-.5)*130,z=(Math.random()-.5)*105;
    if(Math.abs(x)<34&&Math.abs(z)<28&&Math.random()<.75)continue;
    const flower=mesh(new THREE.IcosahedronGeometry(.09,0),mat([0xe9d45f,0xd88177,0xc7b8ee,0xf3f1d2][i%4],.9),false,false);
    flower.position.set(x,terrainHeight(x,z)+.14,z);world.add(flower);
  }
}

function roofPanel(color, side){
  const r=mesh(new THREE.BoxGeometry(3.65,.22,6.25),color);
  r.rotation.z=side*.62; r.position.set(side*1.52,4.25,0); return r;
}
function addBeam(g,x,y,z,sx,sy,sz){const b=mesh(new THREE.BoxGeometry(sx,sy,sz),M.woodDark);b.position.set(x,y,z);g.add(b);}
function cottage(blue=false,large=false){
  const g=new THREE.Group(); const scale=large?1.18:1;
  const foundation=mesh(new THREE.BoxGeometry(6.2,.65,5.5),M.stone);foundation.position.y=.33;g.add(foundation);
  const body=mesh(new THREE.BoxGeometry(5.7,3.25,5),M.plaster);body.position.y=2.05;g.add(body);
  g.add(roofPanel(blue?M.roofBlue:M.roof,-1),roofPanel(blue?M.roofBlue:M.roof,1));
  for(const x of [-2.45,0,2.45]){addBeam(g,x,2.15,2.53,.18,3.35,.2);addBeam(g,x,2.15,-2.53,.18,3.35,.2)}
  addBeam(g,0,3.55,2.56,5.35,.18,.18);addBeam(g,0,3.55,-2.56,5.35,.18,.18);
  const door=mesh(new THREE.BoxGeometry(1.12,2.05,.18),M.woodDark);door.position.set(0,1.55,2.6);g.add(door);
  for(const x of [-1.75,1.75]){
    const w=mesh(new THREE.BoxGeometry(.78,.82,.16),new THREE.MeshStandardMaterial({color:0x84c4d4,emissive:0x315d62,emissiveIntensity:.28,roughness:.45}));w.position.set(x,2.05,2.62);w.userData.window=true;g.add(w);
  }
  const ch=mesh(new THREE.BoxGeometry(.65,1.8,.65),M.stoneDark);ch.position.set(1.65,5.05,-.7);g.add(ch);g.userData.chimney=ch;
  const steps=mesh(new THREE.BoxGeometry(1.8,.25,1),M.stone);steps.position.set(0,.2,3.1);g.add(steps);
  g.scale.setScalar(scale);return g;
}
function makeBarn(){const g=cottage(false,true);const awn=mesh(new THREE.BoxGeometry(3.6,.18,2.2),M.wood);awn.position.set(0,2.15,3.3);awn.rotation.x=-.15;g.add(awn);return g;}
function makeFarm(){
  const g=new THREE.Group();const soil=mesh(new THREE.BoxGeometry(10,.28,7.6),M.dirt);soil.position.y=.12;g.add(soil);
  for(let row=-3;row<=3;row++) for(let col=-5;col<=5;col++){
    const crop=mesh(new THREE.ConeGeometry(.17,.82,5),M.crop);crop.position.set(col*.78,.56,row*.9);crop.rotation.y=(col+row)*.2;g.add(crop);
  }
  const fenceMat=M.woodDark;
  for(const x of [-5.1,5.1])for(let z=-3.8;z<=3.8;z+=1.25){const p=mesh(new THREE.BoxGeometry(.12,1,.12),fenceMat);p.position.set(x,.5,z);g.add(p)}
  return g;
}
function makeMarket(){
  const g=new THREE.Group();const base=mesh(new THREE.BoxGeometry(6,.35,4.5),M.stone);base.position.y=.18;g.add(base);
  const colors=[0x315f85,0xe4c15c,0xb45b4c];
  for(let i=0;i<3;i++){
    const stall=mesh(new THREE.BoxGeometry(1.6,1.1,2.2),M.wood);stall.position.set(-2+i*2, .8,0);g.add(stall);
    const canopy=mesh(new THREE.BoxGeometry(1.9,.18,2.6),mat(colors[i],.75));canopy.position.set(-2+i*2,2.15,0);g.add(canopy);
    for(const x of [-.72,.72])for(const z of [-.9,.9]){const pole=mesh(new THREE.BoxGeometry(.08,1.7,.08),M.woodDark);pole.position.set(-2+i*2+x,1.2,z);g.add(pole)}
  }
  return g;
}
function makeMill(){
  const g=cottage(false,true); const tower=mesh(new THREE.CylinderGeometry(2.25,2.75,6.5,10),M.plaster);tower.position.set(0,3.1,0);g.add(tower);
  const roof=mesh(new THREE.ConeGeometry(3.2,2.3,10),M.roof);roof.position.set(0,7.1,0);g.add(roof);
  const hub=new THREE.Group();
  for(let i=0;i<4;i++){const blade=mesh(new THREE.BoxGeometry(.42,5.8,.16),M.wood);blade.position.y=2.9;blade.rotation.z=i*Math.PI/2;hub.add(blade)}
  hub.position.set(0,4.9,2.9);hub.name='millBlades';g.add(hub);windmills.push(hub);return g;
}
function makeSmith(){const g=cottage(false,false);const lean=mesh(new THREE.BoxGeometry(3.4,.22,2.2),M.roof);lean.position.set(3.6,2.2,0);lean.rotation.z=-.18;g.add(lean);const anvil=mesh(new THREE.BoxGeometry(.8,.5,.45),M.stoneDark);anvil.position.set(3.4,.4,1);g.add(anvil);return g;}
function modelFor(type){if(type==='farm')return makeFarm();if(type==='market')return makeMarket();if(type==='mill')return makeMill();if(type==='barn'||type==='lumber'||type==='quarry')return makeBarn();if(type==='smith')return makeSmith();if(type==='tavern')return cottage(false,true);return cottage(type==='house'?false:true,false);}

const slots=[[-25,-14],[-16,-15],[-6,-16],[6,-15],[17,-14],[27,-12],[-28,-1],[-18,-2],[-7,-2],[5,-2],[17,-1],[28,1],[-26,12],[-15,12],[-4,11],[8,12],[20,11],[30,12],[-20,24],[-8,24],[5,24],[18,23],[29,24]];
function roadBetween(x1,z1,x2,z2){
  const dx=x2-x1,dz=z2-z1,len=Math.hypot(dx,dz);const r=mesh(new THREE.BoxGeometry(2.1,.08,len),M.dirt,false,true);
  r.position.set((x1+x2)/2,terrainHeight((x1+x2)/2,(z1+z2)/2)+.13,(z1+z2)/2);r.rotation.y=Math.atan2(dx,dz);world.add(r);
}
function addVillageRoads(){
  const pts=[[-30,-4],[-20,-2],[-10,-1],[0,0],[10,1],[20,3],[31,6]];
  for(let i=0;i<pts.length-1;i++)roadBetween(pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]);
  roadBetween(-7,-20,-7,21);roadBetween(8,-20,8,22);roadBetween(-23,12,27,12);
}
function smokeFor(g){
  const ch=g.userData.chimney;if(!ch)return;
  for(let i=0;i<5;i++){
    const s=mesh(new THREE.SphereGeometry(.18+i*.05,8,6),new THREE.MeshBasicMaterial({color:0xd9d6cc,transparent:true,opacity:.23}),false,false);
    const wp=new THREE.Vector3();ch.getWorldPosition(wp);s.position.set(wp.x,wp.y+1+i*.5,wp.z);s.userData={baseY:s.position.y,phase:Math.random()*10,speed:.35+Math.random()*.25};scene.add(s);smokes.push(s);
  }
}
function rebuildBuildings(){
  buildingGroups.forEach(g=>world.remove(g));buildingGroups.length=0;interactables.length=0;windmills.length=0;
  for(const b of S.buildings){
    const p=slots[b.slot]||[0,0],g=modelFor(b.type);g.position.set(p[0],terrainHeight(p[0],p[1]),p[1]);g.userData.buildingId=b.id;
    g.scale.multiplyScalar(.92+.08*(b.level||1));
    if(b.progress<1)g.traverse(o=>{if(o.material){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.5}});
    world.add(g);buildingGroups.push(g);g.traverse(o=>{if(o.isMesh){o.userData.buildingId=b.id;interactables.push(o)}});
    if(b.progress>=1)smokeFor(g);
  }
}
function seed(){
  if(S.buildings.length)return;
  S.buildings=[
    {id:S.nextId++,type:'house',slot:7,level:2,progress:1},{id:S.nextId++,type:'house',slot:8,level:1,progress:1},
    {id:S.nextId++,type:'house',slot:9,level:1,progress:1},{id:S.nextId++,type:'barn',slot:10,level:1,progress:1},
    {id:S.nextId++,type:'farm',slot:13,level:1,progress:1},{id:S.nextId++,type:'farm',slot:14,level:2,progress:1},
    {id:S.nextId++,type:'farm',slot:15,level:1,progress:1},{id:S.nextId++,type:'mill',slot:5,level:1,progress:1},
    {id:S.nextId++,type:'market',slot:16,level:1,progress:1},{id:S.nextId++,type:'smith',slot:17,level:1,progress:1},
    {id:S.nextId++,type:'tavern',slot:3,level:1,progress:1}
  ];
  S.housing=16;save();
}

function makeVillager(i){
  const g=new THREE.Group();
  const body=mesh(new THREE.CylinderGeometry(.25,.32,.85,8),mat([0x496b8f,0x9c5a4d,0x627c4d,0x745f8c,0xb28245][i%5],.86));body.position.y=.7;g.add(body);
  const head=mesh(new THREE.SphereGeometry(.25,10,8),mat(0xd6a77f,.9));head.position.y=1.35;g.add(head);
  if(i%3===0){const hat=mesh(new THREE.ConeGeometry(.34,.35,8),M.wood);hat.position.y=1.68;g.add(hat)}
  g.scale.setScalar(1.08);const r=7+Math.random()*25,a=Math.random()*Math.PI*2;
  g.userData={r,a,s:.17+Math.random()*.16,ox:(Math.random()-.5)*5,oz:(Math.random()-.5)*4};world.add(g);villagers.push(g);
}
function addVillagers(){villagers.splice(0).forEach(v=>world.remove(v));for(let i=0;i<S.pop;i++)makeVillager(i);}
function addAnimals(){
  for(let i=0;i<10;i++){
    const g=new THREE.Group();const body=mesh(new THREE.BoxGeometry(1.05,.62,.58),mat(i<6?0xe6e0cf:0x795743,.92));body.position.y=.58;g.add(body);
    const head=mesh(new THREE.BoxGeometry(.42,.42,.42),body.material);head.position.set(.62,.75,.08);g.add(head);
    const x=24+Math.random()*10,z=7+Math.random()*9;g.position.set(x,terrainHeight(x,z),z);world.add(g);animals.push(g);
  }
  for(const x of [22,35])for(let z=5;z<18;z+=2){const post=mesh(new THREE.BoxGeometry(.12,1,.12),M.woodDark);post.position.set(x,terrainHeight(x,z)+.5,z);world.add(post)}
}
function addMountains(){
  for(let i=0;i<18;i++){
    const x=-78+i*9+(Math.random()-.5)*7,z=-61-Math.random()*15;
    const m=mesh(new THREE.ConeGeometry(7+Math.random()*7,18+Math.random()*15,7),mat(i%2?0x596b5e:0x687765,1),false,true);
    m.position.set(x,5,z);m.scale.z=.7+Math.random()*.6;world.add(m);
  }
}

function cap(){return 520+S.buildings.filter(b=>b.type==='barn'&&b.progress>=1).length*320;}
function slotFree(){const used=new Set(S.buildings.map(b=>b.slot));return slots.map((_,i)=>i).find(i=>!used.has(i));}
function save(){localStorage.setItem(SAVE,JSON.stringify(S));}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('show');clearTimeout(toast._);toast._=setTimeout(()=>e.classList.remove('show'),1900);}
function build(type){
  const d=BUILD[type],slot=slotFree();if(slot==null)return toast('村庄中心已满，下一版会开放新区域');
  if(S.wood<d.wood||S.stone<d.stone||S.food<d.food)return toast(`资源不足：${d.wood} 木 / ${d.stone} 石${d.food?` / ${d.food} 粮`:''}`);
  S.wood-=d.wood;S.stone-=d.stone;S.food-=d.food;S.buildings.push({id:S.nextId++,type,slot,level:1,progress:.04});rebuildBuildings();save();toast('已放置 '+d.name+' 工地');
}
function inspect(id){
  const b=S.buildings.find(x=>x.id===id);if(!b)return;const d=BUILD[b.type],p=$('#rightPanel');p.classList.add('show');
  p.innerHTML=`<h3>${d.icon} ${d.name} · 等级 ${b.level}</h3><p>${d.desc}</p><div class="kv"><span>状态</span><b>${b.progress>=1?'正常运作':'施工 '+Math.floor(b.progress*100)+'%'}</b><span>居民/工人</span><b>${b.type==='house'?'4 居民':'2 工人'}</b><span>维护</span><b>良好</b><span>升级费用</span><b>${28*b.level} 木 / ${14*b.level} 石</b></div><div class="bar"><i style="width:${Math.min(100,b.progress*100)}%"></i></div><button class="action" id="upgrade">升级建筑</button>`;
  $('#upgrade').onclick=()=>upgrade(id);
}
function upgrade(id){
  const b=S.buildings.find(x=>x.id===id);if(!b)return;const w=28*b.level,s=14*b.level;if(S.wood<w||S.stone<s)return toast('升级资源不足');
  S.wood-=w;S.stone-=s;b.level++;b.progress=.72;rebuildBuildings();save();inspect(id);toast('建筑升级施工开始');
}
function renderDock(){$('#dock').innerHTML=Object.entries(BUILD).map(([k,d])=>`<button class="buildBtn" data-build="${k}" title="${d.desc}"><i>${d.icon}</i><span>${d.name}</span></button>`).join('');$$('[data-build]').forEach(b=>b.onclick=()=>build(b.dataset.build));}
function renderEvents(){const e=$('#events');e.innerHTML=S.events.length?S.events.slice(0,4).map(x=>`<div class="event"><b>${x.title}</b><br>${x.text}</div>`).join(''):'<div class="event">山谷很平静，商路正在恢复。</div>';}
function randomEvent(){const list=[['商队抵达','来自北方的商人带来 120 金币。',()=>S.coin+=120],['丰收','今年小麦长势极好，粮食 +90。',()=>S.food+=90],['新家庭入住','一户新居民请求定居。',()=>{if(S.pop<S.housing){S.pop+=2;addVillagers()}}],['发现铁矿','河谷北侧发现浅层铁矿，铁矿 +35。',()=>S.iron+=35]];const e=list[Math.floor(Math.random()*list.length)];e[2]();S.events.unshift({title:e[0],text:e[1]});S.events=S.events.slice(0,6);renderEvents();toast(e[0]);}
function production(dt){
  let farmBoost=S.buildings.some(b=>b.type==='mill'&&b.progress>=1)?1.35:1;let allBoost=S.buildings.some(b=>b.type==='smith'&&b.progress>=1)?1.12:1;
  for(const b of S.buildings){
    if(b.progress<1){b.progress=Math.min(1,b.progress+dt*.018*S.speed);if(b.progress===1&&b.type==='house')S.housing+=4;continue;}
    if(b.type==='lumber')S.wood+=dt*.62*S.speed*allBoost;if(b.type==='quarry')S.stone+=dt*.42*S.speed*allBoost;if(b.type==='farm'&&S.season!==3)S.food+=dt*.68*S.speed*farmBoost;if(b.type==='market')S.coin+=dt*.14*S.speed;
  }
  const max=cap();S.wood=Math.min(max,S.wood);S.stone=Math.min(max,S.stone);S.food=Math.min(max,S.food);
  const tav=S.buildings.some(b=>b.type==='tavern'&&b.progress>=1),market=S.buildings.some(b=>b.type==='market'&&b.progress>=1);
  S.happy=Math.max(35,Math.min(100,S.happy+dt*S.speed*((tav?.003:0)+(market?.002:0)+(S.food>S.pop*5?.001:-.01))));
}
function nextDay(){S.day++;S.food=Math.max(0,S.food-S.pop*1.55);if(S.day%30===0){S.season=(S.season+1)%4;if(S.season===0)S.year++;}if(S.day%7===0)randomEvent();if(S.day%6===0&&S.pop+1<=S.housing&&S.happy>70&&S.food>S.pop*6){S.pop++;addVillagers();toast('新的居民加入村庄');}save();}
function renderHUD(){
  const set=(id,v)=>{$('#'+id).textContent=v};set('coin',Math.floor(S.coin));set('wood',Math.floor(S.wood));set('stone',Math.floor(S.stone));set('iron',Math.floor(S.iron));set('food',Math.floor(S.food));set('tool',Math.floor(S.tool));set('pop',S.pop+'/'+S.housing);set('happy',Math.floor(S.happy)+'%');set('date',`${seasons[S.season]} ${S.day%30||30}日 · Year ${S.year}`);set('time',String(S.hour).padStart(2,'0')+':00');
}

const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
renderer.domElement.addEventListener('pointerdown',(e)=>{if(e.button!==0)return;const r=renderer.domElement.getBoundingClientRect();mouse.x=((e.clientX-r.left)/r.width)*2-1;mouse.y=-((e.clientY-r.top)/r.height)*2+1;ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(interactables,true)[0];if(hit){inspect(hit.object.userData.buildingId);e.stopPropagation();}else $('#rightPanel').classList.remove('show');});
$$('.speed button').forEach(b=>b.onclick=()=>{$$('.speed button').forEach(x=>x.classList.remove('on'));b.classList.add('on');S.speed=+b.dataset.s;});
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();

seed();addTerrain();addMountains();addForest();addVillageRoads();rebuildBuildings();addVillagers();addAnimals();renderDock();renderEvents();renderHUD();
let last=performance.now(),hourAcc=0;
function animate(now){
  requestAnimationFrame(animate);const dt=Math.min(.05,(now-last)/1000);last=now;production(dt);hourAcc+=dt*S.speed;
  if(hourAcc>=1.25){hourAcc=0;S.hour++;if(S.hour>=24){S.hour=0;nextDay();}}
  for(const v of villagers){v.userData.a+=dt*v.userData.s*S.speed;const a=v.userData.a,r=v.userData.r,x=Math.cos(a)*r*.85+v.userData.ox,z=Math.sin(a)*r*.55+v.userData.oz;v.position.set(x,terrainHeight(x,z),z);v.rotation.y=-a+Math.PI/2;}
  for(const a of animals){a.rotation.y+=dt*.06;}
  windmills.forEach(w=>w.rotation.z+=dt*.72*S.speed);
  smokes.forEach((s,i)=>{s.position.y+=dt*s.userData.speed;s.position.x+=Math.sin(now*.0007+s.userData.phase)*dt*.06;s.material.opacity=.24*Math.max(0,1-((s.position.y-s.userData.baseY)/4));if(s.position.y>s.userData.baseY+4){s.position.y=s.userData.baseY;s.material.opacity=.2;}});
  waterBits.forEach((w,i)=>{if(w.geometry?.type==='SphereGeometry'){w.position.y-=dt*w.userData.v;if(w.position.y<.5)w.position.y=7.2;}else if(w.material?.transparent){w.material.opacity=.84+Math.sin(now*.0015+i)*.05;}});
  const daytime=S.hour>=6&&S.hour<19;const t=(S.hour/24)*Math.PI*2;sun.position.set(Math.cos(t)*48,Math.max(6,Math.sin(t)*58),30);sun.intensity=daytime?4.8:.55;hemi.intensity=daytime?1.85:.65;fill.intensity=daytime?.7:.25;scene.background.set(daytime?0x91b8c2:0x1c2c43);scene.fog.color.set(daytime?0xb1c7c2:0x31445a);
  world.traverse(o=>{if(o.userData.window&&o.material?.emissiveIntensity!==undefined)o.material.emissiveIntensity=daytime?.18:1.8;});
  renderHUD();controls.update();renderer.render(scene,camera);
}
requestAnimationFrame(animate);setInterval(save,5000);setTimeout(()=>$('#loading').classList.add('hide'),850);