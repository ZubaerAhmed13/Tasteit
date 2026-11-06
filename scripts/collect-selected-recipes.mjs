import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {approvedSource,extractRecipe,SOURCES,SOURCE_LIST_URL} from '../src/selected-sources.js';
export function validateSeeds(seeds) {
 if(!Array.isArray(seeds)||seeds.length>250||seeds.some(x=>!approvedSource(x)))throw new Error('Invalid bounded seed list.');
 return seeds;
}
export async function fetchPage(input,request=fetch) {
 let url=input;
 for(let redirects=0;redirects<4;redirects++) {
  if(!approvedSource(url))throw new Error('Source URL is not allowlisted.');
  const response=await request(url,{redirect:'manual',signal:AbortSignal.timeout(25_000),headers:{'user-agent':'Tasteit-metadata/1.0 (personal source-linked research)','accept':'text/html'}});
  if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)throw new Error('Invalid source redirect.');url=new URL(location,url).href;continue;}
  if(!response.ok)throw new Error('Source HTTP '+response.status);
  if(!response.headers.get('content-type')?.includes('text/html'))throw new Error('Source did not return HTML.');
  const reader=response.body.getReader(),parts=[];let bytes=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>8_000_000){await reader.cancel();throw new Error('Source page is too large.');}parts.push(value);}}finally{reader.releaseLock();}
  const data=new Uint8Array(bytes);let offset=0;for(const part of parts){data.set(part,offset);offset+=part.length;}
  return {url,html:new TextDecoder().decode(data)};
 }
 throw new Error('Too many source redirects.');
}
if(process.argv[1]===new URL(import.meta.url).pathname) {
 const seeds=JSON.parse(await readFile('data/selected-recipe-seeds.json','utf8'));
 validateSeeds(seeds);
 const previous=await readFile('data/selected-recipes.json','utf8').then(JSON.parse).catch(()=>({recipes:[]}));
 const records=new Map(previous.recipes.map(r=>[r.url,r])),attempts=[];
 let writing=Promise.resolve();
 function checkpoint(){
  const report={version:1,sourceList:SOURCE_LIST_URL,checkedAt:new Date().toISOString(),scope:'Bounded initial collection; source labels are not independently verified origins.',recipes:[...records.values()],sources:SOURCES.map(s=>({...s,collected:[...records.values()].filter(r=>r.source===s.id).length,attempts:attempts.filter(a=>a.source===s.id)}))};
  const body=JSON.stringify(report,null,2)+'\n';
  writing=writing.then(async()=>{await writeFile('data/selected-recipes.json.tmp',body);await rename('data/selected-recipes.json.tmp','data/selected-recipes.json');});return writing;
 }
 // At most four simultaneous origins; each publisher's pages run sequentially.
 const groups=SOURCES.map(s=>seeds.filter(u=>approvedSource(u).id===s.id));let next=0;
 async function runner(){while(next<groups.length){const group=groups[next++];for(const input of group){try{
  const {html,url}=await fetchPage(input),record=extractRecipe(html,url);records.set(record.url,record);
  attempts.push({url:input,finalUrl:url,source:record.source,status:'collected',checkedAt:record.checkedAt});console.log('Collected '+record.source+': '+record.title);
 }catch(error){attempts.push({url:input,source:approvedSource(input).id,status:'unavailable',reason:error.message,checkedAt:new Date().toISOString()});console.log('Unavailable '+input+': '+error.message);}await checkpoint();}}}
 await Promise.all(Array.from({length:4},runner));
 await checkpoint();
 console.log('Collected '+records.size+' recipes; '+[...records.values()].filter(r=>r.rating).length+' have published recipe ratings.');
}
