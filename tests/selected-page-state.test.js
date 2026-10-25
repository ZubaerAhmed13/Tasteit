import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('pagination keeps committed filters and URL until Find recipes applies a draft',async()=>{
 let source=await readFile(new URL('../src/selected-recipes-app.js',import.meta.url),'utf8');const bindings={};
 for(const match of source.matchAll(/^import \{[^\n]+\} from '([^']+)';$/gm))Object.assign(bindings,await import(new URL('../src/'+match[1].slice(2),import.meta.url)));
 source=source.replace(/^import .*;\n/gm,'').replace('void boot();','');
 const handlers={},fields={query:'',source:'',course:'',sort:'title',collection:'',ratedOnly:false},nodes={};
 const node=id=>nodes[id]??={innerHTML:'',textContent:'',focus(){},scrollIntoView(){},addEventListener:(name,fn)=>{handlers[id+':'+name]=fn;}};
 const fixture=JSON.parse(await readFile(new URL('../data/selected-recipes.json',import.meta.url))).recipes.slice(0,55).map((r,i)=>({...r,category:i<30?'Dessert':'Main Course'}));
 const sandbox={...bindings,URL,console,fields,fixture,document:{getElementById:node},window:{addEventListener(){}},location:{href:'https://tasteit.test/selected-recipes.html'},history:{replaceState(){}},FormData:class{get(key){return fields[key]??null;}has(key){return fields[key]===true;}}};
 vm.createContext(sandbox);vm.runInContext(source+'\nrecipes=fixture;',sandbox);
 handlers['selected-filters:submit']({preventDefault(){}});assert.match(node('selected-status').textContent,/55 of 55/);
 fields.course='dessert';const button={dataset:{page:'next'},disabled:false};handlers['selected-pagination:click']({target:{closest:()=>button}});
 assert.match(node('selected-status').textContent,/55 of 55/);assert.match(node('selected-status').textContent,/Showing 25–48/);
 handlers['selected-filters:submit']({preventDefault(){}});assert.match(node('selected-status').textContent,/30 of 55/);assert.match(node('selected-status').textContent,/Showing 1–24/);
});
