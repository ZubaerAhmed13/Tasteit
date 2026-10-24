import test from 'node:test';
import assert from 'node:assert/strict';
const entry={id:'garlic',label:'Garlic',aliases:['garlic','garlic cloves'],url:'https://upload.wikimedia.org/wikipedia/commons/2/22/Garlic.jpg',filePage:'https://commons.wikimedia.org/wiki/File:Garlic.jpg',creator:'Donovan Govan',licence:'CC BY-SA 3.0',licenceUrl:'https://creativecommons.org/licenses/by-sa/3.0/',verified:true};
test('ingredient photos require real-file provenance and usable licence evidence',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js');
 assert.equal(ingredientPhoto('2 garlic cloves, minced',[entry]).id,'garlic');
 for(const broken of [{...entry,verified:false},{...entry,creator:''},{...entry,licenceUrl:''},{...entry,url:'javascript:alert(1)'},{...entry,filePage:'https://evil.test/garlic'}])assert.equal(ingredientPhoto('garlic',[broken]),null);
});
test('powders, pastes and mixed alternatives do not silently receive a whole-food photograph',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js');
 for(const row of ['1 tsp garlic powder','1 tbsp ginger garlic paste','1 clove garlic or 1 shallot','garlic and ginger','1/2 cup garlic stock'])assert.equal(ingredientPhoto(row,[entry]),null,row);
 assert.equal(ingredientPhoto('2 cloves garlic (minced)',[entry]).id,'garlic');
});
test('the most specific approved photo wins for a compound ingredient',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js');
 const rice={...entry,id:'rice',aliases:['rice']},vinegar={...entry,id:'rice-vinegar',aliases:['rice vinegar']};
 assert.equal(ingredientPhoto('1 tsp rice vinegar',[rice,vinegar]).id,'rice-vinegar');
});
test('public-domain photo evidence is allowed only on that original file page',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js');const photo={...entry,licence:'Public domain',licenceUrl:entry.filePage};
 assert.equal(ingredientPhoto('garlic',[photo]),photo);assert.equal(ingredientPhoto('garlic',[{...photo,licenceUrl:'https://commons.wikimedia.org/wiki/File:Other.jpg'}]),null);
});
test('the real Wikimedia thumbnail host retains the original-file credit',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js');const photo={...entry,url:'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Garlic.jpg/250px-Garlic.jpg'};
 assert.equal(ingredientPhoto('garlic',[photo]),photo);
});
test('a boneless-and-skinless description does not turn one ingredient into a mixed-food line',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js');const {readFile}=await import('node:fs/promises');const p=JSON.parse(await readFile('data/ingredient-photos.json','utf8')).photos;
 assert.equal(ingredientPhoto('6 chicken thighs boneless and skinless',p)?.id,'chicken-thigh-alt');
});
test('each curated registry record matches its own first declared ingredient alias',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js');const {readFile}=await import('node:fs/promises');const p=JSON.parse(await readFile('data/ingredient-photos.json','utf8')).photos;
 for(const photo of p)assert.equal(ingredientPhoto(photo.aliases[0],[photo])?.id,photo.id,photo.id);
});
const actualRegistry=async()=>JSON.parse(await(await import('node:fs/promises')).readFile('data/ingredient-photos.json','utf8')).photos;
test('grated turmeric and fried onions from the actual collection never receive powder or raw references',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 assert.equal(ingredientPhoto('3 tsp turmeric (, finely grated (sub 1 1/2 tsp powder, Note 3))',p),null);
 assert.equal(ingredientPhoto('2 tablespoon fried onions ((optional))',p),null);
});
test('mixed foods and parenthetical alternatives are rejected before preparation filtering',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 for(const row of ['Sea salt & freshly ground black pepper','garlic (or ginger)','1 tbsp garlic, ground ginger','1 egg (or cornstarch)'])assert.equal(ingredientPhoto(row,p),null,row);
});
