import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ingredientReference} from '../src/ingredient-reference.js';
import {ingredientPhotoCredits} from '../src/ingredient-photos.js';
const photos=JSON.parse(await readFile(new URL('../data/ingredient-photos.json',import.meta.url),'utf8')).photos;
test('ingredient picture has no under-image caption, link to source, or license details',()=>{
 const markup=ingredientReference('1 onion',photos);
 assert.match(markup,/<img /);
 assert.match(markup,/class="ingredient-photo-link"/);
 assert.doesNotMatch(markup,/<figcaption|creator|licence|credits|Source|commons.wikimedia.org\/wiki\/File:/i);
});
test('unknown ingredients never display an unrelated photo',()=>{
 const markup=ingredientReference('one mystery ingredient for testing',photos);
 assert.match(markup,/ingredient-photo-missing/);
 assert.doesNotMatch(markup,/<img /);
});
test('attribution exists in a separate, machine-readable photo registry',()=>{
 const photo=photos.find(x=>x.id==='onion');
 assert.equal(photo.verified,true);
 assert.ok(photo.filePage.startsWith('https://commons.wikimedia.org/wiki/File:'));
 assert.ok(photo.creator&&photo.licenceUrl);
 assert.notEqual(ingredientPhotoCredits(photo),null);
});
test('both recipe pages link to the distinct photo-credit page bundled with the app',async()=>{
 const [home,selected,credits,script,build]=await Promise.all(['index.html','selected-recipes.html','photo-credits.html','src/photo-credits.js','scripts/build-site.mjs'].map(x=>readFile(new URL('../'+x,import.meta.url),'utf8')));
 assert.match(home,/href="\.\/photo-credits\.html"/);
 assert.match(selected,/href="\.\/photo-credits\.html"/);
 assert.match(credits,/id="photo-credits-list"/);
 assert.match(script,/ingredientPhotoCredits/);
 assert.match(build,/'photo-credits\.html'/);
});
