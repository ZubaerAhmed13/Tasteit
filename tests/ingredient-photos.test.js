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
test('garlic clove units do not become a competing clove-spice photo',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js');const clove={...entry,id:'clove-spice',aliases:['cloves','whole cloves']};
 for(const line of ['2 cloves garlic, minced','6 garlic cloves','1 clove of garlic'])assert.equal(ingredientPhoto(line,[entry,clove])?.id,'garlic',line);
 assert.equal(ingredientPhoto('5 whole cloves',[entry,clove])?.id,'clove-spice');assert.equal(ingredientPhoto('garlic, cloves',[entry,clove]),null);
});
test('one roasted-and-shredded ingredient needs a matching roasted reference',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js');const gim={...entry,id:'gim',aliases:['gim'],form:'roasted'};
 assert.equal(ingredientPhoto('1 sheet of gim, roasted and shredded',[gim])?.id,'gim');
 assert.equal(ingredientPhoto('garlic, roasted and shredded',[entry]),null);assert.equal(ingredientPhoto('gim and garlic',[gim,entry]),null);
});
test('a taste adjustment is not a choice of another ingredient',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 assert.equal(ingredientPhoto('1 teaspoon salt ((or to taste))',p)?.id,'salt');
 assert.equal(ingredientPhoto('salt (or pepper)',p),null);
});
test('a chilled-and-cubed ingredient remains one food',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 assert.equal(ingredientPhoto('100g/4oz butter chilled and cubed',p)?.id,'butter');
 assert.equal(ingredientPhoto('butter and milk',p),null);
});
test('a powdered reference cannot illustrate a sliced or cubed root',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 assert.equal(ingredientPhoto('turmeric, sliced',p),null);assert.equal(ingredientPhoto('turmeric, cubed',p),null);
});
test('candied peel cannot use a whole citrus reference',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 for(const row of ['candied orange peel','candied lemon peel','orange peel'])assert.equal(ingredientPhoto(row,p),null,row);
});
test('comma-separated food mixtures need every component represented together',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 for(const row of ['oregano, salt, pepper','salt, oregano','oregano, salt'])assert.equal(ingredientPhoto(row,p),null,row);
 assert.equal(ingredientPhoto('2 EL, gehäuft Currypulver (leicht gehäuft)',p)?.id,'curry-powder');
 assert.equal(ingredientPhoto('2 cloves garlic, minced',p)?.id,'garlic');
});
test('canned ingredients require an explicitly reviewed canned reference',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 assert.equal(ingredientPhoto('400g can chopped tomatoes',p),null);
 assert.equal(ingredientPhoto('400g canned chopped tomatoes',p),null);
 assert.equal(ingredientPhoto('1 cup coconut milk ( canned unsweetened )',p)?.id,'coconut-milk');
});
test('plural cans still require a canned reference',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();assert.equal(ingredientPhoto('2 cans cherry tomatoes',p),null);
});
test('unregistered plant and concentrated milks do not receive the base milk photo',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=(await actualRegistry()).filter(x=>x.id==='milk');
 for(const line of ['125ml oat milk','1 cup almond milk','condensed milk'])assert.equal(ingredientPhoto(line,p),null,line);
 assert.equal(ingredientPhoto('300ml semi-skimmed milk',p)?.id,'milk');
});
test('toasted and roasted references require an explicitly reviewed heated form',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=(await actualRegistry()).filter(x=>['sesame-seeds','sesame-oil','garlic','gim-roasted'].includes(x.id));
 assert.equal(ingredientPhoto('toasted sesame seeds',p),null);
 assert.equal(ingredientPhoto('toasted sesame oil',p),null);
 assert.equal(ingredientPhoto('roasted garlic',p),null);
 assert.equal(ingredientPhoto('roasted gim',p)?.id,'gim-roasted');
});
test('comma-separated preparation clauses keep one food while unknown food mixtures stay unresolved',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 for(const [line,id] of [['garlic, optional','garlic'],['4 ounces spinach, washed and drained','spinach-leaf'],['1 carrot, cut into matchsticks','carrot'],['3 green onions, cut crosswise into 2 inch long pieces','scallion'],['ripe tomatoes, beaten and mashed','tomato']])assert.equal(ingredientPhoto(line,p)?.id,id,line);
 for(const line of ['salt, chopped oregano','garlic and spinach','garlic, roasted and shredded'])assert.equal(ingredientPhoto(line,p),null,line);
});
test('wine adjectives separated by a comma do not become a food mixture',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),wine={...entry,id:'red-wine',aliases:['red wine'],form:'liquid'};
 assert.equal(ingredientPhoto('1 bottle (750 ml) dry, full-bodied red wine',[wine])?.id,'red-wine');
 assert.equal(ingredientPhoto('1 bottle dry, red wine, oregano',[wine]),null);
});
test('explicit photo exclusions are normalised and malformed exclusions fail closed',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),restricted={...entry,exclusions:['garlic chives']};
 assert.equal(ingredientPhoto('1 cup Chinese-garlic chives',[restricted]),null);assert.equal(ingredientPhoto('2 cloves garlic',[restricted])?.id,'garlic');
 for(const exclusions of ['garlic chives',[7],['']])assert.equal(ingredientPhoto('garlic',[{...entry,exclusions}]),null);
});
test('published specialised foods cannot receive a conflicting generic food photograph',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 const cases=[['butter','1/3 cup creamy peanut butter'],['water','1/4 cup rose water'],['flour','2 tbsp rice flour'],['flour','2 tbsp wheat flour (atta)'],['sugar','1 cup powdered sugar'],['sugar','icing sugar'],['ginger','1 Tbsp pickled red ginger'],['ginger','sushi ginger (gari)'],['mushroom','2 shiitake mushrooms'],['kombu','shio kombu (prepared)'],['eggs','20 egg dumpling wrappers'],['eggs','6 egg whites'],['eggs','2 egg yolks'],['eggs','hard-boiled eggs'],['garlic','1 cup Chinese garlic chives'],['lime','5 makrut lime leaves'],['lime','2 tsp lime zest'],['lemon','Zest of 1 lemon'],['kimchi','1/4 cup kimchi brine'],['bell-pepper','1 green bell pepper'],['yogurt','1/3 cup Greek yogurt (hung curd)'],['chicken-thigh-alt','4 bone-in skin-on chicken thighs'],['potato','Baked potato wedges'],['tomato','400g crushed tomatoes']];
 for(const [id,line] of cases)assert.equal(ingredientPhoto(line,p.filter(x=>x.id===id)),null,line);
});
test('an excluded component cannot expose a misleading fallback for a compound ingredient',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=(await actualRegistry()).filter(x=>['water','orange'].includes(x.id));
 assert.equal(ingredientPhoto('1/2 cup orange-blossom water',p),null);
 const specific={...entry,id:'orange-blossom-water',aliases:['orange blossom water']};assert.equal(ingredientPhoto('1/2 cup orange-blossom water',[...p,specific])?.id,'orange-blossom-water');
});
test('green capsicum descriptions cannot receive the red and yellow pepper photo',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 for(const line of ['1 small green capsicum / bell pepper','2 green capsicum / bell pepper'])assert.equal(ingredientPhoto(line,p),null,line);
 assert.equal(ingredientPhoto('1 red bell pepper',p)?.id,'bell-pepper');
});
test('a cilantro stem cannot receive a photograph of cilantro leaves',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 for(const line of ['1 cilantro stem ((washed, smashed, reserve leaves for garnish))','2 cilantro stems','coriander stems'])assert.equal(ingredientPhoto(line,p),null,line);
 assert.equal(ingredientPhoto('cilantro leaves',p)?.id,'coriander-leaf');
});
