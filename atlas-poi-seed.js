'use strict';
/* ATLAS_POI_SEED_V14 — POIs visíveis e coerentes ao redor da área inicial. */
(function(){
  if(typeof byKey==='undefined'||typeof knownPOIs==='undefined'||typeof wwnRenderMap!=='function')return;
  const seeds=[
    ['0,0','farmland',null,'farmVillage'],
    ['1,0','meadow',null,'inn'],
    ['-1,0','lush','lake','shrine'],
    ['0,-1','highland','foothills_rocky','mine'],
    ['1,-1','highland','mountains_low','hillFort'],
    ['-1,1','farmland',null,'bridge'],
    ['0,1','meadow',null,'manor'],
    ['1,1','farmland',null,'town'],
    ['0,-2','meadow',null,'abandoned'],
    ['-1,-1','deciduous',null,'ruins'],
    ['1,-2','pine',null,'monastery']
  ];
  seeds.forEach(([id,base,feature,poi])=>{
    const t=byKey[id];
    if(!t)return;
    t.base=base;
    t.feature=feature;
    t.poi=poi;
    t.seen=true;
    knownPOIs.add(id);
  });
  const oldRender=wwnRenderMap;
  wwnRenderMap=function(){
    oldRender();
    document.querySelectorAll('.hex.poi-known').forEach(el=>{
      if(el.querySelector('.poi-sigil'))return;
      const label=el.querySelector('.poi-label');
      const text=(label?.textContent||'').toLowerCase();
      const dangerous=/ruína|assentamento abandonado|covil|caverna|tumba|cemitério|bandid|anomalia|cratera|máquina|portal|campo de batalha/.test(text);
      const sigil=document.createElement('div');
      sigil.className='poi-sigil'+(dangerous?' danger':'');
      sigil.textContent=dangerous?'☠':'✦';
      el.appendChild(sigil);
    });
  };
  render=wwnRenderMap;
  if(typeof saveState==='function')saveState();
  wwnRenderMap();
})();
