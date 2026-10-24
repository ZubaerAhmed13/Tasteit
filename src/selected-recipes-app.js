import {SOURCES,validateRecipe,filterRecipes,safeHttps} from './selected-sources.js';
import {ingredientPhoto} from './ingredient-photos.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,label,extra='')=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" '+extra+'>'+esc(label)+'</a>';
const form=document.getElementById('selected-filters'),status=document.getElementById('selected-status'),results=document.getElementById('selected-results');
let recipes=[],photos=[],snapshot=null;
function reference(line) {
 const photo=ingredientPhoto(line,photos);
 if(!photo)return '<span class="ingredient-photo-missing">Photo not verified</span>';
 return '<figure class="ingredient-reference"><img src="'+esc(photo.url)+'" alt="'+esc(photo.label)+' — ingredient reference photograph" loading="lazy" width="80" height="80" referrerpolicy="no-referrer"><figcaption>'+link(photo.filePage,photo.label+' · '+photo.creator)+' · '+link(photo.licenceUrl,photo.licence)+'</figcaption></figure>';
}
function recipeCard(r) {
 const source=SOURCES.find(s=>s.id===r.source),rating=r.rating;
 const count=rating?.count===null?'Vote count not collected':rating?rating.count.toLocaleString()+' '+(rating.countType==='ratings'?'rating votes':'reviews'):'';
 const ratingText=rating?rating.value+' / '+rating.best:'Rating not collected';
 return '<article class="selected-card">'+(r.photoUrl?'<a class="selected-recipe-photo" href="'+esc(r.url)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(r.photoUrl)+'" alt="'+esc(r.title)+' — original publisher photograph" loading="lazy" referrerpolicy="no-referrer"></a>':'')+
  '<div class="selected-card-content"><p class="eyebrow">'+esc(source.name)+'</p><h2>'+esc(r.title)+'</h2>'+(r.author?'<p class="panel-note">By '+esc(r.author)+'</p>':'')+
  '<p class="source-rating"><strong>'+esc(ratingText)+'</strong> <span>'+esc(count)+'</span></p><p class="panel-note">'+esc([r.cuisine,r.category].filter(Boolean).join(' · '))+'</p>'+link(r.url,'Open original recipe ↗','class="btn secondary"')+
  '<p class="panel-note source-check-date">Rating checked '+esc(new Date(r.checkedAt).toLocaleDateString('en-GB'))+'. Publisher labels and linked photo; cuisine authenticity is not independently certified.</p>'+
  '<details class="selected-ingredients"><summary>'+r.ingredients.length+' ingredients · see photographs</summary><ul>'+r.ingredients.map(line=>'<li>'+reference(line)+'<span class="source-ingredient-text">'+esc(line)+'</span></li>').join('')+'</ul></details></div></article>';
}
function render() {
 const data=new FormData(form),visible=filterRecipes(recipes,{query:data.get('query'),source:data.get('source'),sort:data.get('sort'),ratedOnly:data.has('ratedOnly')});
 status.textContent=visible.length+' of '+recipes.length+' collected recipes · '+recipes.filter(r=>r.rating).length+' have a published recipe rating';
 results.innerHTML=visible.length?visible.map(recipeCard).join(''):'<div class="empty-state"><h2>No recipes match yet</h2><p>Try another ingredient or website, or include recipes without a published rating.</p><button type="button" class="btn secondary" id="selected-reset">Clear filters</button></div>';
}
form.addEventListener('submit',event=>{event.preventDefault();render();});
results.addEventListener('click',event=>{if(event.target.id==='selected-reset'){form.reset();render();form.querySelector('input').focus();}});
results.addEventListener('error',event=>{
 const image=event.target;if(image.tagName!=='IMG')return;
 if(image.closest('.ingredient-reference')){const message=document.createElement('span');message.className='ingredient-photo-missing';message.textContent='Photo unavailable';image.replaceWith(message);}
 else {image.closest('.selected-recipe-photo')?.remove();}
},true);
async function boot(){
 try {
  const [recipeResponse,photoResponse]=await Promise.all([fetch('./data/selected-recipes.json'),fetch('./data/ingredient-photos.json').catch(()=>null)]);
  if(!recipeResponse.ok)throw new Error('Collection unavailable');
  snapshot=await recipeResponse.json();if(!Array.isArray(snapshot.recipes)||snapshot.recipes.length>1000)throw new Error('Invalid collection');
  recipes=snapshot.recipes.map(validateRecipe);
  if(photoResponse?.ok){try{const data=await photoResponse.json();photos=Array.isArray(data.photos)?data.photos:[];}catch{photos=[];}}
  const select=document.getElementById('selected-source');for(const s of SOURCES){const option=document.createElement('option');option.value=s.id;option.textContent=s.name+' ('+recipes.filter(r=>r.source===s.id).length+')';select.appendChild(option);}
  const total=recipes.reduce((n,r)=>n+r.ingredients.length,0),matched=recipes.reduce((n,r)=>n+r.ingredients.filter(i=>ingredientPhoto(i,photos)).length,0);
  document.getElementById('selected-coverage').innerHTML='<p>'+recipes.length+' collected recipes from '+new Set(recipes.map(r=>r.source)).size+' of your 16 selected websites. This initial batch does not establish worldwide coverage.</p><p>'+matched+' of '+total+' ingredient rows have a verified reference photograph; '+(total-matched)+' still need an exact photo. Missing or ambiguous ingredients are never given a guessed image.</p><ul>'+SOURCES.map(s=>'<li><strong>'+esc(s.name)+'</strong>: '+recipes.filter(r=>r.source===s.id).length+' collected'+(recipes.some(r=>r.source===s.id)?'':' · '+link('https://'+s.hosts[0]+'/','Open source; collection unavailable in this pass'))+'</li>').join('')+'</ul><p class="panel-note">Ingredient photographs: Wikimedia Commons, with original-file, creator and licence links beside every picture. Only visibly reviewed photographs are used. Photo references are for identification, not food-safety or allergen certification.</p>';
  render();
 }catch{status.textContent='The collection could not load. Reconnect and reload to try again.';results.innerHTML='<a class="btn secondary" href="./?view=library">Open your saved recipes</a>';}
}
void boot();
