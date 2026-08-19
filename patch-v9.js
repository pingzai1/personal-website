// V9: unified coin value for talents. Copper=1, Silver=5, Gold=20.
function talentWalletValue(){return (state.copper||0)+(state.silver||0)*5+(state.gold||0)*20;}
function talentValueCost(n){const l=lv(n.id);const base=n.big?220:Math.max(20,(n.cost||1)*45);return Math.floor(base*Math.pow(1.65,l));}
function spendTalentValue(cost){let total=talentWalletValue();if(total<cost)return false;total-=cost;state.gold=Math.floor(total/20);total%=20;state.silver=Math.floor(total/5);state.copper=total%5;return true;}

const _v8UpdateUI=updateUI;
updateUI=function(){_v8UpdateUI();const p=document.querySelector('#points');if(p)p.textContent=fmt(talentWalletValue());};

showTip=function(n,e){
 const level=lv(n.id),parent=n.parent?nodes.find(x=>x.id===n.parent):null,cost=talentValueCost(n);
 const tip=document.querySelector('#tooltip');
 tip.innerHTML=`<div class="type">${n.type}</div><h3>${n.name}</h3><p>${n.desc}</p><div class="effect"><b>效果：</b> ${n.per}<br><span class="next">当前 ${level}/${n.max}</span></div><div class="req">${parent?'前置：'+parent.name:'起始节点'}</div><div class="cost">${level>=n.max?'已满级':'升级需要：'+fmt(cost)+' 硬币价值'}</div>`;
 tip.style.display='block';moveTip(e);
};

buyTalent=function(n){
 const level=lv(n.id);if(level>=n.max)return toast('已经满级');if(n.parent&&!lv(n.parent))return toast('先点前置天赋');
 const cost=talentValueCost(n);if(talentWalletValue()<cost)return toast('硬币价值不足，需要 '+fmt(cost));
 spendTalentValue(cost);state.talents[n.id]=level+1;drawTree();renderShop();save();toast('消耗 '+fmt(cost)+' 价值升级');
};

// Remove the old talent-point purchase card and explain the unified values.
const pointCard=document.querySelector('#buyPoint')?.closest('.card');
if(pointCard){pointCard.innerHTML='<div><div class="cardTop"><strong>硬币价值</strong><span>统一支付</span></div><p>铜币 = 1 价值 · 银币 = 5 价值 · 金币 = 20 价值。升级天赋时自动合并计算并找零。</p></div><div class="btn green" style="cursor:default;text-align:center">直接点击右侧天赋升级</div>';}
const pointLabel=document.querySelector('.topstats .stat:nth-child(2) span');if(pointLabel)pointLabel.textContent='硬币价值';
const title=document.querySelector('.brand h1 small');if(title)title.textContent='V9';
addLog('V9：天赋改为统一硬币价值购买');
updateUI();drawTree();