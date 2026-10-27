import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {emptyStore} from '../src/model.js';
import {createCloudSync,syncFingerprint} from '../src/cloud-sync.js';

// Exercise the actual event owner with only the browser boundary replaced.
// A failed persist followed by a mutation or a removed plan must fail these tests.
async function appWithStore(state, persists) {
  let source=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
  const imports=[...source.matchAll(/^import \{[^\n]+\} from '([^']+)';$/gm)];
  const bindings={};
  for(const match of imports)Object.assign(bindings,await import(new URL('../src/'+match[1].slice(2),import.meta.url)));
  source=source.replace(/^import .*;\n/gm,'').replace(/\n(?:render\(\);|\/\/ Start application\.)[\s\S]*$/,'');
  const meal={idMeal:'unit-1',strMeal:'Rice',strInstructions:'Boil rice.',strIngredient1:'Rice',strMeasure1:'1 cup'};
  const notices=[];
  const handlers={};
  const sandbox={...bindings,loadStore:()=>state,persistStore:()=>persists,
    document:{body:{style:{}},getElementById:()=>({querySelector:()=>null,querySelectorAll:()=>[],contains:()=>false,focus:()=>{},scrollIntoView:()=>{}}),addEventListener:(name,handler)=>{handlers[name]=handler;}},
    window:{addEventListener:()=>{},location:{href:'https://tasteit.test/app/'},history:{state:{},pushState:()=>{},replaceState:()=>{}}},
    console,URL,AbortController,DOMException,structuredClone,setTimeout,clearTimeout,setInterval,clearInterval,
    FormData:class {constructor(target){this.fields=target.fields||{};}get(key){return this.fields[key]??null;}entries(){return Object.entries(this.fields)[Symbol.iterator]();}[Symbol.iterator](){return this.entries();}},
    notices,meal};
  vm.createContext(sandbox);
  vm.runInContext(source+'\nconst originalRenderDialog=renderDialog;syncCookingTimer=()=>{};render=()=>{};renderDialog=()=>{};recipeStatus=()=>{}; notice=m=>notices.push(m); activeMeals=[meal]; globalThis.audit={markRecipe,home:discoverPage,planMarkup:planPage,targetServings:()=>detailTargetServings,previewCooking:target=>{selectedMeal=meal;detailTargetServings=target;stepIndex=0;originalRenderDialog();return overlayRoot.innerHTML;},store,cloudMarkup:cloudControls,paintAccount:(root,state)=>{hostAuthState=state;const previous=document.getElementById;document.getElementById=id=>id==="host-account"?root:null;updateConnectionUI();document.getElementById=previous;},setAccountBoundary:(auth,sync)=>{hostAuth=auth;cloudSync=sync;document.querySelector=()=>null;},paintSync:root=>{const previous=document.getElementById;document.getElementById=id=>id==="cloud-controls"?root:null;updateConnectionUI();document.getElementById=previous;},select:()=>{selectedMeal=meal;},candidates:rows=>{activeMeals=rows;},prepareSuggestions:()=>{loading=false;discoverPage();},selected:()=>selectedMeal};',sandbox);
  return {...sandbox.audit,notices,meal,click:async(action,id,tag,personal=false,planSlot='')=>{
    const target={dataset:{action,id,tag,planOpen:planSlot},closest:selector=>selector==='[data-action]'?target:selector==='[data-personal-recipe]' && personal?target:null};
    await handlers.click({target});
  },submit:async(id,fields)=>handlers.submit({preventDefault:()=>{},target:{id,fields}})};
}
test('failed cookbook save leaves in-memory flags unchanged',async()=>{
  const state=emptyStore();
  const app=await appWithStore(state,false);
  await app.markRecipe('unit-1','wanted');
  assert.deepEqual(state.saved,{});
  assert.match(app.notices[0],/could not save/i);
});
test('failed flag toggle preserves the existing nested recipe entry',async()=>{
  const state=emptyStore();
  const app=await appWithStore(state,false);
  state.saved['unit-1']={meal:app.meal,wanted:true};
  await app.markRecipe('unit-1','wanted');
  assert.equal(state.saved['unit-1'].wanted,true);
});
test('removing the final collection flag keeps a scheduled recipe and its portions',async()=>{
  const state=emptyStore();
  const app=await appWithStore(state,true);
  state.saved['unit-1']={meal:app.meal,wanted:true};
  state.plan['2026-10-25']='unit-1';state.planServings['2026-10-25']=3;
  await app.markRecipe('unit-1','wanted');
  assert.equal(state.plan['2026-10-25'],'unit-1');
  assert.equal(state.saved['unit-1'].wanted,false);
  assert.equal(state.planServings['2026-10-25'],3);
});
test('failed label removal preserves labels and planned meals',async()=>{
  const state=emptyStore();
  const app=await appWithStore(state,false);
  state.saved['unit-1']={meal:app.meal,tags:['Family']};
  state.plan['2026-10-25']='unit-1';
  await app.click('remove-tag','unit-1','Family');
  assert.deepEqual(state.saved['unit-1'].tags,['Family']);
  assert.equal(state.plan['2026-10-25'],'unit-1');
});
test('reviewed purchases persist once and failed storage preserves inventory',async()=>{
  for(const writes of [false,true]) {
    const state=emptyStore();
    state.shoppingExtras=[{id:'manual-rice',name:'Rice',checked:true}];
    const app=await appWithStore(state,writes);
    await app.click('shopping-receive');
    const fields={'pick-0':'on','amount-0':'1','unit-0':'kg','location-0':'Pantry','expiry-0':''};
    await app.submit('purchase-review-form',fields);
    assert.equal(state.pantry.length,writes?1:0);
    if(writes) {
      await app.submit('purchase-review-form',fields);
      assert.equal(state.pantry.length,1,'repeat submit does not add the same purchase twice');
    } else assert.deepEqual(state.shoppingStocked,{});
  }
});
test('cooking journal, reviewed quantities, session clearing and leftovers commit together',async()=>{
  for(const writes of [false,true]) {
    const state=emptyStore(),app=await appWithStore(state,writes);
    state.pantry=[{id:'rice-lot',name:'Rice',quantity:'2',unit:'cups',expiry:''}];
    state.saved['unit-1']={meal:app.meal,wanted:true,cookedCount:0};
    state.cookingSessions['unit-1']={step:0,durationSeconds:300,remainingSeconds:300,endsAt:null};
    app.select();await app.click('cook-done','unit-1');
    await app.submit('cooking-log-form',{rating:'5',note:'Good','use-0':'on','used-0':'1.5',leftoverPortions:'1',leftoverLocation:'Fridge',leftoverReminder:''});
    assert.equal(state.pantry[0].quantity,writes?'0.5':'2');
    assert.equal(state.saved['unit-1'].cookedCount,writes?1:0);
    assert.equal(state.leftovers.length,writes?1:0);
    assert.equal(Boolean(state.cookingSessions['unit-1']),!writes);
    if(writes) {
      await app.submit('cooking-log-form',{rating:'5'});
      assert.equal(state.saved['unit-1'].cookedCount,1,'repeat completion cannot double-deduct');
    }
  }
});
test('taste form saves atomically and a failed write preserves the prior profile',async()=>{
  for(const writes of [false,true]) {
    const state=emptyStore();
    const app=await appWithStore(state,writes);
    await app.submit('taste-form',{cuisines:'Indian',avoidIngredients:'Aubergine'});
    assert.equal(state.tasteProfile.cuisines.join(','),writes?'Indian':'');
    assert.equal(state.tasteProfile.avoidIngredients.join(','),writes?'eggplant':'');
    assert.ok(app.notices.some(text=>writes?/taste.*saved/i.test(text):/could not save.*taste/i.test(text)));
  }
});
test('skipping suggestions changes only the profile and can be reversed',async()=>{
  for(const writes of [false,true]) {
    const state=emptyStore(),app=await appWithStore(state,writes);
    state.saved['unit-1']={meal:app.meal,wanted:true};
    await app.click('taste-hide','unit-1');
    assert.equal(state.tasteProfile.hiddenRecipeIds.join(','),writes?'unit-1':'');
    assert.equal(state.saved['unit-1'].wanted,true);
    if(writes) {
      await app.click('taste-show-hidden');
      assert.equal(state.tasteProfile.hiddenRecipeIds.length,0);
      assert.equal(state.saved['unit-1'].wanted,true);
    }
  }
});
for(const action of ['open','wanted'])test('suggestion '+action+' acts on the same detailed recipe used for ingredient exclusions',async()=>{
  const state=emptyStore(),app=await appWithStore(state,true);
  const original={...app.meal,strSource:'https://example.org/original'};
  state.saved['unit-1']={meal:original,wanted:true,tags:['Family']};
  state.tasteProfile={cuisines:[],avoidIngredients:['milk'],hiddenRecipeIds:[]};
  app.candidates([{...original,strIngredient1:'Milk',strSource:'https://example.org/new-source'}]);
  app.prepareSuggestions();
  await app.click(action,'unit-1',undefined,true);
  assert.equal(state.saved['unit-1'].meal.strIngredient1,'Rice');
  assert.equal(state.saved['unit-1'].meal.strSource,'https://example.org/original');
  if(action==='open')assert.equal(app.selected().strIngredient1,'Rice');
});
test('actions inside a suggested recipe dialog retain its displayed ingredients and source',async()=>{
  const state=emptyStore(),app=await appWithStore(state,true);
  const original={...app.meal,strSource:'https://example.org/original'};
  state.saved['unit-1']={meal:original,wanted:true};
  state.tasteProfile={cuisines:[],avoidIngredients:['milk'],hiddenRecipeIds:[]};
  app.candidates([{...original,strIngredient1:'Milk',strSource:'https://example.org/updated'}]);
  app.prepareSuggestions();await app.click('open','unit-1',undefined,true);
  await app.click('favourite','unit-1');
  assert.equal(state.saved['unit-1'].meal.strIngredient1,'Rice');
  assert.equal(app.selected().strSource,'https://example.org/original');
});

