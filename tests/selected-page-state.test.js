import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
const catalogue=JSON.parse(await readFile(new URL('../data/selected-recipes.json',import.meta.url)));
async function page({url='https://tasteit.test/selected-recipes.html',request,sourceText}={}) {
 let source=sourceText||await readFile(new URL('../src/selected-recipes-app.js',import.meta.url),'utf8');const bindings={};
 for(const m of source.matchAll(/^import \{[^\n]+\} from '([^']+)';$/gm))Object.assign(bindings,await import(new URL('../src/'+m[1].slice(2),import.meta.url)));
 source=source.replace(/^import .*;\n/gm,'').replace(/\nvoid boot\(\);\s*$/,'');
 const handlers={},fields={query:'',source:'',course:'',sort:'title',collection:'',ratedOnly:true},nodes={},location={href:url},states=[{url,state:{}}];let index=0;
 const document={activeElement:null,getElementById:id=>node(id),createElement:()=>({}),querySelector:()=>null};
 function node(id){if(nodes[id])return nodes[id];const n={innerHTML:'',textContent:'',appendChild(){},querySelectorAll:()=>[],querySelector:()=>null,focus(){document.activeElement=n;},scrollIntoView(){},addEventListener(name,fn){(handlers[id+':'+name]??=[]).push(fn);}};const key=id.replace('selected-','');Object.defineProperty(n,'value',{get:()=>fields[key]||'',set:v=>fields[key]=v});Object.defineProperty(n,'checked',{get:()=>fields.ratedOnly,set:v=>fields.ratedOnly=v});nodes[id]=n;return n;}
 const history={get state(){return states[index].state;},replaceState(state,_title,href){states[index]={url:String(href),state};location.href=String(href);},pushState(state,_title,href){states.splice(index+1);states.push({url:String(href),state});index++;location.href=String(href);}};
 const sandbox={...bindings,collectionJson:(url,options={})=>bindings.collectionJson(url,{...options,request:request||(async()=>({ok:false,status:503}))}),URL,URLSearchParams,console,setTimeout,clearTimeout,document,location,history,fetch:request||(async()=>({ok:false})),window:{scrollY:120,scrollTo(){},addEventListener(name,fn){(handlers['window:'+name]??=[]).push(fn);}},FormData:class{get(k){return fields[k]??null;}has(k){return fields[k]===true;}}};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 return {node,fields,location,history,document,run:code=>vm.runInContext(code,sandbox),event:async(id,event)=>{for(const fn of handlers[id]||[])await fn(event);},back:async()=>{index--;location.href=states[index].url;for(const fn of handlers['window:popstate']||[])await fn();}};
}
test('pagination keeps committed filters and URL until Find recipes applies a draft',async()=>{
 const p=await page(),fixture=catalogue.recipes.slice(0,55).map((r,i)=>({...r,category:i<30?'Dessert':'Main Course'}));
 p.run('recipes='+JSON.stringify(fixture)+';catalogueReady=true;');p.fields.ratedOnly=false;
 await p.event('selected-filters:submit',{preventDefault(){}});assert.match(p.node('selected-status').textContent,/55 of 55/);
 p.fields.course='dessert';await p.event('selected-pagination:click',{target:{closest:()=>({dataset:{page:'next'},disabled:false})}});
 assert.match(p.node('selected-status').textContent,/55 of 55/);assert.match(p.node('selected-status').textContent,/Showing 25–48/);assert.ok(p.location.href.includes('page=2'));assert.ok(!p.location.href.includes('dessert'));
 await p.event('selected-filters:submit',{preventDefault(){}});assert.match(p.node('selected-status').textContent,/30 of 55/);assert.match(p.node('selected-status').textContent,/Showing 1–24/);
 await p.back();assert.match(p.node('selected-status').textContent,/Showing 25–48/);assert.equal(p.fields.course,'');
});
test('catalogue renders before an optional photo request and late photos preserve filters and focus',async()=>{
 let release;const pending=new Promise(r=>{release=r;});
 const p=await page({url:'https://tasteit.test/selected-recipes.html?course=breakfast&page=3',request:async u=>u.includes('selected-recipes.json')?{ok:true,json:async()=>catalogue}:u.includes('ingredient-photos')?pending:{ok:false,status:503}});
 const boot=p.run('boot()');await new Promise(r=>setImmediate(r));assert.match(p.node('selected-status').textContent,/Showing 49–72/);assert.equal(p.fields.course,'breakfast');
 const html=p.node('selected-results').innerHTML;p.fields.query='unsaved egg';p.node('selected-query').focus();const focus=p.document.activeElement;
 release({ok:true,json:async()=>({photos:[]})});await new Promise(r=>setImmediate(r));
 assert.equal(p.node('selected-results').innerHTML,html);assert.equal(p.fields.query,'unsaved egg');assert.equal(p.document.activeElement,focus);
});
test('unavailable curation fallback preserves the preceding committed history entry',async()=>{
 const p=await page({request:async url=>url.includes('selected-recipes')?{ok:true,json:async()=>catalogue}:{ok:false,status:503}});
 await p.run('boot()');await new Promise(r=>setImmediate(r));
 p.fields.query='egg';p.fields.collection='world-favourites-100';
 await p.event('selected-filters:submit',{preventDefault(){}});
 assert.ok(p.location.href.includes('query=egg'));assert.ok(!p.location.href.includes('collection='));
 await p.back();assert.equal(p.fields.query,'');assert.ok(!p.location.href.includes('query='));
});
