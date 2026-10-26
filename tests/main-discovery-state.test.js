import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';
const records=JSON.parse(await readFile(new URL('../data/selected-recipes.json',import.meta.url))).recipes;
async function controller({load=async()=>({recipes:records})}={}) {
 let source=await readFile(new URL('../src/app.js',import.meta.url),'utf8'),providerCalls=0;const bindings={};
 for(const m of source.matchAll(/^import \{[^\n]+\} from '([^']+)';$/gm))Object.assign(bindings,await import(new URL('../src/'+m[1].slice(2),import.meta.url)));
 const helpers=await import('../src/recipe-discovery.js');bindings.createRecipeCollectionLoader=()=>helpers.createRecipeCollectionLoader(load);bindings.discoverMeals=async()=>{providerCalls++;return {meals:[]};};
 source=source.replace(/^import .*;\n/gm,'').split('// Start application.')[0];
 const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',hidden:false,focus(){},querySelector:()=>null,querySelectorAll:()=>[]});return nodes.get(id);};
 const location={href:'https://tasteit.test/'},history={state:{},replaceState(state,_title,url){history.state=state;location.href=String(url);},pushState(state,_title,url){history.state=state;location.href=String(url);}};
 const document={body:{style:{}},getElementById:node,addEventListener(){},querySelectorAll:()=>[],querySelector:()=>null,activeElement:null};
 const box={...bindings,document,window:{location,history,scrollY:0,addEventListener(){},scrollTo(){}},navigator:{onLine:true},URL,AbortController,DOMException,setTimeout,clearTimeout,setInterval,clearInterval,console};vm.createContext(box);vm.runInContext(source,box);vm.runInContext('render=()=>{};closeDialog=()=>{};',box);
 return {run:code=>vm.runInContext(code,box),providerCalls:()=>providerCalls,location};
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
