'use strict';
const WWN_UI_STORAGE='wwn_atlas_ui_v5';
const wwnUiSaved=JSON.parse(localStorage.getItem(WWN_UI_STORAGE)||'null')||{};
let wwnSelectedIndex=Number.isInteger(wwnUiSaved.selectedIndex)?wwnUiSaved.selectedIndex:current;
let wwnLayers=Object.assign({features:true,pois:true,mist:true,labels:true},wwnUiSaved.layers||{});
let wwnNotes=wwnUiSaved.notes||{};

function wwnSaveUi(){localStorage.setItem(WWN_UI_STORAGE,JSON.stringify({selectedIndex:wwnSelectedIndex,layers:wwnLayers,notes:wwnNotes}))}
function wwnTileId(t){return key(t.q,t.r)}
function wwnSelectedTile(){return world[wwnSelectedIndex]||currentTile()}
function wwnIsKnownPoi(t){return !!(t.poi&&knownPOIs.has(wwnTileId(t)))}
function wwnVisualAsset(t){if(wwnIsKnownPoi(t))return POIS[t.poi].asset;if(t.feature&&wwnLayers.features)return FEATURES[t.feature].asset;return BASES[t.base].asset}
function wwnStateText(t){const id=wwnTileId(t);if(id===wwnTileId(currentTile()))return'posição atual';if(t.visited)return'visitado';if(t.seen)return'visto';return'desconhecido'}
function wwnCanTravel(t){return dist(currentTile(),t)===1}
function wwnPoiLabel(t){return wwnIsKnownPoi(t)?POIS[t.poi].name:''}
function wwnFeatureLabel(t){return t.feature?FEATURES[t.feature].name:'Sem feature'}
function wwnTerrainDescription(t){const base=BASES[t.base];const feature=t.feature?FEATURES[t.feature].name:null;const poi=wwnIsKnownPoi(t)?POIS[t.poi].name:null;let s=`${base.name} • ${base.climate}`;if(feature)s+=` • ${feature}`;if(poi)s+=` • ${poi}`;return s}

function wwnBuildUi(){
  const meta=document.querySelector('#explorar .worldmeta');
  if(meta&&!document.getElementById('atlasCommandbar'))meta.insertAdjacentHTML('afterend',`<div class="atlas-commandbar" id="atlasCommandbar"><button onclick="wwnOpenSearch()"><span class="ico">⌕</span>Buscar</button><button onclick="wwnOpenLayers()"><span class="ico">▱</span>Camadas</button><button onclick="wwnOpenNotes()"><span class="ico">▤</span>Notas</button></div>`);
  const map=document.getElementById('map');
  if(map&&!document.getElementById('selectedHexPanel'))map.insertAdjacentHTML('afterend',`<div class="card hex-detail" id="selectedHexPanel"><div class="hex-detail-hero"><div class="hex-detail-art" id="selectedHexArt"></div><div class="hex-detail-copy"><div class="coordline" id="selectedHexCoord">Q 0 • R 0</div><h2 id="selectedHexTitle">Hex selecionado</h2><div class="muted" id="selectedHexDesc">Selecione um hex.</div><div class="detail-state" id="selectedHexState"></div></div></div><div class="detail-grid"><div class="detail-cell"><span>Jornada</span><b id="selectedTravelCost">—</b></div><div class="detail-cell"><span>Terreno</span><b id="selectedTerrain">—</b></div><div class="detail-cell"><span>Feature</span><b id="selectedFeature">—</b></div><div class="detail-cell"><span>Local</span><b id="selectedPoi">—</b></div></div><div class="detail-note" id="selectedNotePreview">Sem notas neste hex.</div><div class="detail-actions"><button class="action primary" id="travelSelectedBtn" onclick="wwnTravelSelected()">⌖ Viajar para este hex</button><button class="action icon-action" onclick="wwnOpenNotes()" aria-label="editar nota">▤</button></div></div>`);
  if(!document.getElementById('atlasModal'))document.body.insertAdjacentHTML('beforeend',`<div class="atlas-modal" id="atlasModal" onclick="wwnModalBackdrop(event)"><div class="atlas-sheet" id="atlasSheet"></div></div>`);
}

function wwnApplyLayerClasses(){const map=document.getElementById('map');if(!map)return;map.classList.toggle('hide-features',!wwnLayers.features);map.classList.toggle('hide-pois',!wwnLayers.pois);map.classList.toggle('hide-mist',!wwnLayers.mist);map.classList.toggle('hide-labels',!wwnLayers.labels)}

