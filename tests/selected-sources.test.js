import test from 'node:test';
import assert from 'node:assert/strict';
const api=()=>import('../src/selected-sources.js');
const url='https://www.recipetineats.com/chicken-curry/';
const recipe={ '@type':'Recipe','@id':url+'#recipe',url,name:'Chicken Curry',author:{'@type':'Person',name:'Nagi'},recipeIngredient:['2 cloves garlic','1 cup rice'],aggregateRating:{'@type':'AggregateRating',ratingValue:'4.9',bestRating:'5',ratingCount:'238',reviewCount:'517'},image:'https://www.recipetineats.com/tachyon/curry.jpg'};
const html=value=>'<script type="application/ld+json">'+JSON.stringify(value)+'</script>';
test('meal-type filters use original categories and compose with source and ingredient search',async()=>{
 const {recipeCourses,filterRecipes}=await api();
 const rows=[{id:'sweet',source:'recipetineats',title:'Cake',category:'Dessert, Baking',ingredients:['rice'],rating:null},{id:'starter',source:'goodfood',title:'Rice bites',category:'Appetizer, Snack',ingredients:['rice'],rating:null},{id:'main',source:'goodfood',title:'Dinner',category:'Main Course',ingredients:['rice'],rating:null}];
 assert.deepEqual(recipeCourses(rows[0]),['dessert']);assert.deepEqual(recipeCourses(rows[1]),['appetiser']);
 assert.deepEqual(filterRecipes(rows,{source:'goodfood',query:'rice',course:'appetiser'}).map(r=>r.id),['starter']);
 assert.deepEqual(recipeCourses({title:'Sweet cake',category:'Breakfast'}),['breakfast']);
 assert.deepEqual(recipeCourses({category:'Mains'}),['main']);assert.deepEqual(recipeCourses({category:'Sides'}),['side']);assert.deepEqual(recipeCourses({category:'Dip'}),['appetiser']);
 assert.deepEqual(recipeCourses({category:''}),['other']);
});
test('recipe pages bound rendering while keeping total counts and clamping stale pages',async()=>{
 const {recipePage}=await api(),rows=Array.from({length:55},(_,id)=>({id}));
 const second=recipePage(rows,2);assert.equal(second.records.length,24);assert.equal(second.records[0].id,24);assert.equal(second.start,25);assert.equal(second.end,48);assert.equal(second.total,55);assert.equal(second.pages,3);
 assert.equal(recipePage(rows,999).records.length,7);assert.equal(recipePage(rows,-1).page,1);
 assert.equal(recipePage([],8).total,0);assert.equal(recipePage([],8).start,0);
});
test('only the 16 selected publishers pass exact HTTPS source validation',async()=>{
 const {SOURCES,approvedSource}=await api();assert.equal(SOURCES.length,16);
 assert.equal(approvedSource(url).id,'recipetineats');
 for(const bad of ['http://www.recipetineats.com/x','https://recipetineats.com.evil.test/x','https://evil.recipetineats.com/x','https://user:secret@recipetineats.com/x','https://recipetineats.com:444/x','https://themealdb.com/x','https://en.wikibooks.org/x'])assert.equal(approvedSource(bad),null,bad);
});
test('main recipe metadata wins over related recipes and webpage ratings',async()=>{
 const {extractRecipe}=await api();const related={...recipe,'@id':'https://www.recipetineats.com/other/#recipe',url:'https://www.recipetineats.com/other/',name:'Other',aggregateRating:{ratingValue:1,bestRating:5,ratingCount:999}};
 const record=extractRecipe(html({'@graph':[related,{'@type':'WebPage',url,aggregateRating:{ratingValue:5,ratingCount:9999}},recipe]}),url);
 assert.equal(record.title,'Chicken Curry');assert.equal(record.rating.value,4.9);assert.equal(record.rating.count,238);assert.equal(record.rating.countType,'ratings');assert.deepEqual(record.ingredients,['2 cloves garlic','1 cup rice']);assert.equal('instructions' in record,false);
});
test('ambiguous recipes, disallowed canonical origins and malformed scripts fail closed',async()=>{
 const {extractRecipe}=await api();assert.throws(()=>extractRecipe(html({...recipe,url:'https://evil.test/x'}),url));
 assert.throws(()=>extractRecipe(html([{...recipe,url:undefined,'@id':undefined},{...recipe,url:undefined,'@id':undefined,name:'Other'}]),url));
 assert.throws(()=>extractRecipe('<script type="application/ld+json">bad</script>',url));
});
test('review counts remain reviews and unrated placeholders never become ratings',async()=>{
 const {extractRecipe}=await api();const r=extractRecipe(html({...recipe,aggregateRating:{ratingValue:4.5,reviewCount:10}}),url);assert.equal(r.rating.countType,'reviews');assert.equal(r.rating.count,10);
 for(const aggregateRating of [undefined,{ratingValue:5,ratingCount:0},{ratingValue:9,bestRating:5},{ratingValue:'NaN',bestRating:5}])assert.equal(extractRecipe(html({...recipe,aggregateRating}),url).rating,null);
});
test('filters use ingredient/name/source and rated sorting keeps missing scores last',async()=>{
 const {filterRecipes,extractRecipe}=await api();const a=extractRecipe(html(recipe),url),b={...a,id:'unrated',title:'Rice',rating:null};
 assert.deepEqual(filterRecipes([b,a],{query:'garlic',ratedOnly:true,sort:'rating'}).map(x=>x.title),['Chicken Curry']);
 assert.deepEqual(filterRecipes([b,a],{source:'recipetineats',sort:'rating'}).map(x=>x.title),['Chicken Curry','Rice']);
});
test('collector rejects disallowed redirects before requesting the destination',async()=>{
 const {fetchPage}=await import('../scripts/collect-selected-recipes.mjs');let calls=0;
 await assert.rejects(fetchPage(url,async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://evil.test/recipe'}});}),/allowlisted/);assert.equal(calls,1);
});
test('author graph references preserve the original named credit',async()=>{
 const {extractRecipe}=await api();const person={'@id':url+'#author','@type':'Person',name:'Original Cook'};
 assert.equal(extractRecipe(html({'@graph':[person,{...recipe,author:{'@id':person['@id']}}]}),url).author,'Original Cook');
});
test('every canonical publisher is checked regardless of attribute order or quoting',async()=>{
 const {extractRecipe}=await api();
 for(const link of ['<link href="https://evil.test/recipe" rel="canonical">','<link HREF=https://evil.test/recipe REL=canonical>','<link rel="canonical" href="https://www.recipetineats.com/chicken-curry/"><link href="https://evil.test/x" rel="canonical">'])assert.throws(()=>extractRecipe(link+html(recipe),url),/canonical/i);
});
test('aggregator original-source references cannot hide in arrays or @id objects',async()=>{
 const {extractRecipe}=await api(),u='https://app.samsungfood.com/recipes/123';
 for(const isBasedOn of [{'@id':'https://evil.test/recipe'},['https://evil.test/recipe'],{},[{url:'https://www.recipetineats.com/chicken-curry/'},{'@id':'https://evil.test/x'}]])assert.throws(()=>extractRecipe(html({...recipe,url:u,'@id':u+'#recipe',isBasedOn}),u),/original|provenance/i);
});
test('an identity-less nested related recipe cannot become the main recipe',async()=>{
 const {extractRecipe}=await api();const related={...recipe,url:undefined,'@id':undefined};
 assert.throws(()=>extractRecipe(html({'@type':'WebPage',url,mainEntity:{'@type':'Article',name:'Article'},related:related}),url),/main|unambiguous/i);
 assert.equal(extractRecipe(html({'@type':'WebPage',url,mainEntity:related}),url).title,recipe.name);
});
test('rating counts and their stated meaning must agree',async()=>{
 const {extractRecipe,validateRecipe}=await api();const r=extractRecipe(html(recipe),url);
 assert.throws(()=>validateRecipe({...r,rating:{...r.rating,countType:null}}),/rating/i);
 assert.throws(()=>validateRecipe({...r,rating:{...r.rating,count:null}}),/rating/i);
});
test('the main recipe can link its rating to a same-page AggregateRating graph node',async()=>{
 const {extractRecipe}=await api(),u='https://www.maangchi.com/recipe/japchae',id='/recipe/japchae#sso/recipe/96/rating-aggregate/4-5/1389/1/5';
 const main={...recipe,url:u,'@id':u+'#recipe',aggregateRating:{'@id':id}};
 const score={'@type':'AggregateRating','@id':id,ratingValue:4.5,ratingCount:1389,bestRating:5,worstRating:1};
 assert.deepEqual(extractRecipe(html({'@graph':[main,score]})+'<h2>Ingredients</h2><ul><li>rice</li></ul><h2>Directions</h2>',u).rating,{value:4.5,best:5,worst:1,count:1389,countType:'ratings'});
});
test('linked ratings reject unrelated pages, missing nodes and conflicting graph definitions',async()=>{
 const {extractRecipe}=await api(),id=url+'#rating',score={'@type':'AggregateRating','@id':id,ratingValue:4.5,ratingCount:12};
 for(const [reference,targets] of [[id,[]],['https://evil.test/x#rating',[{...score,'@id':'https://evil.test/x#rating'}]],['https://www.recipetineats.com/other/#rating',[{...score,'@id':'https://www.recipetineats.com/other/#rating'}]],[id,[score,{...score,ratingValue:1}]],[id,[{...score,'@type':'WebPage'}]]]){
  const main={...recipe,aggregateRating:{'@id':reference}};assert.equal(extractRecipe(html({'@graph':[main,...targets]}),url).rating,null,reference);
 }
});
test('an unlinked same-id enrichment cannot silently add a recipe score',async()=>{
 const {extractRecipe}=await api();const main={...recipe,aggregateRating:undefined};
 const enrichment={'@id':recipe['@id'],aggregateRating:{'@type':'AggregateRating',ratingValue:5,reviewCount:157}};
 assert.equal(extractRecipe(html(main)+html(enrichment),url).rating,null);
});
test('Good Food split rating requires the exact main recipe identity and explicit owning page',async()=>{
 const {extractRecipe}=await api(),u='https://www.bbcgoodfood.com/recipes/example';
 const main={...recipe,'@id':u+'#Recipe',url:u,mainEntityOfPage:{'@type':'WebPage','@id':u},aggregateRating:undefined};
 const extra={'@context':'https://schema.org/','@id':u+'#Recipe',aggregateRating:{ratingValue:4.8,bestRating:5,reviewCount:100}};
 assert.equal(extractRecipe(html(main)+html(extra),u).rating?.count,100);
 assert.equal(extractRecipe(html(main)+html(extra),u).rating?.countType,'reviews');
 for(const bad of [{...extra,'@id':u+'-other#Recipe'},{...extra,url:u}, {...extra,aggregateRating:{ratingValue:5,reviewCount:0}}])assert.equal(extractRecipe(html(main)+html(bad),u).rating,null);
 assert.equal(extractRecipe(html({...main,mainEntityOfPage:undefined})+html(extra),u).rating,null);
 assert.equal(extractRecipe(html(main)+html(extra)+html({...extra,aggregateRating:{ratingValue:1,reviewCount:100}}),u).rating,null);
});
test('Maangchi ingredient facts come from the complete main ingredient section',async()=>{
 const {extractRecipe}=await api(),u='https://www.maangchi.com/recipe/example';
 const main={...recipe,url:u,'@id':u+'#recipe',recipeIngredient:['garlic']};
 const section='<h2>Ingredients</h2><ul><li>2 cups rice</li><li>&#49; egg</li></ul><h3>For the sauce</h3><ul><li>1 tbsp soy sauce</li></ul><h2>Directions</h2><ol><li>Do not copy this method.</li></ol>';
 for(const body of [section,section.replace('>Directions<','>How to prepare the rice<')]){const r=extractRecipe(html(main)+body,u);assert.deepEqual(r.ingredients,['2 cups rice','1 egg','1 tbsp soy sauce']);assert.equal(JSON.stringify(r).includes('Do not copy this method'),false);}
});
test('missing or ambiguous Maangchi ingredient sections fail closed',async()=>{
 const {extractRecipe}=await api(),u='https://www.maangchi.com/recipe/example',main={...recipe,url:u,'@id':u+'#recipe'};
 const section='<h2>Ingredients</h2><ul><li>rice</li></ul><h2>Directions</h2>';
 for(const content of ['',section+section,'<h2>Ingredients</h2><ul><li>rice</li></ul>'])assert.throws(()=>extractRecipe(html(main)+content,u),/ingredient section/i);
});
test('recipe photographs follow only their explicit ImageObject graph reference',async()=>{
 const {extractRecipe}=await api(),id='https://images.example.test/dish#image';
 const main={...recipe,image:[{'@id':id}]},photo={'@type':'ImageObject','@id':id,url:'https://images.example.test/dish.jpg'},avatar={'@type':'ImageObject','@id':'#author-photo',url:'https://images.example.test/avatar.jpg'};
 assert.equal(extractRecipe(html({'@graph':[avatar,main,photo]}),url).photoUrl,photo.url);
});
test('missing or conflicting image graph references remain empty',async()=>{
 const {extractRecipe}=await api(),id=url+'#image',main={...recipe,image:{'@id':id}},photo={'@type':'ImageObject','@id':id,url:'https://images.example.test/dish.jpg'};
 for(const targets of [[],[photo,{...photo,url:'https://images.example.test/other.jpg'}],[{...photo,'@type':'WebPage'}],[{...photo,url:'javascript:alert(1)'}]])assert.equal(extractRecipe(html({'@graph':[main,...targets]}),url).photoUrl,null);
});
test('explicitly labelled equipment is excluded from 196 Flavors ingredient facts',async()=>{
 const {extractRecipe}=await api(),u='https://www.196flavors.com/falafel-taamiya/';const main={...recipe,url:u,'@id':u+'#recipe',recipeIngredient:['2 cups dried chickpeas','Food processor']};
 const equipment='<h4 class="wprm-recipe-group-name">Equipment</h4><ul class="wprm-recipe-ingredients"><li><span>Food processor</span></li></ul>';
 assert.deepEqual(extractRecipe(html(main)+equipment,u).ingredients,['2 cups dried chickpeas']);
 assert.equal(extractRecipe(html(main),u).ingredients.length,2,'equipment is removed only with explicit publisher evidence');
});
test('world-favourites membership composes with source, query and rating filters',async()=>{
 const {filterRecipes,extractRecipe}=await api(),a=extractRecipe(html(recipe),url),b={...a,id:'other',title:'Other dish'};
 assert.deepEqual(filterRecipes([a,b],{recipeIds:['other']}).map(x=>x.id),['other']);
 assert.equal(filterRecipes([a,b],{recipeIds:[],query:'garlic'}).length,0);
 assert.equal(filterRecipes([a,b],{recipeIds:['other'],source:'recipetineats',query:'other',ratedOnly:true}).length,1);
 assert.equal(filterRecipes([a,b],{recipeIds:['other'],source:'maangchi'}).length,0);
});
test('a world favourites registry must name exactly 100 distinct rated and photographed recipes',async()=>{
 const {validateWorldFavourites,extractRecipe}=await api(),a=extractRecipe(html(recipe),url);
 const records=Array.from({length:100},(_,i)=>({...a,id:'dish-'+i,url:'https://www.recipetineats.com/dish-'+i+'/'}));const collection={id:'world-favourites-100',title:'100 world favourites',summary:'Editorial curation, not a worldwide ranking.',checkedAt:'2026-10-24T12:00:00Z',recipeIds:records.map(x=>x.id)};
 assert.equal(validateWorldFavourites(collection,records).recipeIds.length,100);
 for(const recipeIds of [collection.recipeIds.slice(1),collection.recipeIds.map(()=>records[0].id),[...collection.recipeIds.slice(1),'missing']])assert.throws(()=>validateWorldFavourites({...collection,recipeIds},records),/curation/i);
 for(const extra of [{rating:null},{photoUrl:null},{rating:{...a.rating,value:3.9}},{rating:{...a.rating,count:null,countType:null}}])assert.throws(()=>validateWorldFavourites(collection,[{...records[0],...extra},...records.slice(1)]),/curation/i);
});
test('the recipe collector accepts the expanded seed batch while retaining a hard allowlisted bound',async()=>{
 const {validateSeeds}=await import('../scripts/collect-selected-recipes.mjs');const seeds=Array.from({length:144},(_,i)=>'https://www.recipetineats.com/dish-'+i+'/');
 assert.equal(validateSeeds(seeds).length,144);
 assert.throws(()=>validateSeeds([...seeds,...Array(107).fill(url)]),/seed/i);
 assert.throws(()=>validateSeeds([...seeds,'https://evil.test/recipe']),/seed/i);
});
