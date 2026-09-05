'use strict';
/* ATLAS_POI_SEED_V15 — POIs esparsos e coerentes; a maioria dos hexes não possui POI. */
(function(){
  if(typeof byKey==='undefined'||typeof knownPOIs==='undefined'||typeof wwnRenderMap!=='function')return;

  const seeds=[
    ['0,0','farmland',null,'farmVillage'],
    ['1,0','meadow',null,null],
    ['-1,0','lush','lake',null],
    ['0,-1','highland','foothills_rocky',null],
    ['1,-1','highland','mountains_low',null],
    ['-1,1','farmland',null,'bridge'],
    ['0,1','meadow',null,null],
    ['1,1','farmland',null,null],
    ['0,-2','meadow',null,'abandoned'],
    ['-1,-1','deciduous',null,null],
    ['1,-2','pine',null,null]
  ];

  seeds.forEach(([id,base,feature,poi])=>{
    const t=byKey[id];
    if(!t)return;
    t.base=base;
    t.feature=feature;
    t.poi=poi;
    t.seen=true;
    if(poi)knownPOIs.add(id);else knownPOIs.delete(id);
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
