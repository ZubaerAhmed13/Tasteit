import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
const records=JSON.parse(await readFile(new URL('../data/selected-recipes.json',import.meta.url))).recipes;
async function controller({load=async()=>({recipes:records}),online=true}={}) {
 let source=await readFile(new URL('../src/app.js',import.meta.url),'utf8'),providerCalls=0;const bindings={};
 for(const m of source.matchAll(/^import \{[^\n]+\} from '([^']+)';$/gm))Object.assign(bindings,await import(new URL('../src/'+m[1].slice(2),import.meta.url)));
 const helpers=await import('../src/recipe-discovery.js');bindings.createRecipeCollectionLoader=()=>helpers.createRecipeCollectionLoader(load);bindings.discoverMeals=async()=>{providerCalls++;return {meals:[]};};
 source=source.replace(/^import .*;\n/gm,'').split('// Start application.')[0];
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',hidden:false,focus(){},querySelector:()=>null,querySelectorAll:()=>[]});return nodes.get(id);};
 const location={href:'https://tasteit.test/'},history={state:{},replaceState(state,_title,url){history.state=state;location.href=String(url);},pushState(state,_title,url){history.state=state;location.href=String(url);}};
 const handlers={};const document={body:{style:{}},getElementById:node,addEventListener(name,fn){(handlers[name]??=[]).push(fn);},querySelectorAll:()=>[],querySelector(selector){const id=/data-id=\"([^\"]+)/.exec(selector)?.[1];return id?{dataset:{id},focus(){document.activeElement=this;}}:null;},activeElement:null};
 const box={...bindings,document,window:{location,history,scrollY:0,addEventListener(){},scrollTo(){}},navigator:{onLine:online},URL,AbortController,DOMException,setTimeout,clearTimeout,setInterval,clearInterval,console};vm.createContext(box);vm.runInContext(source,box);vm.runInContext('const originalCloseDialog=closeDialog;render=()=>{};closeDialog=()=>{};',box);
 return {run:code=>vm.runInContext(code,box),providerCalls:()=>providerCalls,location,event:async(name,event)=>{for(const fn of handlers[name]||[])await fn(event);}};
}
test('actual main controller searches collected breakfasts without a provider request',async()=>{
 const p=await controller();await p.run("discover('filters',{query:'poha',course:'breakfast'},{history:false})");
 assert.ok(p.run("activeMeals.some(m=>m.idMeal==='selected-swasthi-poha-recipe-kanda-batata-poha')"));assert.equal(p.providerCalls(),0);
 assert.equal(p.run('currentRoute().course'),'breakfast');
});
test('catalogue failure retains a matching saved recipe and offers a partial-availability message',async()=>{
 const p=await controller({load:async()=>{throw Error('unavailable');}});p.run("store.saved={mine:{meal:{idMeal:'personal-rice',strPersonal:true,strMeal:'My rice',strInstructions:'Cook rice.',strIngredient1:'Rice'},wanted:true}};");
 await p.run("discover('search','rice',{history:false})");assert.equal(p.run('activeMeals[0]?.idMeal'),'personal-rice');assert.ok(p.run('serviceWarning.length>0'));assert.equal(p.run('problem'),'');
});
test('stale catalogue result cannot replace a newer source scope',async()=>{
 let release;const p=await controller({load:()=>new Promise(r=>release=r)});
 const first=p.run("discover('search','poha',{history:false})");await new Promise(r=>setImmediate(r));
 await p.run("discover('filters',{scope:'provider',query:'rice'},{history:false})");assert.equal(p.providerCalls(),1);
 release({recipes:records});await first;assert.equal(p.run('activeMeals.length'),0);assert.equal(p.run('currentRoute().scope'),'provider');
});
test('Home returns to search-first shelves while the prior filtered route stays in history',async()=>{
 const p=await controller();await p.run("discover('filters',{query:'poha',course:'breakfast'},{history:false})");
 p.run("changeView('discover')");await new Promise(r=>setImmediate(r));assert.equal(p.run('currentRoute().query'),'');assert.equal(p.run('currentRoute().course'),'');assert.equal(p.run('currentRoute().page'),1);
});
test('offline collection discovery retains composed publisher/course/rating filters',async()=>{
 const p=await controller({online:false});const {collectedMeal}=await import('../src/selected-kitchen.js');const saved=Object.fromEntries(records.map(r=>{const m=collectedMeal(r);return [m.idMeal,{meal:m,wanted:true}];}));p.run('store.saved='+JSON.stringify(saved));
 await p.run("discover('filters',{source:'swasthi',course:'breakfast',ratedOnly:true,sort:'rating'},{history:false})");assert.equal(p.run('activeMeals.length'),51);assert.ok(p.run("activeMeals.every(m=>m.selectedRecipe.source==='swasthi'&&m.selectedRecipe.rating)"));
});
test('offline primary search includes saved ingredient metadata',async()=>{
 const p=await controller({online:false}),record=records.find(r=>r.id==='swasthi-poha-recipe-kanda-batata-poha'),{collectedMeal}=await import('../src/selected-kitchen.js'),meal=collectedMeal(record);p.run('store.saved='+JSON.stringify({[meal.idMeal]:{meal,wanted:true}}));
 await p.run("discover('search','beaten rice',{history:false})");assert.equal(p.run('activeMeals[0]?.idMeal'),meal.idMeal);
});
test('provider scope clears unsupported committed collection filters',async()=>{
 const p=await controller();await p.run("discover('filters',{query:'poha',source:'swasthi',course:'breakfast',ratedOnly:true,sort:'rating'},{history:false})");await p.run("discover('filters',{scope:'provider'},{history:false})");
 assert.equal(p.run('currentRoute().course'),'');assert.equal(p.run('currentRoute().source'),'');assert.equal(p.run('currentRoute().ratedOnly'),false);assert.equal(p.run('currentRoute().sort'),'title');assert.equal(p.run('currentRoute().query'),'poha');
});
test('result focus is restored after asynchronous overlay route rendering',async()=>{
 const p=await controller();await p.run("discover('filters',{query:'poha',course:'breakfast'})");
 p.run("closeDialog=originalCloseDialog;selectedMeal=activeMeals[0];dialogReturnId=selectedMeal.idMeal;dialogReturnFocus={isConnected:false};render=()=>{document.activeElement=null;};");
 const id=p.run('selectedMeal.idMeal');await p.run('restoreRoute(readRoute(window.location.href))');await new Promise(r=>setImmediate(r));assert.equal(p.run('document.activeElement?.dataset.id'),id);
});
test('removing the course filter keeps the remaining committed search choices',async()=>{
 const p=await controller();await p.run("discover('filters',{query:'poha',source:'swasthi',course:'breakfast',ratedOnly:true,sort:'rating'},{history:false})");const button={dataset:{action:'remove-course'},closest:s=>s==='[data-action]'?button:null};await p.event('click',{target:button});await new Promise(r=>setImmediate(r));
 assert.equal(p.run('currentRoute().course'),'');assert.equal(p.run('currentRoute().query'),'poha');assert.equal(p.run('currentRoute().source'),'swasthi');assert.equal(p.run('currentRoute().ratedOnly'),true);assert.equal(p.run('currentRoute().sort'),'rating');
});
