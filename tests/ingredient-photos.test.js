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
 for(const line of ['1 small green capsicum / bell pepper','2 green capsicum / bell pepper']){
  assert.equal(ingredientPhoto(line,p.filter(x=>x.id==='bell-pepper')),null,line);
  assert.equal(ingredientPhoto(line,p)?.id,'green-bell-pepper',line);
 }
 assert.equal(ingredientPhoto('1 red bell pepper',p)?.id,'bell-pepper');
});
test('a cilantro stem cannot receive a photograph of cilantro leaves',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 for(const line of ['1 cilantro stem ((washed, smashed, reserve leaves for garnish))','2 cilantro stems','coriander stems'])assert.equal(ingredientPhoto(line,p),null,line);
 assert.equal(ingredientPhoto('cilantro leaves',p)?.id,'coriander-leaf');
});
test('plain all-purpose descriptions keep a known flour reference without accepting another food',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 assert.equal(ingredientPhoto('1 cup flour, plain / all purpose ((Note 1))',p)?.id,'flour');
 assert.equal(ingredientPhoto('1 cup flour, plain / all purpose, chicken',p),null);
 assert.equal(ingredientPhoto('flour, plain yogurt',p),null);
});
test('thawing and bread-size notes describe one food while extra ingredients stay unresolved',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 assert.equal(ingredientPhoto('3 frozen puff pastry sheets, just thawed ((300g/10oz) (Note 2))',p)?.id,'puff-pastry-raw');
 assert.equal(ingredientPhoto('1 slice homemade-type white bread, 1 inch thick, broken into small bite-sized pieces',p)?.id,'white-bread');
 assert.equal(ingredientPhoto('puff pastry, just thawed chicken',p),null);
 assert.equal(ingredientPhoto('white bread, broken chocolate',p),null);
});
test('named cultivars without matching photographic evidence remain gaps',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 assert.equal(ingredientPhoto('4 Lebanese / Persian cucumbers ((about 8"/20cm long))',p),null);
 assert.equal(ingredientPhoto('2 English cucumbers',p),null);
 assert.equal(ingredientPhoto('2 Japanese cucumbers',p),null);
 assert.equal(ingredientPhoto('3 fresh red chilies ((choose a chili with medium spice level; we used holland chilies))',p),null);
 assert.equal(ingredientPhoto('1 cucumber ((de-seeded and julienned))',p)?.id,'cucumber');
 assert.equal(ingredientPhoto('6 red chilies ((stemmed))',p)?.id,'red-chili');
});
test('source credit links must be safe and complete before a reference is eligible',async()=>{
 const {ingredientPhoto,ingredientPhotoCredits}=await import('../src/ingredient-photos.js');
 for(const creditLinks of [[],[{}],[{label:'Creator',url:'javascript:alert(1)'}],[{label:'',url:'https://example.org/'}]])assert.equal(ingredientPhoto('garlic',[{...entry,creditLinks}]),null);
 const credited={...entry,creditLinks:[{label:' Creator website ',url:'https://example.org/credit'}]};
 assert.equal(ingredientPhoto('garlic',[credited])?.id,'garlic');
 assert.deepEqual(ingredientPhotoCredits(credited),[{label:'Creator website',url:'https://example.org/credit'}]);
 assert.deepEqual(ingredientPhotoCredits(entry),[]);
});
test('the screenshot sesame seed oil name uses its verified oil photograph',async()=>{
 const {readFile}=await import('node:fs/promises'),{ingredientPhoto}=await import('../src/ingredient-photos.js');const p=JSON.parse(await readFile(new URL('../data/ingredient-photos.json',import.meta.url))).photos;
 assert.equal(ingredientPhoto('Sesame Seed Oil',p)?.id,'sesame-oil');
});
test('oil cannot fall back to a seed photograph when the oil reference is absent',async()=>{
 const {readFile}=await import('node:fs/promises'),{ingredientPhoto}=await import('../src/ingredient-photos.js');const p=JSON.parse(await readFile(new URL('../data/ingredient-photos.json',import.meta.url))).photos;
 assert.equal(ingredientPhoto('sesame seed oil',p.filter(p=>p.id==='sesame-seeds')),null);
 assert.equal(ingredientPhoto('sesame seeds',p)?.id,'sesame-seeds');
});
test('explicit minced beef aliases allow the matching ground form and preserve conflicting-form gaps',async()=>{
 const {readFile}=await import('node:fs/promises'),{ingredientPhoto}=await import('../src/ingredient-photos.js');const p=JSON.parse(await readFile(new URL('../data/ingredient-photos.json',import.meta.url))).photos;
 assert.equal(ingredientPhoto('Minced Beef',p)?.id,'beef-ground');
 assert.equal(ingredientPhoto('whole minced beef',p),null);assert.equal(ingredientPhoto('minced turmeric',p),null);
});
test('measured English paprika spoon quantities select ground paprika without guessing unqualified peppers',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 assert.equal(ingredientPhoto('1 tsp paprika',p)?.id,'paprika-ground');
 assert.equal(ingredientPhoto('2 tablespoons paprika',p)?.id,'paprika-ground');
 for(const line of ['Paprika','1 paprika','1 tsp smoked paprika','1 tsp paprika or chilli','1 tsp paprika paste'])assert.equal(ingredientPhoto(line,p),null,line);
});
test('compiled photo matching agrees on all catalogue rows and preserves credits',async()=>{
 const photos=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 assert.equal(typeof photos.createIngredientPhotoMatcher,'function');
 const match=photos.createIngredientPhotoMatcher(p),recipes=JSON.parse(await(await import('node:fs/promises')).readFile('data/selected-recipes.json','utf8')).recipes;
 for(const line of new Set(recipes.flatMap(x=>x.ingredients)))assert.deepEqual(match(line),photos.ingredientPhoto(line,p),line);
 assert.equal(match('garlic')?.creator,'Ivar Leidus');
});