function wwnRenderMap(){
  const c=document.getElementById('mapCanvas');if(!c)return;c.innerHTML='';const b=bounds();c.style.width=(b.maxX-b.minX+120)+'px';c.style.height=(b.maxY-b.minY+120)+'px';
  world.forEach((t,i)=>{const p=pos(t.q,t.r),id=wwnTileId(t),known=wwnIsKnownPoi(t),e=document.createElement('div');e.className=`hex ${t.seen?'seen':''} ${t.visited?'visited':''} ${t.mist?'misty':''} ${i===current?'current':''} ${i===wwnSelectedIndex?'selected':''} ${known?'poi-known':''}`;e.style.left=(p.x-b.minX+30)+'px';e.style.top=(p.y-b.minY+30)+'px';
    const label=known?`<div class="poi-label">${escapeHTML(POIS[t.poi].name)}</div>`:'';
    const sel=i===wwnSelectedIndex&&i!==current?'<div class="selected-marker">selecionado</div>':'';
    const here=i===current?'<div class="current-marker">grupo</div>':'';
    e.innerHTML=`<div class="layer base"></div>${t.feature?'<div class="layer feature"></div>':''}<div class="layer mist"></div><div class="shade"></div>${t.poi?'<div class="poi"></div>':''}${label}${sel}${here}<div class="mark">${i===current?'⌖':(t.seen?'':'?')}</div>`;
    e.querySelector('.base').style.backgroundImage=`url("${BASES[t.base].asset}")`;
    if(t.feature)e.querySelector('.feature').style.backgroundImage=`url("${FEATURES[t.feature].asset}")`;
    if(t.poi)e.querySelector('.poi').style.backgroundImage=`url("${POIS[t.poi].asset}")`;
    e.addEventListener('click',()=>{if(drag.moved)return;wwnSelectHex(i)});c.appendChild(e)
  });
  applyPanZoom();wwnApplyLayerClasses();showTile(currentTile());renderLocationPanel();renderEvent();renderMasterState();wwnRenderSelectedPanel();saveState();wwnSaveUi();
}

render=wwnRenderMap;

function wwnSelectHex(i,center=false){if(!world[i])return;wwnSelectedIndex=i;wwnRenderMap();if(center)wwnCenterOn(i)}
function wwnCenterOn(i){const map=document.getElementById('map'),c=document.getElementById('mapCanvas'),t=world[i];if(!map||!c||!t)return;const b=bounds(),p=pos(t.q,t.r),cx=(p.x-b.minX+30+HEX_W/2)*zoom,cy=(p.y-b.minY+30+HEX_H/2)*zoom;pan.x=map.clientWidth/2-cx;pan.y=map.clientHeight/2-cy;clampPan();applyPanZoom();saveState()}
function wwnTravelSelected(){const t=wwnSelectedTile();if(!t)return;if(wwnSelectedIndex===current){toast('O grupo já está neste hex.');return}if(!wwnCanTravel(t)){toast('Selecione um hex adjacente ao grupo para viajar.');return}travel(wwnSelectedIndex);wwnSelectedIndex=current;wwnRenderMap();requestAnimationFrame(()=>wwnCenterOn(current))}

function wwnRenderSelectedPanel(){const t=wwnSelectedTile();if(!t)return;const id=wwnTileId(t),known=wwnIsKnownPoi(t),unknown=!t.seen&&wwnSelectedIndex!==current;document.getElementById('selectedHexCoord').textContent=`Q ${t.q} • R ${t.r}`;document.getElementById('selectedHexTitle').textContent=unknown?'Território desconhecido':known?POIS[t.poi].name:BASES[t.base].name;document.getElementById('selectedHexDesc').textContent=unknown?'A composição deste hex ainda não foi revelada.':wwnTerrainDescription(t);document.getElementById('selectedHexArt').style.backgroundImage=unknown?'none':`url("${wwnVisualAsset(t)}")`;document.getElementById('selectedTravelCost').textContent=unknown?'?':`~${BASES[t.base].cost}h`;document.getElementById('selectedTerrain').textContent=unknown?'?':BASES[t.base].name;document.getElementById('selectedFeature').textContent=unknown?'?':wwnFeatureLabel(t);document.getElementById('selectedPoi').textContent=unknown?'?':known?POIS[t.poi].name:(t.poi?'não identificado':'—');
  const state=document.getElementById('selectedHexState');state.innerHTML=`<span class="state-chip ${t.visited?'ok':''}">${wwnStateText(t)}</span>${known?`<span class="state-chip ${POIS[t.poi].type==='perigoso'?'warn':'ok'}">${POIS[t.poi].type}</span>`:''}`;
  const note=wwnNotes[id]||'';document.getElementById('selectedNotePreview').textContent=note||'Sem notas neste hex.';
  const btn=document.getElementById('travelSelectedBtn');if(wwnSelectedIndex===current){btn.disabled=true;btn.textContent='⌖ Você está neste hex'}else if(wwnCanTravel(t)){btn.disabled=false;btn.textContent=`⌖ Viajar para este hex (~${BASES[t.base].cost}h)`}else{btn.disabled=true;btn.textContent='⌖ Fora do alcance imediato'}
}

function wwnOpenModal(html){const m=document.getElementById('atlasModal'),s=document.getElementById('atlasSheet');s.innerHTML=html;m.classList.add('open')}
function wwnCloseModal(){document.getElementById('atlasModal')?.classList.remove('open')}
function wwnModalBackdrop(e){if(e.target.id==='atlasModal')wwnCloseModal()}
function wwnSheetHead(title){return`<div class="sheet-head"><h3>${title}</h3><button class="sheet-close" onclick="wwnCloseModal()">×</button></div>`}

