import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {applicationAssets} from '../scripts/build-site.mjs';
test('Vercel output preserves every application asset and exact provenance without server source',async()=>{
 const {buildVercel}=await import('../scripts/build-vercel.mjs');const out=await mkdtemp(path.join(tmpdir(),'tasteit-vercel-test-'));
 try{const assets=await applicationAssets(),commit='a'.repeat(40);await buildVercel({out,commit});
  for(const [name,asset]of Object.entries(assets))assert.equal(await readFile(path.join(out,name),'utf8'),asset.body,name);
  const provenance=JSON.parse(await readFile(path.join(out,'tasteit-source.json'),'utf8'));assert.equal(provenance.commit,commit);assert.match(provenance.assetDigest,/^[a-f0-9]{64}$/);
  const files=await readdir(out,{recursive:true});assert.ok(!files.some(n=>/server|schema|node_modules|\.env|package|docs|tests|api\//.test(n)));
 }finally{await rm(out,{recursive:true,force:true});}
});
test('Vercel config retains Node functions and private response headers',async()=>{
 const config=JSON.parse(await readFile('vercel.json','utf8'));assert.equal(config.outputDirectory,'dist/vercel');assert.equal(config.functions['api/*.js'].maxDuration,30);assert.deepEqual(config.regions,['fra1']);
 const headers=config.headers.flatMap(h=>h.headers);assert.ok(headers.some(h=>h.key.toLowerCase()==='x-robots-tag'&&h.value.includes('noindex')));assert.ok(headers.some(h=>h.key.toLowerCase()==='cache-control'&&h.value.includes('no-store')));
});
