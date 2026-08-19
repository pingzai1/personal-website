fetch('game.js?v=7',{cache:'no-store'})
  .then(r=>{if(!r.ok) throw new Error('game.js 加载失败 '+r.status); return r.text();})
  .then(src=>{
    src=src.replace("$$=s=>[...document.querySelectorAll(s)]","$$=s=>Array.from(document.querySelectorAll(s))");
    src=src.replace("星币')}$$('.tab')","星币')};$$('.tab')");
    new Function(src)();
  })
  .catch(err=>{
    console.error(err);
    const log=document.querySelector('#log');
    if(log) log.innerHTML='<div><strong>启动失败</strong> · '+err.message+'</div>';
  });