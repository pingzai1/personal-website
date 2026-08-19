'use strict';
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const fmt = (n) => {
  n = Math.floor(Number(n)||0);
  const units=[['Qi',1e18],['Qa',1e15],['T',1e12],['B',1e9],['M',1e6],['K',1e3]];
  for(const [u,v] of units) if(n>=v) return (n/v).toFixed(n/v>=100?0:n/v>=10?1:2)+u;
  return n.toLocaleString();
};
const STORAGE='coinFoundryV8';
const DEFAULT={copper:0,silver:0,gold:0,total:0,points:0,pointBuys:0,stars:0,last:Date.now(),talents:{start:1},workers:[{type:'runner',level:1}]};
let state=structuredClone(DEFAULT);
const workerTypes={
 runner:{name:'跑腿工',role:'均衡',cost:150,speed:17,range:3.2,carry:1,mult:1},
 scout:{name:'侦察员',role:'高速',cost:900,speed:27,range:3.5,carry:1,mult:1},
 porter:{name:'搬运工',role:'批量',cost:3500,speed:13,range:4.8,carry:3,mult:1},
 banker:{name:'金库助手',role:'价值',cost:12000,speed:16,range:3.4,carry:1,mult:1.5}
};
const nodes=[
 {id:'start',x:50,y:48,name:'拾币本能',type:'起点',max:1,cost:0,desc:'工坊的起点。',per:'解锁基础成长'},
 {id:'v1',x:67,y:39,name:'铜币打磨',type:'硬币价值',max:10,cost:1,parent:'start',desc:'提高每枚铜币的实际价值。',per:'每级 +1 铜币价值'},
 {id:'v2',x:82,y:28,name:'铸币改良',type:'硬币价值',max:5,cost:2,parent:'v1',desc:'乘算提高铜币价值。',per:'每级 +25% 铜币价值'},
 {id:'vcore',x:91,y:14,name:'铜币王朝',type:'核心',max:1,cost:5,parent:'v2',big:true,desc:'把低阶硬币玩到极致。',per:'铜币价值 ×5'},
 {id:'spawn1',x:33,y:39,name:'更快落币',type:'产量',max:10,cost:1,parent:'start',desc:'提高桌面的落币速度。',per:'每级 +15% 生成速度'},
 {id:'spawn2',x:18,y:28,name:'硬币雨',type:'产量',max:5,cost:2,parent:'spawn1',desc:'进一步提高生成速度。',per:'每级 +30% 生成速度'},
 {id:'spawnCore',x:8,y:14,name:'无尽币海',type:'核心',max:1,cost:5,parent:'spawn2',big:true,desc:'大量硬币从桌面出现。',per:'生成速度 ×2.5'},
 {id:'silver',x:17,y:51,name:'银色矿脉',type:'掉落',max:5,cost:2,parent:'spawn1',desc:'提高银币直接掉落概率。',per:'每级 +3% 银币概率'},
 {id:'goldDrop',x:8,y:69,name:'黄金直觉',type:'掉落',max:5,cost:3,parent:'silver',desc:'提高金币直接掉落概率。',per:'每级 +0.7% 金币概率'},
 {id:'speed',x:39,y:65,name:'轻装上阵',type:'工人',max:8,cost:1,parent:'start',desc:'所有小人跑得更快。',per:'每级 +10% 移速'},
 {id:'range',x:28,y:78,name:'拾取训练',type:'工人',max:5,cost:2,parent:'speed',desc:'扩大拾取范围。',per:'每级 +12% 拾取范围'},
 {id:'hire',x:15,y:91,name:'人才市场',type:'核心',max:1,cost:4,parent:'range',big:true,desc:'降低招聘价格。',per:'招聘价格 -30%'},
 {id:'workerValue',x:44,y:88,name:'计件奖金',type:'工人',max:5,cost:2,parent:'speed',desc:'小人拾取时获得更多价值。',per:'每级 +12% 拾取数量'},
 {id:'luck',x:61,y:65,name:'幸运硬币',type:'幸运',max:5,cost:2,parent:'start',desc:'出现绿色发光幸运币。',per:'每级 +2% 幸运概率'},
 {id:'luckMult',x:73,y:78,name:'好运翻倍',type:'幸运',max:5,cost:2,parent:'luck',desc:'幸运硬币奖励更高。',per:'每级 +2× 幸运倍率'},
 {id:'luckCore',x:85,y:91,name:'命运偏爱',type:'核心',max:1,cost:5,parent:'luckMult',big:true,desc:'幸运币奖励暴涨。',per:'幸运倍率 ×3'},
 {id:'ratio',x:54,y:28,name:'精炼工艺',type:'自动化',max:5,cost:2,parent:'start',desc:'降低铜兑银、银兑金需求。',per:'每级兑换需求 -8%'},
 {id:'auto',x:50,y:12,name:'自动精炼',type:'核心',max:1,cost:4,parent:'ratio',big:true,desc:'定时自动执行兑换。',per:'开启自动兑换'},
 {id:'offline',x:70,y:13,name:'夜班账本',type:'离线',max:5,cost:2,parent:'ratio',desc:'提高离线收益。',per:'每级 +15% 离线效率'}
];
const lv=id=>state.talents[id]||0;
function stats(){
  let s={spawn:1,copperValue:1,silverValue:100,goldValue:10000,silverChance:.03,goldChance:.002,luck:.02,luckMult:5,speed:1,range:1,workerValue:1,hire:1,ratio:100,auto:false,offline:.6};
  s.copperValue*=1+state.stars*.05;s.spawn*=1+state.stars*.025;
  s.copperValue+=lv('v1');s.copperValue*=1+lv('v2')*.25;if(lv('vcore'))s.copperValue*=5;
  s.spawn*=1+lv('spawn1')*.15;s.spawn*=1+lv('spawn2')*.30;if(lv('spawnCore'))s.spawn*=2.5;
  s.silverChance+=lv('silver')*.03;s.goldChance+=lv('goldDrop')*.007;
  s.speed*=1+lv('speed')*.10;s.range*=1+lv('range')*.12;s.workerValue*=1+lv('workerValue')*.12;
  if(lv('hire'))s.hire=.7;s.luck+=lv('luck')*.02;s.luckMult+=lv('luckMult')*2;if(lv('luckCore'))s.luckMult*=3;
  s.ratio=Math.max(10,Math.floor(100*Math.pow(.92,lv('ratio'))));s.auto=!!lv('auto');s.offline+=lv('offline')*.15;
  return s;
}
function totalWealth(){const s=stats();return state.copper*s.copperValue+state.silver*s.silverValue+state.gold*s.goldValue;}
function payWealth(cost){let left=cost;const s=stats();const spend=(key,val)=>{if(left<=0)return;const need=Math.min(state[key],Math.ceil(left/val));state[key]-=need;left-=need*val;};spend('copper',s.copperValue);spend('silver',s.silverValue);spend('gold',s.goldValue);return left<=0;}
let coins=[],workers=[],spawnAcc=0,last=performance.now(),pickTimes=[],autoAcc=0;
function createWorker(data){
 const t=workerTypes[data.type]||workerTypes.runner;const w={...data,x:45+Math.random()*10,y:48+Math.random()*10,target:null,busy:false,id:(crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()))};
 const el=document.createElement('div');el.className='worker worker-'+data.type;el.innerHTML='<div class="shadow"></div><div class="leg l1"></div><div class="leg l2"></div><div class="arm a1"></div><div class="arm a2"></div><div class="body"></div><div class="head"></div><div class="hair"></div><div class="eye e1"></div><div class="eye e2"></div>';
 $('#workersLayer').appendChild(el);w.el=el;workers.push(w);positionWorker(w);return w;
}
function positionWorker(w){w.el.style.left=w.x+'%';w.el.style.top=w.y+'%';}
function rebuildWorkers(){workers.forEach(w=>w.el.remove());workers=[];state.workers.forEach(createWorker);}
function spawnCoin(){
 if(coins.length>=150)return;const s=stats(),r=Math.random();let tier='copper';if(r<s.goldChance)tier='gold';else if(r<s.goldChance+s.silverChance)tier='silver';
 const lucky=Math.random()<s.luck,el=document.createElement('div');el.className='coin '+tier+(lucky?' lucky':'');el.textContent=tier==='copper'?'C':tier==='silver'?'S':'G';
 const c={tier,lucky,x:6+Math.random()*88,y:14+Math.random()*76,el,reserved:null};el.style.left=`calc(${c.x}% - 15px)`;el.style.top=`calc(${c.y}% - 15px)`;el.onclick=()=>collect(c,null,true);$('#field').appendChild(el);coins.push(c);
}
function nearest(w){let best=null,bestD=Infinity;for(const c of coins){if(c.reserved&&c.reserved!==w.id)continue;const d=(c.x-w.x)**2+(c.y-w.y)**2;if(d<bestD){best=c;bestD=d;}}if(best)best.reserved=w.id;return best;}
function floatText(c,text){const e=document.createElement('div');e.className='float';e.textContent=text;e.style.left=c.x+'%';e.style.top=c.y+'%';e.style.color=c.tier==='gold'?'#ffe06b':c.tier==='silver'?'#eef4fb':'#f1a376';$('.arenaWrap').appendChild(e);setTimeout(()=>e.remove(),900);}
function collect(c,w,manual=false){
 const i=coins.indexOf(c);if(i<0)return;coins.splice(i,1);c.el.remove();const s=stats();let amount=1,mult=c.lucky?s.luckMult:1;if(w){const t=workerTypes[w.type]||workerTypes.runner;mult*=s.workerValue*t.mult*(1+(w.level-1)*.08);}amount=Math.max(1,Math.floor(mult));
 state[c.tier]+=amount;const worth=c.tier==='copper'?amount*s.copperValue:c.tier==='silver'?amount*s.silverValue:amount*s.goldValue;state.total+=worth;pickTimes.push(Date.now());floatText(c,(c.lucky?'🍀 ':'')+'+'+amount);
 if(Math.random()<.08)addLog((manual?'手动':'小人')+'拾取 '+(c.tier==='copper'?'铜币':c.tier==='silver'?'银币':'金币')+' ×'+amount);
}
function moveWorkers(dt){const s=stats();for(const w of workers){if(w.busy)continue;if(!w.target||!coins.includes(w.target))w.target=nearest(w);if(!w.target){w.el.classList.remove('walk');continue;}const t=workerTypes[w.type]||workerTypes.runner;let dx=w.target.x-w.x,dy=w.target.y-w.y,dist=Math.hypot(dx,dy);if(dist<t.range*s.range){const target=w.target;w.busy=true;w.el.classList.remove('walk');w.el.classList.add('pick');setTimeout(()=>collect(target,w),120);setTimeout(()=>{if(t.carry>1)coins.filter(c=>Math.hypot(c.x-w.x,c.y-w.y)<5).slice(0,t.carry-1).forEach(c=>collect(c,w));w.el.classList.remove('pick');w.busy=false;w.target=null;},300);continue;}const step=t.speed*s.speed*dt;w.x+=dx/dist*Math.min(step,dist);w.y+=dy/dist*Math.min(step,dist);w.el.classList.add('walk');w.el.classList.toggle('flip',dx<0);positionWorker(w);}}
function talentCost(n){return n.cost+Math.floor(lv(n.id)/2);}
function drawTree(){const tree=$('#tree');tree.innerHTML='';for(const n of nodes){if(!n.parent)continue;const p=nodes.find(x=>x.id===n.parent),dx=n.x-p.x,dy=n.y-p.y;const line=document.createElement('div');line.className='line'+(lv(n.id)?' on':'');line.style.left=p.x+'%';line.style.top=p.y+'%';line.style.width=Math.hypot(dx,dy)+'%';line.style.transform=`rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`;tree.appendChild(line);}for(const n of nodes){const level=lv(n.id),available=level<n.max&&(!n.parent||lv(n.parent));const el=document.createElement('div');el.className='node '+(n.big?'big ':'')+(level?'unlocked ':'')+(level>=n.max?'maxed ':'')+(available?'available ':'');el.style.left=`calc(${n.x}% - ${n.big?34:27}px)`;el.style.top=`calc(${n.y}% - ${n.big?34:27}px)`;el.innerHTML=`<div>${n.name}<div class="lvl">${level}/${n.max}</div></div>`;el.onmouseenter=e=>showTip(n,e);el.onmousemove=moveTip;el.onmouseleave=hideTip;el.onclick=()=>buyTalent(n);tree.appendChild(el);}}
function showTip(n,e){const level=lv(n.id),parent=n.parent?nodes.find(x=>x.id===n.parent):null;$('#tooltip').innerHTML=`<div class="type">${n.type}</div><h3>${n.name}</h3><p>${n.desc}</p><div class="effect"><b>效果：</b> ${n.per}<br><span class="next">当前 ${level}/${n.max}</span></div><div class="req">${parent?'前置：'+parent.name:'起始节点'}</div><div class="cost">${level>=n.max?'已满级':'升级消耗：'+talentCost(n)+' 天赋点'}</div>`;$('#tooltip').style.display='block';moveTip(e);}
function moveTip(e){const t=$('#tooltip');t.style.left=Math.min(innerWidth-285,e.clientX+15)+'px';t.style.top=Math.min(innerHeight-220,e.clientY+15)+'px';}
function hideTip(){$('#tooltip').style.display='none';}
function buyTalent(n){const level=lv(n.id);if(level>=n.max)return toast('已经满级');if(n.parent&&!lv(n.parent))return toast('先点前置天赋');const cost=talentCost(n);if(state.points<cost)return toast('天赋点不足');state.points-=cost;state.talents[n.id]=level+1;drawTree();renderShop();save();}
function renderShop(){const box=$('#workerShop'),s=stats();box.innerHTML='';for(const [key,t] of Object.entries(workerTypes)){const owned=state.workers.filter(w=>w.type===key).length,cost=Math.floor(t.cost*s.hire*Math.pow(1.38,owned));const card=document.createElement('div');card.className='hireCard';card.innerHTML=`<div class="hireTop"><div><div class="hireName">${t.name}</div><div class="hireRole">${t.role} · 已有 ${owned}</div></div><span class="badge">${fmt(cost)} 财富</span></div><div class="hireStats"><span>速度 <b>${t.speed}</b></span><span>拾取范围 <b>${t.range}</b></span><span>一次拾取 <b>${t.carry}</b></span><span>价值倍率 <b>${t.mult}×</b></span></div><button class="btn" style="width:100%">招聘 ${t.name}</button>`;card.querySelector('button').onclick=()=>hire(key,cost);box.appendChild(card);}}
function hire(type,cost){if(totalWealth()<cost)return toast('财富不足');payWealth(cost);state.workers.push({type,level:1});createWorker({type,level:1});renderShop();save();toast('招聘成功');}
function addLog(text){const log=$('#log'),e=document.createElement('div');e.innerHTML='<strong>'+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})+'</strong> · '+text;log.prepend(e);while(log.children.length>15)log.lastElementChild.remove();}
function toast(text){const e=$('#toast');e.textContent=text;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('show'),1500);}
function updateUI(){const s=stats();$('#copper').textContent=fmt(state.copper);$('#silver').textContent=fmt(state.silver);$('#gold').textContent=fmt(state.gold);$('#wealth').textContent=fmt(totalWealth());$('#points').textContent=state.points;$('#workerCount').textContent=state.workers.length;$('#stars').textContent=state.stars;$('#cValue').textContent='价值 '+fmt(s.copperValue);$('#sValue').textContent='价值 '+fmt(s.silverValue);$('#gValue').textContent='价值 '+fmt(s.goldValue);$('#spawnRate').textContent=s.spawn.toFixed(2)+'/s';$('#coinValue').textContent=(Math.round(s.copperValue*100)/100);$('#silverChance').textContent=(s.silverChance*100).toFixed(1)+'%';$('#goldChance').textContent=(s.goldChance*100).toFixed(2)+'%';$('#luckChance').textContent=(s.luck*100).toFixed(1)+'%';$('#autoConvert').textContent=s.auto?'开启':'关闭';pickTimes=pickTimes.filter(t=>Date.now()-t<1000);$('#pps').textContent=pickTimes.length;$('#ground').textContent=coins.length;$('#hudCoins').textContent=coins.length;$('#runEarned').textContent=fmt(state.total);$('#avgSpeed').textContent=Math.round(s.speed*100)+'%';$('#effBar').style.width=Math.min(100,pickTimes.length*10)+'%';$('#ratioCS').textContent=s.ratio+' : 1';$('#ratioSG').textContent=s.ratio+' : 1';$('#pointCost').textContent=fmt(Math.max(1,Math.floor(Math.pow(1.55,state.pointBuys))))+' 金币';const gain=Math.floor(Math.sqrt(Math.max(0,state.total-100000)/100000));$('#prestigeGain').textContent=gain+' 星币';$('#starBonus').textContent='+'+(state.stars*5)+'% 铜币价值';}
function convertSilver(silent=false){const s=stats(),n=Math.floor(state.copper/s.ratio);if(!n){if(!silent)toast('铜币不足');return;}state.copper-=n*s.ratio;state.silver+=n;save();}
function convertGold(silent=false){const s=stats(),n=Math.floor(state.silver/s.ratio);if(!n){if(!silent)toast('银币不足');return;}state.silver-=n*s.ratio;state.gold+=n;save();}
function buyPoint(){const c=Math.max(1,Math.floor(Math.pow(1.55,state.pointBuys)));if(state.gold<c)return toast('需要 '+fmt(c)+' 金币');state.gold-=c;state.points++;state.pointBuys++;save();toast('天赋点 +1');}
function prestige(){const gain=Math.floor(Math.sqrt(Math.max(0,state.total-100000)/100000));if(gain<1)return toast('本局收益至少需要 100K');if(!confirm('转生并获得 '+gain+' 星币？'))return;const stars=state.stars+gain;state=structuredClone(DEFAULT);state.stars=stars;coins.forEach(c=>c.el.remove());coins=[];rebuildWorkers();drawTree();renderShop();save();}
function save(){state.last=Date.now();localStorage.setItem(STORAGE,JSON.stringify(state));}
function load(){try{const raw=localStorage.getItem(STORAGE);if(raw)state={...structuredClone(DEFAULT),...JSON.parse(raw)};state.talents={start:1,...(state.talents||{})};state.workers=state.workers?.length?state.workers:[{type:'runner',level:1}];const away=Math.max(0,(Date.now()-state.last)/1000);if(away>10){const s=stats(),secs=Math.min(away,28800),gain=Math.floor(secs*s.spawn*s.offline);state.copper+=gain;state.total+=gain*s.copperValue;setTimeout(()=>toast('离线收益 +'+fmt(gain)+' 铜币'),500);}}catch(e){console.error(e);state=structuredClone(DEFAULT);}}
function bind(){
 $('#exchangeSilver').onclick=()=>convertSilver(false);$('#exchangeGold').onclick=()=>convertGold(false);$('#buyPoint').onclick=buyPoint;$('#prestigeBtn').onclick=prestige;
 $$('.tab').forEach(btn=>btn.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));btn.classList.add('active');['tree','workers','prestige'].forEach(v=>$('#view-'+v).style.display=v===btn.dataset.tab?'block':'none');});
}
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;const s=stats();spawnAcc+=dt*s.spawn;while(spawnAcc>=1){spawnCoin();spawnAcc--;}moveWorkers(dt);autoAcc+=dt;if(s.auto&&autoAcc>=4){autoAcc=0;convertSilver(true);convertGold(true);}updateUI();requestAnimationFrame(loop);}
function boot(){load();rebuildWorkers();drawTree();renderShop();bind();for(let i=0;i<4;i++)spawnCoin();addLog('V8 引擎启动成功');setInterval(save,5000);window.addEventListener('beforeunload',save);requestAnimationFrame(loop);}
try{boot();}catch(err){console.error(err);const log=$('#log');if(log)log.innerHTML='<div><strong>启动失败</strong> · '+err.message+'</div>';}
