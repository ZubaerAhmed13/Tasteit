// Wikibooks (Wikimedia) link-only research queue.
// Collect page names, links and page IDs. DO NOT copy recipes or images.
// Country, course, culinary origin and photo rights remain unverified.
import { mkdir,writeFile } from 'node:fs/promises';

const ENDPOINT='https://en.wikibooks.org/w/api.php';
const UA='TasteitRecipeResearch/0.1 (https://github.com/ZubaerAhmed13/Tasteit/issues; source-linked cookbook metadata)';
const records=new Map();
let cmcontinue='',requests=0;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function queryPage(url){
  for(let attempt=0;attempt<3;attempt++){
    const response=await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/json'},
      signal:AbortSignal.timeout(20_000)});
    if(response.status===429 || response.status===503){
      const seconds=Math.min(30,Math.max(5,Number(response.headers.get('retry-after'))||5));
      await pause(seconds*1000);continue;
    }
    if(!response.ok)throw new Error('Wikibooks API HTTP '+response.status);
    const data=await response.json();
    if(data.error)throw new Error('Wikibooks API: '+String(data.error.info||data.error.code));
    return data;
  }
  throw new Error('Wikibooks API request could not complete after rate-limited retries');
}
try{
  do{
    const url=new URL(ENDPOINT);
    const params={
      action:'query',list:'categorymembers',cmtitle:'Category:Recipes',
      cmtype:'page',cmlimit:'500',format:'json',formatversion:'2',maxlag:'5'
    };
    for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
    if(cmcontinue)url.searchParams.set('cmcontinue',cmcontinue);
    const data=await queryPage(url.toString());
    requests++;
    for(const p of data.query?.categorymembers||[]){
      const title=String(p.title||'');
      if(!Number.isSafeInteger(p.pageid)||!title.startsWith('Cookbook:'))continue;
      const link='https://en.wikibooks.org/wiki/'+encodeURIComponent(title.replaceAll(' ','_'));
      records.set(p.pageid,{
        id:'wikibooks:'+p.pageid,title:title.slice('Cookbook:'.length),
        url:link,source:'Wikibooks Cookbook',
        sourcePageId:p.pageid,
        textLicense:'Wikibooks CC BY-SA; check page terms on reuse',
        photoUrl:null,photoRights:'not-checked',
        country:null,course:null,status:'needs-editorial-origin-and-course-review'
      });
    }
    cmcontinue=data.continue?.cmcontinue||'';
    if(requests>15)throw new Error('Unexpectedly large category pagination');
    if(cmcontinue)await pause(450);
    console.log('Wikibooks pages checked:',requests,'candidate pages:',records.size);
  }while(cmcontinue);
  if(records.size<100)throw new Error('Insufficient Wikibooks category coverage; review API response.');
  await mkdir('artifacts',{recursive:true});
  const result={
    version:1,collectedAt:new Date().toISOString(),
    source:'Wikibooks Cookbook Category:Recipes',
    sourceCategory:'https://en.wikibooks.org/wiki/Category:Recipes',
    licenseInfo:'https://en.wikibooks.org/wiki/Wikibooks:Copyrights',
    status:'linked-research-only-not-country-categorised',
    scannedPages:records.size,requests,
    notes:[
      'Page titles and source URLs only: no copied recipe steps or photos.',
      'Country and course are unknown until editorially verified.',
      'Do not add these entries to 30-per-country-category targets automatically.',
      'Check individual media rights and provide CC BY-SA attribution if reproducing text.'
    ],
    recipes:[...records.values()].sort((a,b)=>a.title.localeCompare(b.title))
  };
  await writeFile('artifacts/wikibooks-research-queue.json',JSON.stringify(result,null,2)+'\n');
  console.log('Wikibooks linked source leads:',result.recipes.length);
}catch(error){
  console.error('Wikibooks research collection failed:',error.message);
  process.exitCode=1;
}
