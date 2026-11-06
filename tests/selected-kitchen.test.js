import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyStore,ingredientsOf,exportBackup,parseBackup,persistStore,readStoreStrict,shoppingList} from '../src/model.js';
import {readFile} from 'node:fs/promises';
import {scaledIngredients,plannedIngredients} from '../src/servings.js';
const record={id:'recipetineats-example',source:'recipetineats',url:'https://www.recipetineats.com/example/',title:'Original recipe',author:'Author',cuisine:'Japanese',category:'Main Course',ingredients:Array.from({length:28},(_,i)=>(i+1)+' g ingredient '+i),rating:{value:4.8,best:5,worst:1,count:100,countType:'ratings'},photoUrl:'https://www.recipetineats.com/example.jpg',checkedAt:'2026-10-25T10:00:00Z'};
test('collection flags preserve unrelated, cooking and plan records in fresh snapshots',async()=>{
 const {toggleCollectedFlag,collectedMeal}=await import('../src/selected-kitchen.js');const state=emptyStore(),id=collectedMeal(record).idMeal;
 state.saved['personal-other']={meal:{strMeal:'Other'},usual:true};
 state.saved[id]={meal:collectedMeal(record),wanted:true,cookedCount:2,tags:['Family']};
 state.plan['2026-10-25']=id;
 const next=toggleCollectedFlag(state,record,'usual');assert.equal(next.saved[id].usual,true);assert.equal(next.saved[id].wanted,true);assert.equal(next.saved[id].cookedCount,2);assert.deepEqual(next.saved[id].tags,['Family']);assert.equal(state.saved[id].usual,undefined);assert.equal(next.saved['personal-other'],state.saved['personal-other']);
 assert.equal(toggleCollectedFlag(next,record,'wanted').saved[id].wanted,false);assert.equal(next.plan['2026-10-25'],id);
 assert.throws(()=>toggleCollectedFlag(state,record,'unexpected'));
});
test('collected recipes preserve all source rows and ratings without pretending to have copied methods',async()=>{
 const {collectedMeal,collectedRecipe}=await import('../src/selected-kitchen.js');
 const meal=collectedMeal(record);assert.equal(meal.idMeal,'selected-'+record.id);assert.equal(meal.strSource,record.url);assert.equal(meal.strInstructions,'');
 assert.deepEqual(collectedRecipe(meal),record);assert.equal(collectedRecipe({...meal,idMeal:'1'}),null);
 assert.equal(collectedRecipe({...meal,selectedRecipe:{...record,source:'evil'}}),null);
});
test('unparsed publisher ingredients are held from automated suggestions when ingredient skips are set',async()=>{
 const {collectedMeal}=await import('../src/selected-kitchen.js');const {recommendRecipes}=await import('../src/personalisation.js');
 const meal=collectedMeal({...record,ingredients:['250 ml milk','1 cup rice']}),saved={[meal.idMeal]:{meal,wanted:true}};
 assert.equal(recommendRecipes([],saved,[],{cuisines:[],avoidIngredients:['milk'],hiddenRecipeIds:[]}).length,0);
 assert.equal(recommendRecipes([],saved,[],{cuisines:[],avoidIngredients:[],hiddenRecipeIds:[]}).length,1);
});
test('collected recipes keep rows beyond twenty through backup, portions and shopping without invented measurements',async()=>{
 const {collectedMeal}=await import('../src/selected-kitchen.js');const meal=collectedMeal(record),store=emptyStore();store.saved[meal.idMeal]={meal,wanted:true};
 const restored=parseBackup(exportBackup(store)).saved[meal.idMeal].meal;
 assert.equal(ingredientsOf(restored).length,28);assert.equal(ingredientsOf(restored)[27].name,record.ingredients[27]);
 assert.equal(scaledIngredients(restored,4,8).length,28);assert.equal(plannedIngredients(restored,4,8)[27].name,record.ingredients[27]);
 assert.equal(plannedIngredients(restored,4,8)[27].measure,'','source line quantities remain unparsed');
 const bad={...store,saved:{[meal.idMeal]:{meal:{...meal,selectedRecipe:{...record,url:'https://evil.test/recipe'}},wanted:true}}};
 assert.throws(()=>parseBackup(exportBackup(bad)),/invalid.*recipe|invalid.*record/i);
});
test('ingredient references render photo-only tiles, retain credits in metadata, and escape labels',async()=>{
 const {ingredientReference}=await import('../src/ingredient-reference.js');
 const photo={id:'garlic',label:'Garlic <fresh>',creator:'Cook & photographer',verified:true,aliases:['garlic'],form:'whole',url:'https://upload.wikimedia.org/garlic.jpg',filePage:'https://commons.wikimedia.org/wiki/File:Garlic.jpg',licence:'CC BY 4.0',licenceUrl:'https://creativecommons.org/licenses/by/4.0/',creditLinks:[{label:'Original source',url:'https://example.org/credit'}]};
  const {ingredientPhotoCredits}=await import('../src/ingredient-photos.js');
  const html=ingredientReference('garlic',[photo]);assert.match(html,/<img /);assert.doesNotMatch(html,/figcaption|https:\/\/example.org\/credit/);
  assert.deepEqual(ingredientPhotoCredits(photo),[{label:'Original source',url:'https://example.org/credit'}]);
  assert.match(html,/Garlic &lt;fresh&gt;/);assert.doesNotMatch(html,/<fresh>/);
  assert.match(ingredientReference('mystery ingredient',[photo]),/No photo/);
  assert.match(ingredientReference('garlic',[{...photo,creditLinks:[{label:'bad',url:'javascript:alert(1)'}]}]),/No photo/);
});
test('all 1008 collected recipes remain editable and restorable at the former pretty-backup boundary',async()=>{
 const {collectedMeal,toggleCollectedFlag}=await import('../src/selected-kitchen.js');
 const rows=JSON.parse(await readFile(new URL('../data/selected-recipes.json',import.meta.url))).recipes,state=emptyStore();
 for(const r of rows){const meal=collectedMeal(r);state.saved[meal.idMeal]={meal,wanted:true};}
 assert.ok(JSON.stringify(JSON.parse(exportBackup(state)),null,2).length>2_000_000,'reproduce the pretty-print boundary');
 assert.equal(Object.keys(parseBackup(exportBackup(state)).saved).length,rows.length);
 const values=new Map([['tasteit.local.v1',JSON.stringify(state)]]),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const fresh=readStoreStrict(storage),next=toggleCollectedFlag(fresh,rows.at(-1),'wanted');
 assert.equal(persistStore(next,storage),true);assert.equal(Object.keys(readStoreStrict(storage).saved).length,rows.length-1);
});
test('persistence rejects an invalid or oversized next snapshot before any storage write',()=>{
 let writes=0;const storage={setItem:()=>writes++};
 assert.equal(persistStore({...emptyStore(),pantry:[{name:'x'.repeat(151)}]},storage),false);
 assert.equal(persistStore({...emptyStore(),saved:{large:{meal:{strMeal:'Large',strInstructions:'x'.repeat(2_000_000)}}}},storage),false);
 assert.equal(writes,0);
});
test('a real long source ingredient needs an explicit pantry label and then round-trips through purchase and backup',async()=>{
 const {collectedMeal}=await import('../src/selected-kitchen.js');const {shoppingChecklist,toggleRecipeChecked}=await import('../src/shopping.js');const {purchaseReview,receivePurchases}=await import('../src/kitchen-flow.js');
 const rows=JSON.parse(await readFile(new URL('../data/selected-recipes.json',import.meta.url))).recipes,r=rows.find(r=>r.id==='maangchi-recipe-tteokbokki'),meal=collectedMeal(r),state=emptyStore(),now=new Date(2026,9,25,12);
 state.saved[meal.idMeal]={meal,wanted:true};state.plan['2026-10-25']=meal.idMeal;
 const item=shoppingList(state.plan,state.saved,[],{},now).find(i=>i.name.length>150);assert.equal(item.name.length,155);
 state.shoppingChecked=toggleRecipeChecked({},item);const review=purchaseReview(shoppingChecklist([item],[],state.shoppingChecked),{}),selection={key:review[0].key,quantity:'1',unit:'kg',location:'Pantry',expiry:''};
 assert.throws(()=>receivePurchases(state,review,[selection],'long-line',now),/name/i);
 const next=receivePurchases(state,review,[{...selection,name:'Rice cakes'}],'short-label',now);
 assert.equal(next.pantry[0].name,'Rice cakes');assert.equal(parseBackup(exportBackup(next)).pantry[0].name,'Rice cakes');assert.equal(next.saved[meal.idMeal].meal.selectedRecipe.ingredients.find(i=>i.length>150),item.name);
});
