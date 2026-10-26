import {SOURCES,validateRecipe,filterRecipes,safeHttps,validateWorldFavourites,recipePage,RECIPE_COURSES} from './selected-sources.js';
import {ingredientPhoto} from './ingredient-photos.js';
import {ingredientReference} from './ingredient-reference.js';
import {loadStore,readStoreStrict,persistStore,localStoreStatus,STORAGE_KEY} from './model.js';
import {collectedMeal,toggleCollectedFlag} from './selected-kitchen.js';
import {collectionJson} from './collection-request.js';
import {readSelectedRoute,selectedRouteUrl} from './selected-navigation.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,label,extra='')=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" '+extra+'>'+esc(label)+'</a>';
const form=document.getElementById('selected-filters'),status=document.getElementById('selected-status'),results=document.getElementById('selected-results');
let recipes=[],photos=[],snapshot=null,worldFavourites=null,worldIds=new Set(),pageNumber=1,appliedFilters=null,savedState=loadStore().saved;
let catalogueReady=false,metadataStarted=false,optionsReady=false,formTouched=false,restorePending=false;
let photoState='loading',curationState='loading',curationPayload=null,curationFetched=false,photoRequest=0,curationRequest=0;
const reference=line=>'<div data-ingredient-reference="'+esc(line)+'">'+ingredientReference(line,photos)+'</div>';
function recipeCard(r) {
 const saved=savedState['selected-'+r.id]||{};
 const saveButtons=['wanted','usual'].map(field=>'<button type="button" class="btn secondary small" data-save-recipe="'+esc(r.id)+'" data-save-flag="'+field+'" aria-pressed="'+Boolean(saved[field])+'">'+(saved[field]?'✓ ':'+ ')+(field==='wanted'?'Want to try':'My usual dishes')+'</button>').join('');
 const source=SOURCES.find(s=>s.id===r.source),rating=r.rating;
 const count=rating?.count===null?'Vote count not collected':rating?rating.count.toLocaleString()+' '+(rating.countType==='ratings'?'rating votes':'reviews'):'';
 const ratingText=rating?rating.value+' / '+rating.best:'Rating not collected';
 return '<article class="selected-card" data-recipe-id="'+esc(r.id)+'">'+(r.photoUrl?'<a class="selected-recipe-photo" href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(r.photoUrl)+'" alt="'+esc(r.title)+' — original publisher photograph" loading="lazy" referrerpolicy="no-referrer"></a>':'')+
  '<div class="selected-card-content">'+'<p class="selected-curation-label" data-world-id="'+esc(r.id)+'"'+(worldIds.has(r.id)?'':' hidden')+'>World favourite</p>'+'<p class="eyebrow">'+esc(source.name)+'</p><h2>'+esc(r.title)+'</h2>'+(r.author?'<p class="panel-note">By '+esc(r.author)+'</p>':'')+
  '<p class="source-rating"><strong>'+esc(ratingText)+'</strong> <span>'+esc(count)+'</span></p><p class="panel-note">'+esc([r.cuisine,r.category].filter(Boolean).join(' · '))+'</p>'+link(r.url,'Open original recipe ↗','class="btn secondary"')+'<div class="selected-save-actions">'+saveButtons+'<a class="btn ghost small" data-return-recipe="'+esc(r.id)+'" href="./?recipe='+esc(collectedMeal(r).idMeal)+'">Open in my kitchen →</a></div>'+
  '<p class="panel-note source-check-date">Rating checked '+esc(new Date(r.checkedAt).toLocaleDateString('en-GB'))+'. Publisher labels and linked photo; cuisine authenticity is not independently certified.</p>'+
  '<details class="selected-ingredients"><summary>'+r.ingredients.length+' ingredients · see photographs</summary><ul>'+r.ingredients.map(line=>'<li>'+reference(line)+'<span class="source-ingredient-text">'+esc(line)+'</span></li>').join('')+'</ul></details></div></article>';
}
function readFilters(){const data=new FormData(form);return readSelectedRoute(selectedRouteUrl(location.href,{query:data.get('query'),source:data.get('source'),course:data.get('course'),sort:data.get('sort'),ratedOnly:data.has('ratedOnly'),collection:data.get('collection')}));}
function writeFields(route){
 for(const key of ['query','source','course','sort','collection'])document.getElementById('selected-'+key).value=route[key]||'';
 document.getElementById('selected-rated').checked=route.ratedOnly;
}
function rememberPosition(recipeId){
 history.replaceState({...history.state,tasteitSelected:true,selectedScrollY:window.scrollY||0,selectedFocus:recipeId||document.activeElement?.dataset?.returnRecipe||null},'',location.href);
}
function commitRoute(push=false){
 const url=selectedRouteUrl(location.href,{...appliedFilters,page:pageNumber});
 if(push&&url!==location.href){rememberPosition();history.pushState({tasteitSelected:true,selectedScrollY:0,selectedFocus:null},'',url);}
 else history.replaceState({...history.state,tasteitSelected:true},'',url);
}
function restorePosition(){
 if(!restorePending)return;restorePending=false;
 const state=history.state,href=location.href;
 if(!state?.tasteitSelected)return;
 setTimeout(()=>{
  if(location.href!==href)return;
  const id=state.selectedFocus;
  if(typeof id==='string'&&/^[A-Za-z0-9-]{1,200}$/.test(id))results.querySelector('[data-return-recipe="'+id+'"]')?.focus({preventScroll:true});
  window.scrollTo?.(0,Number.isFinite(state.selectedScrollY)?Math.max(0,state.selectedScrollY):0);
 },0);
}
function optionalStatus(){
 const node=document.getElementById('selected-load-status');if(!node)return;
 node.innerHTML=(photoState==='error'?'Ingredient photos are unavailable. <button class="btn ghost small" type="button" data-retry="photos">Retry photos</button>':photoState==='loading'?'Ingredient photos are loading. ':'')+
  (curationState==='error'?' World favourites metadata is unavailable. <button class="btn ghost small" type="button" data-retry="curation">Retry collection</button>':'');
}
function render() {
 const health=localStoreStatus(),saveStatus=document.getElementById('selected-save-status');
 if(!['ready','empty'].includes(health.status)&&saveStatus)saveStatus.innerHTML='Your cookbook needs attention. <a href="./?view=library">Open recovery options →</a> Browsing is still available.';
 const filters=appliedFilters||readFilters();
 if(filters.collection&&curationState==='loading'){status.textContent='Loading your world favourites collection…';results.innerHTML='';document.getElementById('selected-pagination').hidden=true;return;}
 const visible=filterRecipes(recipes,{...filters,recipeIds:filters.collection?(worldFavourites?.recipeIds||[]):null});
 const current=recipePage(visible,pageNumber);pageNumber=current.page;
 status.textContent=visible.length+' of '+recipes.length+' collected recipes · '+recipes.filter(r=>r.rating).length+' have a published recipe rating · Showing '+current.start+'–'+current.end;
 results.innerHTML=visible.length?current.records.map(recipeCard).join(''):'<div class="empty-state"><h2>No recipes match yet</h2><p>Try another ingredient, meal type or website, or include recipes without a published rating.</p><button type="button" class="btn secondary" id="selected-reset">Clear filters</button></div>';
 const pager=document.getElementById('selected-pagination');
 pager.hidden=current.pages===1;pager.innerHTML='<button type="button" class="btn secondary" data-page="previous"'+(current.page===1?' disabled':'')+'>← Previous</button><span>Page '+current.page+' of '+current.pages+'</span><button type="button" class="btn secondary" data-page="next"'+(current.page===current.pages?' disabled':'')+'>Next →</button>';
 photoCoverage(current.records);restorePosition();
}
function photoCoverage(rows){
 const filters=appliedFilters||readFilters(),current=rows||recipePage(filterRecipes(recipes,{...filters,recipeIds:filters.collection?(worldFavourites?.recipeIds||[]):null}),pageNumber).records;
 const total=current.reduce((n,r)=>n+r.ingredients.length,0),matched=current.reduce((n,r)=>n+r.ingredients.filter(i=>ingredientPhoto(i,photos)).length,0);
 const node=document.getElementById('selected-photo-coverage');if(node)node.textContent=matched+' of '+total+' ingredient rows on this page have a verified reference photograph. Missing or ambiguous ingredients keep an explicit photo gap.';
}
function resolveCuration(){
 if(!curationFetched||!catalogueReady)return;
 try{worldFavourites=validateWorldFavourites(curationPayload,recipes);worldIds=new Set(worldFavourites.recipeIds);curationState='ready';}
 catch{worldFavourites=null;worldIds=new Set();curationState='error';}
 if(curationState==='error'&&appliedFilters?.collection){
  appliedFilters={...appliedFilters,collection:''};pageNumber=1;
  const select=document.getElementById('selected-collection');if(select.value==='world-favourites-100')select.value='';
  document.getElementById('selected-collection-note').textContent='That collection is unavailable; showing all collected recipes.';
 }
 const summary=document.getElementById('selected-world-summary'),link=document.getElementById('selected-world-link');
 link.hidden=!worldFavourites;summary.hidden=!worldFavourites;if(worldFavourites)summary.textContent=worldFavourites.summary;
 for(const badge of results.querySelectorAll('[data-world-id]'))badge.hidden=!worldIds.has(badge.dataset.worldId);
 optionalStatus();
}
async function loadPhotos(){
 const ticket=++photoRequest;photoState='loading';optionalStatus();
 try{const data=await collectionJson('./data/ingredient-photos.json');if(ticket!==photoRequest)return;if(!Array.isArray(data.photos))throw Error('Invalid photo registry');photos=data.photos;photoState='ready';}
 catch{if(ticket!==photoRequest)return;photos=[];photoState='error';}
 for(const cell of results.querySelectorAll('[data-ingredient-reference]'))cell.innerHTML=ingredientReference(cell.dataset.ingredientReference,photos);
 if(catalogueReady)photoCoverage();optionalStatus();
}
async function loadCuration(){
 const ticket=++curationRequest;curationState='loading';curationFetched=false;optionalStatus();
 try{const data=await collectionJson('./data/world-favourites-100.json');if(ticket!==curationRequest)return;curationPayload=data;}
 catch{if(ticket!==curationRequest)return;curationPayload=null;}
 curationFetched=true;const waiting=Boolean(appliedFilters?.collection);resolveCuration();
 if(catalogueReady&&waiting){render();commitRoute();}
}
function applyRoute(){
 appliedFilters=readSelectedRoute(location.href);pageNumber=appliedFilters.page;writeFields(appliedFilters);formTouched=false;restorePending=true;
 resolveCuration();render();commitRoute();
}
form.addEventListener('input',()=>{formTouched=true;});
form.addEventListener('submit',event=>{
 event.preventDefault();if(!catalogueReady)return;
 appliedFilters=readFilters();writeFields(appliedFilters);pageNumber=1;formTouched=false;restorePending=false;
 document.getElementById('selected-collection-note').textContent='';resolveCuration();commitRoute(true);render();commitRoute();
});
results.addEventListener('click',event=>{
 const returnLink=event.target.closest('[data-return-recipe]');if(returnLink)rememberPosition(returnLink.dataset.returnRecipe);
 if(event.target.id==='selected-reset'){form.reset();appliedFilters=readFilters();pageNumber=1;commitRoute(true);render();commitRoute();form.querySelector('input').focus();return;}
 const button=event.target.closest('[data-save-recipe]');if(!button)return;
 const record=recipes.find(r=>r.id===button.dataset.saveRecipe),field=button.dataset.saveFlag;if(!record)return;
 const message=document.getElementById('selected-save-status');
 try{
  const next=toggleCollectedFlag(readStoreStrict(),record,field);
  if(!persistStore(next))throw new Error('Your browser could not save this recipe. Nothing changed.');
  savedState=next.saved;render();
  document.querySelector('[data-save-recipe="'+record.id+'"][data-save-flag="'+field+'"]')?.focus();
  message.textContent=(next.saved['selected-'+record.id]?.[field]?'Saved to ':'Removed from ')+(field==='wanted'?'Want to try':'My usual dishes')+'. Find your saved lists on the home page.';
 }catch(error){message.textContent=error.message||'Could not save your recipe. Nothing changed.';}
});
document.getElementById('selected-pagination').addEventListener('click',event=>{
 const button=event.target.closest('[data-page]');if(!button||button.disabled)return;
 pageNumber+=button.dataset.page==='next'?1:-1;restorePending=false;commitRoute(true);render();commitRoute();status.focus({preventScroll:true});status.scrollIntoView({block:'start'});
});
document.getElementById('selected-load-status')?.addEventListener('click',event=>{const retry=event.target.closest('[data-retry]');if(retry?.dataset.retry==='photos')void loadPhotos();if(retry?.dataset.retry==='curation')void loadCuration();});
results.addEventListener('error',event=>{
 const image=event.target;if(image.tagName!=='IMG')return;
 if(image.closest('.ingredient-reference')){const message=document.createElement('span');message.className='ingredient-photo-missing';message.textContent='Photo unavailable';image.replaceWith(message);}
 else {image.closest('.selected-recipe-photo')?.remove();}
},true);
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY){savedState=loadStore().saved;if(catalogueReady)render();}});
window.addEventListener('popstate',()=>{if(catalogueReady)applyRoute();});
async function boot(){
 if(!metadataStarted){metadataStarted=true;void loadPhotos();void loadCuration();}
 try {
  snapshot=await collectionJson('./data/selected-recipes.json');if(!Array.isArray(snapshot.recipes)||snapshot.recipes.length>2500)throw Error('Invalid collection');
  recipes=snapshot.recipes.map(validateRecipe);catalogueReady=true;
  if(!optionsReady){
   const collectionSelect=document.getElementById('selected-collection'),option=document.createElement('option');option.value='world-favourites-100';option.textContent='100 world favourites';collectionSelect.appendChild(option);
   const select=document.getElementById('selected-source');for(const s of SOURCES){const option=document.createElement('option');option.value=s.id;option.textContent=s.name+' ('+recipes.filter(r=>r.source===s.id).length+')';select.appendChild(option);}
   const courseSelect=document.getElementById('selected-course');for(const course of RECIPE_COURSES){const option=document.createElement('option');option.value=course.id;option.textContent=course.label;courseSelect.appendChild(option);}optionsReady=true;
  }
  document.getElementById('selected-coverage').innerHTML='<p>'+recipes.length+' collected recipes from '+new Set(recipes.map(r=>r.source)).size+' of your 16 selected websites. This collection does not establish worldwide coverage.</p><p id="selected-photo-coverage"></p><ul>'+SOURCES.map(s=>'<li><strong>'+esc(s.name)+'</strong>: '+recipes.filter(r=>r.source===s.id).length+' collected'+(recipes.some(r=>r.source===s.id)?'':' · '+link('https://'+s.hosts[0]+'/','Open source; collection unavailable in this pass'))+'</li>').join('')+'</ul><p class="panel-note">Ingredient photographs: Wikimedia Commons, with original-file, creator and licence links beside every picture. Only visibly reviewed photographs are used. Photo references are for identification, not food-safety or allergen certification.</p>';
  appliedFilters=readSelectedRoute(location.href);pageNumber=appliedFilters.page;if(!formTouched)writeFields(appliedFilters);restorePending=true;
  if(new URL(location.href).searchParams.get('collection')&&!appliedFilters.collection)document.getElementById('selected-collection-note').textContent='That collection is unavailable; showing all collected recipes.';
  resolveCuration();render();commitRoute();optionalStatus();
 }catch{status.textContent='The collection could not load. Reconnect and retry.';results.innerHTML='<button type="button" class="btn secondary" id="selected-retry">Retry recipes</button> <a href="./?view=library">Open your saved recipes</a>';}
}
results.addEventListener('click',event=>{if(event.target.id==='selected-retry')void boot();});
void boot();
