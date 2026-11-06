import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('ingredient previews use an internal accessible dialog instead of image-host navigation',async()=>{
 const source=await readFile(new URL('../src/ingredient-lightbox.js',import.meta.url),'utf8');
 const reference=await readFile(new URL('../src/ingredient-reference.js',import.meta.url),'utf8');
 const worker=await readFile(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(source,/root.createElement\('dialog'\)/);
 assert.match(source,/\.showModal\(/);
 assert.match(source,/returnFocus/);
 assert.match(source,/upload.wikimedia.org/);
 assert.match(source,/thumb.wikimedia.org/);
 assert.match(reference,/data-photo-url/);
 assert.doesNotMatch(reference,/target="_blank"/);
 assert.ok(worker.includes("'./src/ingredient-lightbox.js'"));
});