test('newly verified everyday photos match their exact ingredient forms and never a different dish',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 for(const [line,id] of [['200 g paneer','paneer-fresh'],['2 tbsp cocoa powder','cocoa-powder'],['1 tbsp honey','honey'],['200 g raw shrimp','shrimp-raw'],['1 cup red lentils','lentils-red-dry']]){
  const hit=ingredientPhoto(line,p);assert.equal(hit?.id,id,line);assert.equal(hit.verified,true);
 }
 for(const line of ['paneer tikka','cooked shrimp','honey mustard','red lentil soup','hot chocolate'])assert.equal(ingredientPhoto(line,p),null,'No unrelated food photo: '+line);
});

test('high-frequency cooking photo additions are specific and never substitute a different preparation',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 for(const [line,id] of [
  ['1 tablespoon oil','cooking-oil-general'],
  ['1 tsp neutral oil','cooking-oil-general'],
  ['1 sprig curry leaves','curry-leaves-fresh'],
  ['2 tbsp Dijon mustard','dijon-mustard'],
  ['1 tsp dried thyme','thyme-dried'],
  ['2 tsp ground cinnamon','cinnamon-ground'],
  ['1/2 tbsp cinnamon powder','cinnamon-ground'],
  ['2 fresh shiitake mushrooms','shiitake-fresh'],
  ['1 tsp toasted sesame oil','sesame-oil-toasted'],
  ['1 tsp roasted sesame oil','sesame-oil-toasted'],
  ['1 tsp lemon zest','lemon-zest'],
  ['Zest of 1 lemon','lemon-zest']
 ])assert.equal(ingredientPhoto(line,p)?.id,id,line);
 for(const [line,id] of [
  ['3 tbsp olive oil','olive-oil'],
  ['1 tablespoon sesame oil','sesame-oil'],
  ['1 cinnamon stick','cinnamon'],
  ['4 dried shiitake mushrooms','shiitake-dried']
 ])assert.equal(ingredientPhoto(line,p)?.id,id,'a specific photo must win: '+line);
 for(const line of ['1 tsp essential oil','1 tbsp toasted sesame oil','1 tbsp dry mustard','curry leaf powder','fresh thyme']) {
  const found=ingredientPhoto(line,p);
  assert.ok(found?.id!=='cooking-oil-general'&&found?.id!=='curry-leaves-fresh'&&found?.id!=='dijon-mustard'&&found?.id!=='thyme-dried'&&found?.id!=='cinnamon-ground','wrong form must not be shown: '+line);
 }
});

test('new licensed photos match real raw ingredients without assigning the wrong prepared food',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 const cases=[['1 tbsp miso paste','miso-paste'],['1 tbsp miso','miso-paste'],['toasted sesame seeds','sesame-seeds-toasted'],['roasted sesame seeds','sesame-seeds-toasted'],['fresh bean sprouts','bean-sprouts-general']];
 for(const [line,id] of cases)assert.equal(ingredientPhoto(line,p)?.id,id,line);
 for(const line of ['red miso','white miso','miso soup','sesame oil','cooked bean sprouts','toasted sesame oil']) {
  const found=ingredientPhoto(line,p);
  assert.ok(!['miso-paste','bean-sprouts-general','sesame-seeds-toasted'].includes(found?.id),'must not use a different food form: '+line);
 }
});

test('verified public-domain black pepper never gets confused with peppercorns, other peppers or mixed seasoning',async()=>{
 const {ingredientPhoto}=await import('../src/ingredient-photos.js'),p=await actualRegistry();
 for(const line of ['ground black pepper','freshly ground black pepper','ground pepper'])assert.equal(ingredientPhoto(line,p)?.id,'ground-black-pepper',line);
 for(const line of ['whole peppercorns','white pepper','bell pepper','salt and freshly ground black pepper','cayenne pepper'])assert.notEqual(ingredientPhoto(line,p)?.id,'ground-black-pepper',line);
});
