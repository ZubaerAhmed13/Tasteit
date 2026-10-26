import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const css=await readFile(new URL('../styles.css',import.meta.url),'utf8'),selected=await readFile(new URL('../selected-recipes.css',import.meta.url),'utf8');
const vars=Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[\da-f]+)/gi)].map(m=>[m[1],m[2]]));
function property(source,selector,key){const rules=[...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(m=>m[1].trim().split(/,\s*/).includes(selector));for(const rule of rules){const match=rule[2].match(new RegExp('(?:^|;)\\s*'+key+':\\s*([^;}]+)'));if(match)return match[1].trim();}throw Error('Missing '+selector+' '+key);}
function color(s){s=s.replace(/var\(--([\w-]+)\)/g,(_,k)=>vars[k]);if(s==='white')s='#ffffff';if(s==='#fff')s='#ffffff';return s;}
function luminance(hex){assert.match(hex,/^#[\da-f]{6}$/i);return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);}
function check(name,foreground,background){const a=luminance(color(foreground)),b=luminance(color(background)),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=4.5,name+': '+ratio.toFixed(2)+' must be >=4.5');}
test('normal text in branded recipe and collection components meets 4.5:1 contrast',()=>{
 for(const background of [vars.paper,'#ffffff','#e6eee5','#f3f3ed'])check('secondary text on '+background,vars.muted,background);
 check('publisher source',property(css,'.source-line','color'),'#ffffff');
 check('accent button',property(css,'.btn','color'),property(css,'.btn.accent','background'));
 check('eyebrow on hero',property(css,'.eyebrow','color'),'#e6eee5');
 check('ingredient gap',property(selected,'.ingredient-photo-missing','color'),property(selected,'.ingredient-photo-missing','background'));
 check('rating count',property(selected,'.source-rating span','color'),'#ffffff');
 check('lead on hero',property(css,'.lead','color'),'#e6eee5');
});
