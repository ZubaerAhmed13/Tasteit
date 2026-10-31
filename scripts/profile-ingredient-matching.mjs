// Controlled CPU benchmark, not browser or field performance. No private records.
import {readFile,writeFile} from 'node:fs/promises';import {performance} from 'node:perf_hooks';import {createHash} from 'node:crypto';
import {ingredientPhoto,createIngredientPhotoMatcher} from '../src/ingredient-photos.js';
const registry=JSON.parse(await readFile('data/ingredient-photos.json','utf8')).photos;
const lines=JSON.parse(await readFile('data/selected-recipes.json','utf8')).recipes.flatMap(r=>r.ingredients);
const run=match=>{const start=performance.now(),ids=lines.map(line=>match(line)?.id||null);return {ms:Number((performance.now()-start).toFixed(2)),matched:ids.filter(Boolean).length,digest:createHash('sha256').update(JSON.stringify(ids)).digest('hex')};};
const uncached=run(line=>ingredientPhoto(line,registry)),match=createIngredientPhotoMatcher(registry),compiledCold=run(match),compiledWarm=run(match);
if(uncached.digest!==compiledCold.digest||uncached.digest!==compiledWarm.digest)throw Error('Photo matching results changed under optimization.');
const result={environment:{node:process.version,platform:process.platform,arch:process.arch},rows:lines.length,registry:registry.length,uncached,compiledCold,compiledWarm,scope:'Controlled full-catalogue CPU run; no browser, phone or field-performance claim.'};
console.log(JSON.stringify(result,null,2));if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2)+'\n');