function wwnOpenSearch(){wwnOpenModal(`${wwnSheetHead('Buscar no Atlas')}<input id="atlasSearchInput" placeholder="Terreno, feature ou local..." oninput="wwnSearchAtlas(this.value)"><div class="search-results" id="atlasSearchResults"></div>`);wwnSearchAtlas('');setTimeout(()=>document.getElementById('atlasSearchInput')?.focus(),40)}
function wwnSearchAtlas(q){const out=document.getElementById('atlasSearchResults');if(!out)return;const term=(q||'').trim().toLowerCase();const rows=[];world.forEach((t,i)=>{if(!t.seen&&!wwnIsKnownPoi(t))return;const known=wwnIsKnownPoi(t),name=known?POIS[t.poi].name:BASES[t.base].name,hay=[name,BASES[t.base].name,t.feature?FEATURES[t.feature].name:'',known?POIS[t.poi].name:'',`q ${t.q}`,`r ${t.r}`].join(' ').toLowerCase();if(term&&!hay.includes(term))return;rows.push({i,t,name,known})});rows.sort((a,b)=>Number(b.known)-Number(a.known)||dist(currentTile(),a.t)-dist(currentTile(),b.t));out.innerHTML=rows.slice(0,28).map(r=>`<button class="search-result" onclick="wwnChooseSearch(${r.i})"><span class="search-thumb" style="background-image:url('${wwnVisualAsset(r.t)}')"></span><span><b>${escapeHTML(r.name)}</b><small>Q ${r.t.q} • R ${r.t.r} • ${escapeHTML(BASES[r.t.base].name)}</small></span><span class="goto">›</span></button>`).join('')||'<div class="empty-result">Nenhum resultado conhecido.</div>'}
function wwnChooseSearch(i){wwnCloseModal();showView('explorar');wwnSelectedIndex=i;wwnRenderMap();requestAnimationFrame(()=>wwnCenterOn(i))}

function wwnToggleLayer(name){wwnLayers[name]=!wwnLayers[name];wwnSaveUi();wwnApplyLayerClasses();wwnOpenLayers()}
function wwnOpenLayers(){const rows=[['features','Relevo e água','Montanhas, lagos, costas, vulcões e outras features'],['pois','POIs','Locais descobertos sobre os hexes'],['mist','Neblina','Fog contextual de terreno e clima'],['labels','Rótulos','Nomes dos POIs descobertos no mapa']];wwnOpenModal(`${wwnSheetHead('Camadas')}<div class="layer-list">${rows.map(([id,n,d])=>`<div class="layer-row"><div><b>${n}</b><small>${d}</small></div><button class="switch ${wwnLayers[id]?'on':''}" onclick="wwnToggleLayer('${id}')"><i></i></button></div>`).join('')}</div>`)}

function wwnOpenNotes(){const t=wwnSelectedTile(),id=wwnTileId(t),note=wwnNotes[id]||'';wwnOpenModal(`${wwnSheetHead('Notas do hex')}<div class="coordline">Q ${t.q} • R ${t.r} — ${escapeHTML(t.seen?BASES[t.base].name:'território desconhecido')}</div><div style="height:9px"></div><textarea id="hexNoteInput" class="note-area" placeholder="Anotações do Mestre ou da sessão...">${escapeHTML(note)}</textarea><div class="sheet-actions"><button class="action" onclick="wwnClearNote()">Limpar</button><button class="action primary" onclick="wwnSaveNote()">Salvar nota</button></div>`)}
function wwnSaveNote(){const t=wwnSelectedTile(),id=wwnTileId(t),v=document.getElementById('hexNoteInput').value.trim();if(v)wwnNotes[id]=v;else delete wwnNotes[id];wwnSaveUi();wwnCloseModal();wwnRenderSelectedPanel();toast('Nota salva neste hex.')}
function wwnClearNote(){document.getElementById('hexNoteInput').value=''}

function wwnPrimeVisibleAssets(){
  [['0,-1','foothills_gentle','highland'],['1,-1','mountains_low','highland'],['-1,0','lake','lush']].forEach(([id,f,b])=>{const t=byKey[id];if(t){t.base=b;t.feature=f;t.seen=true}});
  ['0,0','1,1','-1,1'].forEach(id=>{const t=byKey[id];if(t){t.seen=true;if(t.poi)knownPOIs.add(id)}});
}

const wwnOldShowView=showView;
showView=function(v){wwnOldShowView(v);if(v==='explorar'){wwnBuildUi();wwnRenderMap();requestAnimationFrame(()=>wwnCenterOn(wwnSelectedIndex))}};

wwnBuildUi();wwnPrimeVisibleAssets();wwnSelectedIndex=Math.max(0,Math.min(world.length-1,wwnSelectedIndex));wwnRenderMap();wwnApplyLayerClasses();
