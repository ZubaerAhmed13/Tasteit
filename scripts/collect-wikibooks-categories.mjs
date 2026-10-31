// Retrieve Wikibooks' own page category labels as EDITORIAL EVIDENCE only.
// No category label is automatically treated as proof of national origin,
// course, dietary properties or inclusion among a country's 30 best recipes.
import {readFile,mkdir,writeFile} from 'node:fs/promises';

const original=JSON.parse(await readFile('data/wikibooks-research-queue.json','utf8'));
const pages=(original.recipes||[]).filter(x=>
  Number.isSafeInteger(x.sourcePageId) && x.sourcePageId>0 && x.sourcePageId<1e10);
if(pages.length<1000)throw new Error('Research source queue is missing or incomplete.');
const api='https://en.wikibooks.org/w/api.php';
const batches=[];
for(let start=0;start<pages.length;start+=30)batches.push(pages.slice(start,start+30));
const evidence=[];
const failedBatches=[];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const abort=AbortSignal.timeout(420_000);
async function fetchPage(url){
  for(let attempt=0;attempt<3;attempt++){
    const result=await fetch(url,{headers:{
      'User-Agent':'TasteitRecipeResearch/0.1 (https://github.com/ZubaerAhmed13/Tasteit/issues; article category metadata)',
      Accept:'application/json'
    },signal:abort});
    if([429,502,503].includes(result.status)){
      await wait(Math.min(20000,Math.max(3000,(Number(result.headers.get('retry-after'))||3)*1000)));
      continue;
    }
    if(!result.ok)throw new Error('Wikibooks HTTP '+result.status);
    const json=await result.json();
    if(json.error)throw new Error(String(json.error.info||json.error.code));
    return json;
  }
  throw new Error('Wikibooks rate limit retries exhausted.');
}
for(let index=0;index<batches.length;index++){
  if(abort.aborted)throw new Error('Research request budget exceeded');
  const batch=batches[index];
  const ids=batch.map(x=>x.sourcePageId);
  const found=new Map(ids.map(id=>[id,new Set()]));
  let continuation=null;
  try{
    for(let page=0;page<12;page++){
      const url=new URL(api);
      const args={
        action:'query',prop:'categories',pageids:ids.join('|'),cllimit:'500',
        format:'json',formatversion:'2',maxlag:'5'
      };
      for(const [k,v] of Object.entries(args))url.searchParams.set(k,v);
      if(continuation)url.searchParams.set('clcontinue',continuation);
      const response=await fetchPage(url.toString());
      for(const entry of response.query?.pages||[]){
        if(!found.has(entry.pageid))continue;
        for(const category of entry.categories||[]){
          const name=String(category.title||'').replace(/^Category:/,'').trim();
          if(name && name.length<=200) found.get(entry.pageid).add(name);
        }
      }
      continuation=response.continue?.clcontinue||null;
      if(!continuation)break;
      if(page===11)throw new Error('Page category pagination exceeded safe per-batch limit.');
      await wait(300);
    }
    for(const id of ids) evidence.push({sourcePageId:id,
      categoryLabels:[...found.get(id)].sort((a,b)=>a.localeCompare(b))});
  }catch(error){
    failedBatches.push({batch:index+1,reason:String(error.message||'API error')});
  }
  if((index+1)%10===0 || index===batches.length-1)
    console.log('Source-category evidence:',index+1,'of',batches.length,
      'batches;',evidence.length,'pages;',failedBatches.length,'failed batches');
  await wait(350);
}
await mkdir('artifacts',{recursive:true});
const snapshot={
  version:1,source:'Wikibooks MediaWiki API page categories',
  sourceDirectory:'https://en.wikibooks.org/wiki/Category:Recipes',
  collectedAt:new Date().toISOString(),
  records:evidence.length,inputPages:pages.length,failedBatches,
  status:'raw-category-label-evidence-only',
  notice:'Category labels are hints for human research, not trusted country/course matches, cultural authenticity or image rights.',
  recipes:evidence.sort((a,b)=>a.sourcePageId-b.sourcePageId)
};
await writeFile('artifacts/wikibooks-category-evidence.json',JSON.stringify(snapshot,null,2)+'\n');
if(failedBatches.length){
  console.error('Partial source-category collection:',failedBatches.length,'failed batches');
  process.exitCode=2;
}
