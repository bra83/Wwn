'use strict';
(function(){
  const FOG_DIRS=[{q:1,r:0},{q:1,r:-1},{q:0,r:-1},{q:-1,r:0},{q:-1,r:1},{q:0,r:1}];

  function fogKey(q,r){return typeof key==='function'?key(q,r):`${q},${r}`}
  function clearLegacyFog(){document.querySelectorAll('#map .fog-unknown').forEach(el=>el.remove())}

  function addWisp(layer,x,y,angle,variant=0){
    const w=document.createElement('div');
    w.className='frontier-fog-wisp';
    w.style.left=x+'px';
    w.style.top=y+'px';
    w.style.setProperty('--fog-angle',(angle+(variant===0?-5:variant===1?7:1))+'deg');
    if(variant===1)w.style.opacity='.68';
    if(variant===2)w.style.opacity='.82';
    layer.appendChild(w);
  }

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
        const dx=ncx-cx,dy=ncy-cy;
        const angle=Math.atan2(dy,dx)*180/Math.PI;

        /* Três bancos sobrepostos no lado desconhecido da fronteira. Os hexes
           revelados ficam acima desta camada, então nunca recebem a névoa. */
        addWisp(fogLayer,cx+dx*.61,cy+dy*.61,angle,0);
        addWisp(fogLayer,cx+dx*.82,cy+dy*.82,angle,1);
        if(idx%2===0)addWisp(fogLayer,cx+dx*.98,cy+dy*.98,angle,2);
      });
    });

    canvas.appendChild(fogLayer);
    canvas.appendChild(questionLayer);
  }

  const exact=new Map([
    ['Feature','Relevo'],['Features','Relevos'],['Sem feature','Sem relevo especial'],
    ['Fog','Névoa'],['POI','Local'],['POIs','Locais'],
    ['Home','Início'],['Character','Personagem'],['Characters','Personagens'],
    ['Search','Buscar'],['Layers','Camadas'],['Notes','Notas'],['Current','Atual'],
    ['Selected','Selecionado'],['Travel','Viagem'],['Settings','Configurações'],
    ['Favorites','Favoritos'],['Sessions','Sessões'],['Combat','Combate'],
    ['Main Action','Ação principal'],['Move Action','Movimento'],['Total Defense','Defesa total'],
    ['Main','Principal'],['Move','Movimento'],['Rules','Regras'],['Skills','Perícias'],
    ['Encounter','Encontro'],['Damage','Dano'],['Attack','Ataque'],['Defense','Defesa'],
    ['Inventory','Inventário'],['World','Mundo'],['Map','Mapa']
  ]);

  const phrases=[
    ['Terreno, feature ou local...','Terreno, relevo ou local...'],
    ['Montanhas, lagos, costas, vulcões e outras features','Montanhas, lagos, costas, vulcões e outros relevos'],
    ['Fog contextual de terreno e clima','Névoa na fronteira da área conhecida'],
    ['Nomes dos POIs descobertos no mapa','Nomes dos locais descobertos no mapa'],
    ['Locais descobertos sobre os hexes','Locais descobertos nos hexes'],
    ['Main Action usada','Ação principal usada'],
    ['Move Action usada','Movimento usado'],
    ['Total Defense selecionada','Defesa total selecionada'],
    ['Worlds Without Number','Worlds Without Number']
  ];

  function translateString(s){
    if(!s)return s;
    let out=s;
    for(const [a,b] of phrases)out=out.split(a).join(b);
    const trimmed=out.trim();
    if(exact.has(trimmed))out=out.replace(trimmed,exact.get(trimmed));
    else{
      const wordPairs=[['Feature','Relevo'],['feature','relevo'],['Features','Relevos'],['features','relevos'],['POIs','locais'],['POI','local'],['Fog','Névoa'],['fog','névoa']];
      for(const [a,b] of wordPairs)out=out.replace(new RegExp(`\\b${a}\\b`,'g'),b);
    }
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
