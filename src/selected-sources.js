// Recipe sources selected by the user; ingredient-photo credits are separate.
export const SOURCE_LIST_URL='https://chatgpt.com/s/t_6adc780320e48191a978d6ea1aadd9c0';
export const SOURCES=Object.freeze([
 ['allrecipes','Allrecipes','allrecipes.com'],['goodfood','BBC Good Food','bbcgoodfood.com'],
 ['recipetineats','RecipeTin Eats','recipetineats.com'],['seriouseats','Serious Eats','seriouseats.com'],
 ['tasteatlas','TasteAtlas','tasteatlas.com'],['196flavors','196 Flavors','196flavors.com'],
 ['budgetbytes','Budget Bytes','budgetbytes.com'],['cookpad','Cookpad','cookpad.com'],
 ['nyt','NYT Cooking','cooking.nytimes.com'],['chefkoch','Chefkoch','chefkoch.de'],
 ['justonecookbook','Just One Cookbook','justonecookbook.com'],['maangchi','Maangchi','maangchi.com'],
 ['woksoflife','The Woks of Life','thewoksoflife.com'],['swasthi',"Swasthi’s Recipes",'indianhealthyrecipes.com'],
 ['supercook','SuperCook','supercook.com'],['samsungfood','Samsung Food','samsungfood.com','app.samsungfood.com']
].map(([id,name,...hosts])=>Object.freeze({id,name,hosts:Object.freeze(hosts)})));
export function safeHttps(input) {
 try{const url=new URL(input);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port?url:null;}catch{return null;}
}
export function approvedSource(input) {
 const url=safeHttps(input);if(!url)return null;
 const host=url.hostname.replace(/^www\./,'');return SOURCES.find(x=>x.hosts.includes(host))||null;
}
const plain=(value,max=400)=>String(value??'').replace(/<[^>]*>/g,'').replaceAll('&amp;','&').replaceAll('&#39;',"'").replaceAll('&quot;','"').trim().slice(0,max);
const types=node=>[].concat(node?.['@type']||[]).map(x=>String(x).replace(/^https?:\/\/schema.org\//,''));
const pageKey=input=>{const u=safeHttps(input),source=u&&approvedSource(u.href);return source?source.id+u.pathname.replace(/\/$/,''):'';};
function nodes(value,out=[],depth=0,refs=new Map(),pages=[],ratings=[],images=[]) {
 if(depth>20||out.length>3000)return out;
 if(Array.isArray(value))for(const child of value)nodes(child,out,depth+1,refs,pages,ratings,images);
 else if(value&&typeof value==='object'){if(typeof value['@id']==='string'&&Object.keys(value).length>Object.keys(refs.get(value['@id'])||{}).length)refs.set(value['@id'],value);if(types(value).includes('ImageObject'))images.push(value);if(types(value).includes('AggregateRating'))ratings.push(value);if(types(value).includes('Recipe'))out.push(value);if(types(value).includes('WebPage'))pages.push(value);for(const [key,child]of Object.entries(value))if(key!=='aggregateRating')nodes(child,out,depth+1,refs,pages,ratings,images);}
 return out;
}
function aggregate(input) {
 if(!input||typeof input!=='object')return null;
 const value=Number(input.ratingValue),best=Number(input.bestRating??5),worst=Number(input.worstRating??1);
 const countType=input.ratingCount!==undefined?'ratings':input.reviewCount!==undefined?'reviews':null;
 const raw=countType?input[countType==='ratings'?'ratingCount':'reviewCount']:null;
 const count=raw===null?null:Number(String(raw).replaceAll(',',''));
 if(!Number.isFinite(value)||!Number.isFinite(best)||!Number.isFinite(worst)||best<=worst||value<worst||value>best||count!==null&&(!Number.isSafeInteger(count)||count<1))return null;
 return {value,best,worst,count,countType};
}
function maangchiIngredients(html) {
 const headings=[...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)];
 const starts=headings.filter(h=>plain(h[1]).toLowerCase()==='ingredients');
 if(starts.length!==1)throw new Error('No unambiguous complete ingredient section was available.');
 const start=starts[0],end=headings.find(h=>h.index>start.index);
 if(!end)throw new Error('No unambiguous complete ingredient section was available.');
 const section=html.slice(start.index+start[0].length,end.index);
 return [...section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m=>plain(m[1].replace(/&nbsp;/gi,' ').replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_m,n)=>String.fromCodePoint(Number.parseInt(n.replace(/^x/i,''),/^x/i.test(n)?16:10))),350));
}
function sourceEquipment(html) {
 const equipment=new Set();
 for(const group of html.matchAll(/<h([3-6])\b[^>]*>\s*Equipment\s*<\/h\1>\s*<ul\b[^>]*>([\s\S]*?)<\/ul>/gi))
  for(const item of group[2].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi))equipment.add(plain(item[1],350));
 return equipment;
}
function recipeRating(input,ratings,url) {
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 if(input.ratingValue!==undefined)return aggregate(input);
 if(typeof input['@id']!=='string')return null;
 try {if(pageKey(new URL(input['@id'],url).href)!==pageKey(url))return null;}catch{return null;}
 // Only the main recipe's explicit same-page reference may supply its score.
 const matches=[...new Map(ratings.filter(x=>x['@id']===input['@id']).map(x=>[JSON.stringify(x),x])).values()];
 return matches.length===1?aggregate(matches[0]):null;
}
function recipeImage(input,images) {
 const first=[].concat(input||[])[0];
 if(typeof first==='string')return first;
 if(first?.url||first?.contentUrl)return first.url||first.contentUrl;
 if(typeof first?.['@id']!=='string')return null;
 const matches=[...new Map(images.filter(x=>x['@id']===first['@id']).map(x=>[JSON.stringify(x),x])).values()];
 return matches.length===1?matches[0].url||matches[0].contentUrl:null;
}
export function extractRecipe(html,url,checkedAt=new Date().toISOString()) {
 const source=approvedSource(url);if(!source)throw new Error('Recipe source is not in the selected list.');
 if(typeof html!=='string'||html.length>8_000_000)throw new Error('Source page is missing or too large.');
 for(const tag of html.matchAll(/<link\b([^>]*)>/gi)) {
  const attributes={};
  for(const m of tag[1].matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g))attributes[m[1].toLowerCase()]=m[2]??m[3]??m[4];
  if(!String(attributes.rel||'').toLowerCase().split(/\s+/).includes('canonical'))continue;
  let href=String(attributes.href||'').replace(/&amp;/gi,'&').replace(/&#(x[0-9a-f]+|[0-9]+);/gi,(_m,n)=>String.fromCodePoint(Number.parseInt(n.replace(/^x/i,''),/^x/i.test(n)?16:10)));
  if(!href||/&(?:[a-z]+|#)[^;]*;/i.test(href)||approvedSource(new URL(href,url).href)?.id!==source.id)throw new Error('The canonical publisher is outside this source.');
 }
 const recipes=[],refs=new Map(),pages=[],ratings=[],images=[],owned=new Set();
 for(const script of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
  try {
   const document=JSON.parse(script[1]);nodes(document,recipes,0,refs,pages,ratings,images);
   for(const root of [].concat(document))if(types(root).includes('Recipe'))owned.add(JSON.stringify(root));
  }catch{ /* Malformed/other scripts cannot supply recipe facts. */ }
 }
 for(const page of pages)if(!page.url&&!page['@id']||pageKey(page.url||page['@id'])===pageKey(url)) {
  for(const entity of [].concat(page.mainEntity||[])) {
   const candidate=typeof entity==='string'?refs.get(entity):entity?.['@id']?refs.get(entity['@id'])||entity:entity;
   if(types(candidate).includes('Recipe'))owned.add(JSON.stringify(candidate));
  }
 }
 const unique=[...new Map(recipes.map(r=>[JSON.stringify(r),r])).values()];
 const matching=unique.filter(r=>pageKey(typeof r.url==='string'?r.url:r['@id'])===pageKey(url));
 const nominated=unique.filter(r=>owned.has(JSON.stringify(r)));
 const recipe=matching.length===1?matching[0]:matching.length===0&&nominated.length===1?nominated[0]:null;
 if(!recipe)throw new Error('No unambiguous main Recipe metadata was available.');
 const identity=typeof recipe.url==='string'?recipe.url:recipe['@id'];
 if(identity&&(approvedSource(identity)?.id!==source.id||pageKey(identity)!==pageKey(url)))throw new Error('The recipe belongs to another source page.');
 if(['samsungfood','supercook'].includes(source.id)&&recipe.isBasedOn!==undefined) {
  function originals(value,depth=0) {
   if(depth>8)throw new Error('Unresolved original-source provenance.');
   if(Array.isArray(value)){if(!value.length)throw new Error('Empty original-source provenance.');return value.flatMap(v=>originals(v,depth+1));}
   if(typeof value==='string')return [value];
   if(value&&typeof value==='object') {
    const urls=[value.url,value['@id']].filter(v=>v!==undefined);
    if(urls.length)return urls.flatMap(v=>originals(v,depth+1));
   }
   throw new Error('Unresolved original-source provenance.');
  }
  if(originals(recipe.isBasedOn).some(original=>!approvedSource(original)))throw new Error('The original recipe publisher is not selected.');
 }
 const title=plain(recipe.name,200),rawIngredients=source.id==='maangchi'?maangchiIngredients(html):Array.isArray(recipe.recipeIngredient)?recipe.recipeIngredient.filter(x=>typeof x==='string').map(x=>plain(x,350)):[];
 const equipment=source.id==='196flavors'?sourceEquipment(html):new Set();
 const ingredients=rawIngredients.filter(line=>!equipment.has(line));
 if(!title||!ingredients.length||ingredients.length>100||ingredients.some(x=>!x))throw new Error('The recipe is missing usable ingredients.');
 const original=new URL(url);original.hash='';original.search='';
 const author=[].concat(recipe.author||[]).map(x=>plain(typeof x==='string'?x:x.name||refs.get(x['@id'])?.name,100)).filter(Boolean).join(', ').slice(0,300);
 const image=recipeImage(recipe.image,images);
 const record={id:source.id+'-'+original.pathname.replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,150),source:source.id,url:original.href,title,author,
  cuisine:[].concat(recipe.recipeCuisine||[]).map(x=>plain(x,80)).join(', '),category:[].concat(recipe.recipeCategory||[]).map(x=>plain(x,80)).join(', '),
  ingredients,rating:recipeRating(recipe.aggregateRating,ratings,url),photoUrl:safeHttps(image)?.href||null,checkedAt};
 return validateRecipe(record);
}
export function validateRecipe(record) {
 if(!record||approvedSource(record.url)?.id!==record.source||!SOURCES.some(s=>s.id===record.source)||typeof record.id!=='string'||!/^[A-Za-z0-9-]{1,200}$/.test(record.id)||typeof record.title!=='string'||!record.title||record.title.length>200||!Array.isArray(record.ingredients)||!record.ingredients.length||record.ingredients.length>100||record.ingredients.some(x=>typeof x!=='string'||!x||x.length>350)||!Number.isFinite(Date.parse(record.checkedAt)))throw new Error('Invalid selected-source recipe.');
 if(record.rating!==null) {
  const r=record.rating;if(!r||!Number.isFinite(r.value)||!Number.isFinite(r.best)||r.value<(r.worst??1)||r.value>r.best||r.best<=(r.worst??1)||r.count!==null&&(!Number.isSafeInteger(r.count)||r.count<1)||!['ratings','reviews',null].includes(r.countType)||(r.count===null)!==(r.countType===null))throw new Error('Invalid source rating.');
 }
 if(record.photoUrl&&!safeHttps(record.photoUrl))throw new Error('Invalid publisher photo URL.');
 return record;
}
export function filterRecipes(records,{query='',source='',ratedOnly=false,sort='title'}={}) {
 const q=String(query).trim().toLowerCase();
 return records.filter(r=>(!source||r.source===source)&&(!ratedOnly||r.rating)&&(!q||[r.title,r.author,r.cuisine,...r.ingredients].join(' ').toLowerCase().includes(q))).sort((a,b)=>sort==='rating'?(b.rating?b.rating.value/b.rating.best:-1)-(a.rating?a.rating.value/a.rating.best:-1)||a.title.localeCompare(b.title):sort==='votes'?(b.rating?.countType==='ratings'?b.rating.count||0:-1)-(a.rating?.countType==='ratings'?a.rating.count||0:-1)||a.title.localeCompare(b.title):a.title.localeCompare(b.title));
}