test('unrelated connection announcements do not replace unchanged sync buttons',async()=>{
 const app=await appWithStore(emptyStore(),true);let current=app.cloudMarkup(),writes=0;
 const root={get innerHTML(){return current;},set innerHTML(value){writes++;current=value;}};
 app.paintSync(root);app.paintSync(root);assert.equal(writes,0,'an offline/readiness announcement must keep the opt-in button attached');
});

test('home keeps usual dishes and want-to-try shelves available while discovery is loading',async()=>{
 const state=emptyStore(),app=await appWithStore(state,true);
 state.saved['regular']={meal:{...app.meal,idMeal:'regular',strMeal:'My regular curry'},usual:true};
 state.saved['next']={meal:{...app.meal,idMeal:'next',strMeal:'Next dessert'},wanted:true};
 state.saved['other']={meal:{...app.meal,idMeal:'other',strMeal:'Only a favourite'},favourite:true};
 const html=app.home();assert.match(html,/id="home-usual"/);assert.match(html,/id="home-wanted"/);
 assert.match(html,/My regular curry/);assert.match(html,/Next dessert/);
 assert.doesNotMatch(html.match(/id="home-usual"[\s\S]*?<\/section>/)?.[0]||'',/Next dessert|Only a favourite/);
 assert.doesNotMatch(html.match(/id="home-wanted"[\s\S]*?<\/section>/)?.[0]||'',/My regular curry|Only a favourite/);
});

