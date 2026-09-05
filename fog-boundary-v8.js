'use strict';
(function(){
  const FOG_DIRS=[{q:1,r:0},{q:1,r:-1},{q:0,r:-1},{q:-1,r:0},{q:-1,r:1},{q:0,r:1}];

  function fogKey(q,r){return typeof key==='function'?key(q,r):`${q},${r}`}

  function clearLegacyFog(){document.querySelectorAll('#map .fog-unknown').forEach(el=>el.remove())}

  function renderFrontierFogV8(){
    if(typeof world==='undefined'||typeof pos!=='function'||typeof bounds!=='function')return;
    const canvas=document.getElementById('mapCanvas');
    if(!canvas)return;
    canvas.querySelectorAll('.frontier-fog-layer,.unseen-question-layer').forEach(el=>el.remove());
    clearLegacyFog();

    const b=bounds();
    const fogLayer=document.createElement('div');
    fogLayer.className='frontier-fog-layer';
    const questionLayer=document.createElement('div');
    questionLayer.className='unseen-question-layer';

    world.forEach((t)=>{
      const p=pos(t.q,t.r);
      const cx=p.x-b.minX+30+HEX_W/2;
      const cy=p.y-b.minY+30+HEX_H/2;

      if(!t.seen){
        const q=document.createElement('div');
        q.className='unseen-question';
        q.style.left=cx+'px';
        q.style.top=cy+'px';
        q.textContent='?';
        questionLayer.appendChild(q);
        return;
      }

      FOG_DIRS.forEach((d,idx)=>{
        const nq=t.q+d.q,nr=t.r+d.r;
        const n=(typeof byKey!=='undefined'&&byKey)?byKey[fogKey(nq,nr)]:null;
        if(n&&n.seen)return;
        const np=pos(nq,nr);
        const ncx=np.x-b.minX+30+HEX_W/2;
        const ncy=np.y-b.minY+30+HEX_H/2;
        const x=cx+(ncx-cx)*0.70;
        const y=cy+(ncy-cy)*0.70;
        const angle=Math.atan2(ncy-cy,ncx-cx)*180/Math.PI;
        const w=document.createElement('div');
        w.className='frontier-fog-wisp';
        w.style.left=x+'px';
        w.style.top=y+'px';
        w.style.setProperty('--fog-angle',(angle+(idx%2?5:-4))+'deg');
        fogLayer.appendChild(w);
      });
    });

    canvas.appendChild(fogLayer);
    canvas.appendChild(questionLayer);
  }

  const replacements=new Map([
    ['Feature','Relevo'],['Features','Relevos'],['Sem feature','Sem relevo especial'],
    ['Fog','Névoa'],['POIs','Locais'],['POI','Local'],
    ['Home','Início'],['Character','Personagem'],['Characters','Personagens'],
    ['Search','Buscar'],['Layers','Camadas'],['Notes','Notas'],['Current','Atual'],
    ['Selected','Selecionado'],['Travel','Viagem'],['Settings','Configurações'],
    ['Favorites','Favoritos'],['Sessions','Sessões'],['Combat','Combate'],
    ['Main Action','Ação principal'],['Move Action','Movimento'],['Total Defense','Defesa total'],
    ['Main','Principal'],['Move','Movimento'],['Rules','Regras'],['Skills','Perícias']
  ]);

  function translateString(s){
    let out=s;
    const phrases=[
      ['Terreno, feature ou local...','Terreno, relevo ou local...'],
      ['Montanhas, lagos, costas, vulcões e outras features','Montanhas, lagos, costas, vulcões e outros relevos'],
      ['Fog contextual de terreno e clima','Névoa na fronteira da área conhecida'],
      ['Nomes dos POIs descobertos no mapa','Nomes dos locais descobertos no mapa'],
      ['Locais descobertos sobre os hexes','Locais descobertos nos hexes']
    ];
    for(const [a,b] of phrases)out=out.split(a).join(b);
    if(replacements.has(out.trim()))out=out.replace(out.trim(),replacements.get(out.trim()));
    return out;
  }

  function localizeNode(root=document){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let n;
    while((n=walker.nextNode()))nodes.push(n);
    nodes.forEach(t=>{const next=translateString(t.nodeValue);if(next!==t.nodeValue)t.nodeValue=next});
    root.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(el=>{
      ['placeholder','title','aria-label'].forEach(attr=>{if(el.hasAttribute(attr)){const v=el.getAttribute(attr),nv=translateString(v);if(nv!==v)el.setAttribute(attr,nv)}})
    });
  }

  if(typeof wwnFeatureLabel==='function')wwnFeatureLabel=function(t){return t.feature?FEATURES[t.feature].name:'Sem relevo especial'};

  if(typeof appApplyFog==='function')appApplyFog=function(){
    clearLegacyFog();
    document.body.classList.toggle('fog-disabled',!(typeof appState!=='undefined'&&appState.fog));
    renderFrontierFogV8();
  };

  if(typeof wwnRenderMap==='function'){
    const previousRender=wwnRenderMap;
    wwnRenderMap=function(){previousRender();renderFrontierFogV8();localizeNode(document)};
    if(typeof render!=='undefined')render=wwnRenderMap;
  }

  const observer=new MutationObserver(muts=>{
    muts.forEach(m=>m.addedNodes.forEach(node=>{
      if(node.nodeType===1)localizeNode(node);
      else if(node.nodeType===3){const nv=translateString(node.nodeValue);if(nv!==node.nodeValue)node.nodeValue=nv}
    }));
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  function boot(){clearLegacyFog();renderFrontierFogV8();localizeNode(document)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else setTimeout(boot,0);

  window.renderFrontierFogV8=renderFrontierFogV8;
})();
