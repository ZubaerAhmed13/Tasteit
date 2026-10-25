import {SOURCES,validateRecipe,filterRecipes,safeHttps,validateWorldFavourites,recipePage,RECIPE_COURSES} from './selected-sources.js';
import {ingredientPhoto} from './ingredient-photos.js';
import {ingredientReference} from './ingredient-reference.js';
import {loadStore,readStoreStrict,persistStore,STORAGE_KEY} from './model.js';
import {collectedMeal,toggleCollectedFlag} from './selected-kitchen.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,label,extra='')=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" '+extra+'>'+esc(label)+'</a>';
const form=document.getElementById('selected-filters'),status=document.getElementById('selected-status'),results=document.getElementById('selected-results');
let recipes=[],photos=[],snapshot=null,worldFavourites=null,worldIds=new Set(),pageNumber=1,appliedFilters=null,savedState=loadStore().saved;
const reference=line=>ingredientReference(line,photos);
function recipeCard(r) {
 const saved=savedState['selected-'+r.id]||{};
 const saveButtons=['wanted','usual'].map(field=>'<button type="button" class="btn secondary small" data-save-recipe="'+esc(r.id)+'" data-save-flag="'+field+'" aria-pressed="'+Boolean(saved[field])+'">'+(saved[field]?'✓ ':'+ ')+(field==='wanted'?'Want to try':'My usual dishes')+'</button>').join('');
 const source=SOURCES.find(s=>s.id===r.source),rating=r.rating;
 const count=rating?.count===null?'Vote count not collected':rating?rating.count.toLocaleString()+' '+(rating.countType==='ratings'?'rating votes':'reviews'):'';
 const ratingText=rating?rating.value+' / '+rating.best:'Rating not collected';
 return '<article class="selected-card" data-recipe-id="'+esc(r.id)+'">'+(r.photoUrl?'<a class="selected-recipe-photo" href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(r.photoUrl)+'" alt="'+esc(r.title)+' — original publisher photograph" loading="lazy" referrerpolicy="no-referrer"></a>':'')+
  '<div class="selected-card-content">'+(worldIds.has(r.id)?'<p class="selected-curation-label">World favourite</p>':'')+'<p class="eyebrow">'+esc(source.name)+'</p><h2>'+esc(r.title)+'</h2>'+(r.author?'<p class="panel-note">By '+esc(r.author)+'</p>':'')+
  '<p class="source-rating"><strong>'+esc(ratingText)+'</strong> <span>'+esc(count)+'</span></p><p class="panel-note">'+esc([r.cuisine,r.category].filter(Boolean).join(' · '))+'</p>'+link(r.url,'Open original recipe ↗','class="btn secondary"')+'<div class="selected-save-actions">'+saveButtons+'<a class="btn ghost small" href="./?recipe='+esc(collectedMeal(r).idMeal)+'">Open in my kitchen →</a></div>'+
  '<p class="panel-note source-check-date">Rating checked '+esc(new Date(r.checkedAt).toLocaleDateString('en-GB'))+'. Publisher labels and linked photo; cuisine authenticity is not independently certified.</p>'+
  '<details class="selected-ingredients"><summary>'+r.ingredients.length+' ingredients · see photographs</summary><ul>'+r.ingredients.map(line=>'<li>'+reference(line)+'<span class="source-ingredient-text">'+esc(line)+'</span></li>').join('')+'</ul></details></div></article>';
}
function readFilters(){const data=new FormData(form);return {query:data.get('query'),source:data.get('source'),course:data.get('course'),sort:data.get('sort'),ratedOnly:data.has('ratedOnly'),collection:data.get('collection')};}
function render() {
 const filters=appliedFilters||readFilters(),visible=filterRecipes(recipes,{...filters,recipeIds:filters.collection?(worldFavourites?.recipeIds||[]):null});
 const current=recipePage(visible,pageNumber);pageNumber=current.page;
 status.textContent=visible.length+' of '+recipes.length+' collected recipes · '+recipes.filter(r=>r.rating).length+' have a published recipe rating · Showing '+current.start+'–'+current.end;
 results.innerHTML=visible.length?current.records.map(recipeCard).join(''):'<div class="empty-state"><h2>No recipes match yet</h2><p>Try another ingredient, meal type or website, or include recipes without a published rating.</p><button type="button" class="btn secondary" id="selected-reset">Clear filters</button></div>';
 const pager=document.getElementById('selected-pagination');
 pager.hidden=current.pages===1;pager.innerHTML='<button type="button" class="btn secondary" data-page="previous"'+(current.page===1?' disabled':'')+'>← Previous</button><span>Page '+current.page+' of '+current.pages+'</span><button type="button" class="btn secondary" data-page="next"'+(current.page===current.pages?' disabled':'')+'>Next →</button>';
 const total=current.records.reduce((n,r)=>n+r.ingredients.length,0),matched=current.records.reduce((n,r)=>n+r.ingredients.filter(i=>ingredientPhoto(i,photos)).length,0);
 const coverage=document.getElementById('selected-photo-coverage');if(coverage)coverage.textContent=matched+' of '+total+' ingredient rows on this page have a verified reference photograph. Missing or ambiguous ingredients keep an explicit photo gap.';
}
function syncCollectionUrl(){const url=new URL(location.href),value=appliedFilters?.collection;if(value)url.searchParams.set('collection',value);else url.searchParams.delete('collection');history.replaceState(null,'',url);document.getElementById('selected-collection-note').textContent='';}
form.addEventListener('submit',event=>{event.preventDefault();appliedFilters=readFilters();pageNumber=1;syncCollectionUrl();render();});
results.addEventListener('click',event=>{
 if(event.target.id==='selected-reset'){form.reset();appliedFilters=readFilters();pageNumber=1;syncCollectionUrl();render();form.querySelector('input').focus();return;}
 const button=event.target.closest('[data-save-recipe]');if(!button)return;
 const record=recipes.find(r=>r.id===button.dataset.saveRecipe),field=button.dataset.saveFlag;if(!record)return;
 const message=document.getElementById('selected-save-status');
 try{
  // Read at mutation time so another tab's newer cookbook cannot be overwritten.
  const next=toggleCollectedFlag(readStoreStrict(),record,field);
  if(!persistStore(next))throw new Error('Your browser could not save this recipe. Nothing changed.');
  savedState=next.saved;render();
  document.querySelector('[data-save-recipe="'+record.id+'"][data-save-flag="'+field+'"]')?.focus();
  message.textContent=(next.saved['selected-'+record.id]?.[field]?'Saved to ':'Removed from ')+(field==='wanted'?'Want to try':'My usual dishes')+'. Find your saved lists on the home page.';
 }catch(error){message.textContent=error.message||'Could not save your recipe. Nothing changed.';}
});
document.getElementById('selected-pagination').addEventListener('click',event=>{
 const button=event.target.closest('[data-page]');if(!button||button.disabled)return;
 pageNumber+=button.dataset.page==='next'?1:-1;render();status.focus({preventScroll:true});status.scrollIntoView({block:'start'});
});
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY){savedState=loadStore().saved;render();}});
results.addEventListener('error',event=>{
 const image=event.target;if(image.tagName!=='IMG')return;
 if(image.closest('.ingredient-reference')){const message=document.createElement('span');message.className='ingredient-photo-missing';message.textContent='Photo unavailable';image.replaceWith(message);}
 else {image.closest('.selected-recipe-photo')?.remove();}
},true);
async function boot(){
 try {
  const [recipeResponse,photoResponse,curationResponse]=await Promise.all([fetch('./data/selected-recipes.json'),fetch('./data/ingredient-photos.json').catch(()=>null),fetch('./data/world-favourites-100.json').catch(()=>null)]);
  if(!recipeResponse.ok)throw new Error('Collection unavailable');
  snapshot=await recipeResponse.json();if(!Array.isArray(snapshot.recipes)||snapshot.recipes.length>2500)throw new Error('Invalid collection');
  recipes=snapshot.recipes.map(validateRecipe);
  if(photoResponse?.ok){try{const data=await photoResponse.json();photos=Array.isArray(data.photos)?data.photos:[];}catch{photos=[];}}
  if(curationResponse?.ok){try{worldFavourites=validateWorldFavourites(await curationResponse.json(),recipes);worldIds=new Set(worldFavourites.recipeIds);}catch{worldFavourites=null;}}
  const collectionSelect=document.getElementById('selected-collection'),requested=new URLSearchParams(location.search).get('collection');
  if(worldFavourites){const option=document.createElement('option');option.value=worldFavourites.id;option.textContent=worldFavourites.title;collectionSelect.appendChild(option);document.getElementById('selected-world-link').hidden=false;const summary=document.getElementById('selected-world-summary');summary.textContent=worldFavourites.summary;summary.hidden=false;}
  if(requested){if(worldFavourites?.id===requested)collectionSelect.value=requested;else document.getElementById('selected-collection-note').textContent='That collection is unavailable; showing all collected recipes.';}
  const select=document.getElementById('selected-source');for(const s of SOURCES){const option=document.createElement('option');option.value=s.id;option.textContent=s.name+' ('+recipes.filter(r=>r.source===s.id).length+')';select.appendChild(option);}
  const courseSelect=document.getElementById('selected-course');for(const course of RECIPE_COURSES){const option=document.createElement('option');option.value=course.id;option.textContent=course.label;courseSelect.appendChild(option);}
  document.getElementById('selected-coverage').innerHTML='<p>'+recipes.length+' collected recipes from '+new Set(recipes.map(r=>r.source)).size+' of your 16 selected websites. This collection does not establish worldwide coverage.</p><p id="selected-photo-coverage"></p><ul>'+SOURCES.map(s=>'<li><strong>'+esc(s.name)+'</strong>: '+recipes.filter(r=>r.source===s.id).length+' collected'+(recipes.some(r=>r.source===s.id)?'':' · '+link('https://'+s.hosts[0]+'/','Open source; collection unavailable in this pass'))+'</li>').join('')+'</ul><p class="panel-note">Ingredient photographs: Wikimedia Commons, with original-file, creator and licence links beside every picture. Only visibly reviewed photographs are used. Photo references are for identification, not food-safety or allergen certification.</p>';
  appliedFilters=readFilters();render();
 }catch{status.textContent='The collection could not load. Reconnect and reload to try again.';results.innerHTML='<a class="btn secondary" href="./?view=library">Open your saved recipes</a>';}
}
void boot();