test('planner exposes independent breakfast and legacy dinner controls with explicit shopping scope',async()=>{
 const app=await appWithStore(emptyStore(),true),markup=app.planMarkup();
 assert.match(markup,/data-plan-day="[0-9-]+:breakfast"/);
 assert.match(markup,/data-plan-day="[0-9-]+"/);
 assert.match(markup,/Shopping for the coming seven days/);
 assert.match(markup,/data-action="plan-next"/);
});
test('home exposes dated ingredient ideas while retaining usual and want-to-try shelves',async()=>{
 const {nextSevenDates}=await import('../src/model.js');
 const state=emptyStore();state.pantry=[{id:'rice',name:'Rice',quantity:'1',unit:'kg',expiry:nextSevenDates()[0].key}];
 const app=await appWithStore(state,true),markup=app.home();
 assert.match(markup,/data-action="use-soon"/);assert.match(markup,/Dated today/);
 assert.match(markup,/id="home-usual"/);assert.match(markup,/id="home-wanted"/);
});

test('preparation checklist uses confirmed scaled amounts and resumes the same portions',async()=>{
 const state=emptyStore(),app=await appWithStore(state,true);
 state.saved['unit-1']={meal:app.meal,wanted:true,baseServings:2};
 assert.match(app.previewCooking(4),/2 cup · Rice/);
 await app.click('start-cooking');assert.equal(state.cookingSessions['unit-1'].servings,4);
 assert.match(app.previewCooking(null),/2 cup · Rice/);
});

test('opening two planned slots carries their independent portion targets and discovery keeps its default',async()=>{
 const state=emptyStore(),app=await appWithStore(state,true);state.saved['unit-1']={meal:app.meal,baseServings:2,usual:true};
 state.plan={'2026-10-27':'unit-1','2026-10-27:breakfast':'unit-1'};state.planServings={'2026-10-27':3,'2026-10-27:breakfast':4};
 await app.click('open','unit-1',undefined,false,'2026-10-27:breakfast');assert.equal(app.targetServings(),4);
 await app.click('open','unit-1',undefined,false,'2026-10-27');assert.equal(app.targetServings(),3);
 await app.click('open','unit-1');assert.equal(app.targetServings(),2);
});

test('connection status paints preserve a partially typed account form despite DOM normalization',async()=>{
 const app=await appWithStore(emptyStore(),true);let html='',writes=0,typed='';
 const node={get innerHTML(){return html.replaceAll(' required>',' required="">');},set innerHTML(value){html=value;writes++;typed='';}};
 const state={supported:true,user:null,loading:false,message:''};
 app.paintAccount(node,state);typed='entered password';app.paintAccount(node,state);
 assert.equal(typed,'entered password');assert.equal(writes,1);
});
test('sign-out cancels cloud application before awaiting the remote account request',async()=>{
 const state=emptyStore(),app=await appWithStore(state,true);let finish,disconnected=false;
 app.setAccountBoundary({submit:()=>new Promise(r=>finish=r)},{disconnect:()=>{disconnected=true;}});
 const pending=app.click('account-sign-out');const stoppedBeforeResponse=disconnected;finish({succeeded:true});await pending;
 assert.equal(stoppedBeforeResponse,true,'an in-flight download must be cancelled immediately');assert.deepEqual(state,emptyStore());
});
test('sign-out preserves local records when delayed cloud reads or writes outlive failed auth',{timeout:2000},async()=>{
 for(const heldMethod of ['GET','PUT'])for(const authSuccess of [true,false]){
  const state={...emptyStore(),pantry:[{id:'local',name:'Local rice',quantity:'1',unit:'kg'}]},app=await appWithStore(state,true);
  let releaseRequest,finishAuth,notifyHeld;const held=new Promise(r=>notifyHeld=r);let consent='test-consent',meta={consentId:consent,revision:heldMethod==='GET'?1:0,base:syncFingerprint(heldMethod==='GET'?state:emptyStore())};
  const remote={...emptyStore(),pantry:[{id:'remote',name:'Remote replacement',quantity:'2',unit:'kg'}]};
  const sync=createCloudSync({readLocal:()=>state,writeLocal:data=>{Object.assign(state,data);return true;},readConsent:()=>consent,writeConsent:value=>{consent=value;return true;},readMeta:()=>meta,writeMeta:value=>{meta=value;return true;},isOnline:()=>true,fetch:async(_url,options)=>{
   if(options.method===heldMethod){notifyHeld();return await new Promise(r=>releaseRequest=r);}
   return Response.json({accountId:'owner',revision:0,data:null});
  }});
  app.setAccountBoundary({submit:()=>new Promise(r=>finishAuth=r)},sync);
  const inFlight=sync.sync();await held;const signOut=app.click('account-sign-out');
  releaseRequest(Response.json(heldMethod==='GET'?{accountId:'owner',revision:2,data:remote}:{accountId:'owner',revision:1,updatedAt:new Date().toISOString()}));await inFlight;
  finishAuth({succeeded:authSuccess});await signOut;
  assert.equal(state.pantry[0].name,'Local rice',heldMethod+' response must not apply after sign-out');assert.equal(sync.state.enabled,false);assert.equal(consent,null);
 }
});
