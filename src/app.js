import { purchaseReview, purchaseFingerprint, receivePurchases, consumptionReview, applyConsumption, addLeftover, validKitchenState, STOCK_UNITS, STOCK_LOCATIONS } from './kitchen-flow.js';
import { readRoute, routeUrl, normaliseFilters, filterSummary } from './navigation.js';
import { loadStore, readStoreStrict, persistStore, localStoreStatus, restoreLocalStore, RECOVERY_KEY, normalizeIngredient, ingredientsOf, analyseMeal, shoppingList, nextSevenDates, usablePantryItem, exportBackup, parseBackup, createPersonalMeal, recordCooking } from './model.js';
import { discoverMeals, mealDetails, pantryCandidateReport, availableAreas, availableAreaRecords, availableCategories, randomMeal, scanWorldRecipes } from './api.js';
import { parseBulkPantry, applyBulkPantry } from './pantry-bulk.js';
import { dateStatus, expiringBatches, recipeUseSoon, rankByKitchen } from './pantry-batches.js';
import { validServings, scaledIngredients, scaledRecipeForComparison, setRecipeServings, resolvePlanServings } from './servings.js';
import { kitchenIngredientChoices, initialKitchenSelection, reconcileKitchenSelection, searchPantryRows, kitchenMatchDetails, localKitchenRecipes, combineKitchenRecipes, filterKitchenRecipes, MAX_KITCHEN_SEARCH } from './kitchen-discovery.js';
import { recipeSteps, safeCookingSession, timerStatus, moveCookingStep, setCookingTimer, startCookingTimer, pauseCookingTimer, resetCookingTimer } from './cooking.js';
import { addShoppingExtra, removeShoppingExtra, toggleShoppingExtra, toggleRecipeChecked, shoppingChecklist, shoppingPlainText, shoppingKey } from './shopping.js';
import { countryDirectory, catalogueFromProvider, catalogueCell, exportCatalogueIndex, hydrateCatalogueIndex, CATALOGUE_TARGET } from './world-catalogue.js';
import { editorialReview, savedEditorialReview, researchReviewSummary, researchLeadResults, exportEditorialReviewCsv } from './editorial.js';
import { emptyRightsReview, rightsReviewChecklist } from './rights-review.js';
import { sourceImageTitles, commonsFileMetadata } from './source-media.js';
import { recipeTitleIndex, possibleSourceMatches } from './source-overlap.js';
import { buildResearchPriority, researchQueueCounts, TRIAGE_MODES } from './research-priority.js';
import { addTag, removeTag, tagsOf, collectionTags, filterCookbook } from './organise.js';
import { emptyTasteProfile,createTasteProfile,recommendRecipes } from './personalisation.js';
import { createCloudSync,SYNC_KEY,SYNC_META_KEY } from './cloud-sync.js';
import { offlineRecipes,installOffline } from './offline.js';
import { collectedMeal,collectedRecipe } from './selected-kitchen.js';
import {recipeRatingMarkup} from './recipe-presentation.js';
import {planRecipe} from './recipe-planning.js';
import {discoveryOptions} from './discovery-options.js';
import {createRecipeCollectionLoader,searchRecipeCollection,recipeCuisineOptions} from './recipe-discovery.js';
import { validateRecipe,SOURCES,RECIPE_COURSES,recipePage } from './selected-sources.js';
import { ingredientReference } from './ingredient-reference.js';

const appRoot = document.getElementById('app');
const overlayRoot = document.getElementById('overlay-root');
const toastRoot = document.getElementById('toast');
const store = loadStore();
let recoveryViewRaw=null;
let ingredientPhotos=[];
let cloudSync=null,syncState={status:'off',enabled:false},offlineState={status:'preparing'},applyingCloud=false,applyingUpdate=false;

let cuisines = ['All', 'Italian', 'Indian', 'Japanese', 'Mexican', 'Moroccan', 'Thai', 'Turkish', 'Chinese', 'British', 'American', 'Greek', 'French', 'Vietnamese'];
let providerCuisines=cuisines.filter(x=>x!=='All');
let categories = ['All', 'Chicken', 'Seafood', 'Vegetarian', 'Pasta', 'Dessert', 'Vegan'];
let view = 'discover';
let activeMeals = [];
const collectionLoader=createRecipeCollectionLoader();
let collectionRecords=[],discoveryChoice=discoveryOptions({}),filtersOpen=window.matchMedia?.('(min-width:761px)').matches??true;
let loading = true;
let problem = '';
let serviceWarning = '';
let area = 'All';
let category = 'All';
let browseLetter = '';
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let bulkOpen = false;
let bulkDraft = '';
let bulkPreview = null;
let searchTerm = '';
let discoveryMode = 'featured';
let filterDraft = null;
let queryDraft = null;
let tasteDraft = null;
let tastePanelOpen = false;
let personalRecipeCards = new Map();
let kitchenSelection = [];
let kitchenDirty = false;
let kitchenShowAll = false;
let kitchenReadiness = 'all';
// Provider-scanned recipe index stays in memory. No fictitious ranks or local
// redistribution of recipes or third-party photographs.
let worldAreas = [];
let worldCategories = [];
let worldCountry = '';
let worldCategory = '';
let worldLoadingOptions = false;
let worldOptionsError = '';
let worldScan = null;
let worldScanProgress = {completed:0,total:26,recipes:0,failed:0};
let worldScanning = false;
let worldScanController = null;
let worldIndex = null;
let worldOverlapIndex=null;
let worldPartial = [];
let worldMeals = [];
let worldScannedAt = '';
let worldResearchOpen=false;
let worldResearchLoading=false;
let worldResearchEntries=[];
let worldResearchEvidence=new Map();
let worldResearchQuery='';
let worldResearchError='';
let worldResearchPage=0;
let worldResearchTag='';
let worldResearchStatus='all';
let worldResearchFocus='all';
let worldResearchGapMap=null;
let worldResearchGapAttempted=false;
let worldResearchReviewId='';
let worldMedia={sourceId:'',titles:[],selected:null,loading:false,error:''};

let libraryTab = 'all';
let libraryTag = '';
let librarySearch = '';
let librarySort = 'name';
let selectedMeal = null;
let openingMealId = '';
let detailRequestNumber = 0;
let detailController = null;
const recipeMutations = new Set();
let stepIndex = -1;
let showCookingLog = false;
let cookingStockSnapshot = [];
let purchaseDraft = null;
let detailTargetServings = null;
let editingId = null;
let newBatchName = null;
let showRecipeForm = false;
let editingRecipeId = null;
let requestNumber = 0;
let controller = null;
let toastTimer = null;
let dialogReturnFocus = null;
let dialogReturnId='',dialogReturnKind='recipe-photo',dialogReturnHref='';
let pendingResultFocus=null;
let cookingTimerTicker = null;
let timerCompletionNotified = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
function externalUrl(value, providerOnly = false) {
  try {
    const url = new URL(String(value));
    if (url.protocol !== 'https:') return '';
    if (providerOnly && !['www.themealdb.com', 'themealdb.com'].includes(url.hostname)) return '';
    return escapeHtml(url.toString());
  } catch { return ''; }
}
function notice(message) {
  clearTimeout(toastTimer);
  toastRoot.textContent = message;
  toastRoot.hidden = false;
  toastTimer = setTimeout(() => { toastRoot.hidden = true; }, 3600);
}
async function loadIngredientReferences() {
  try {
    const response=await fetch('./data/ingredient-photos.json',{signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('Photo registry unavailable');
    const data=await response.json();ingredientPhotos=Array.isArray(data.photos)?data.photos:[];
  }catch{ingredientPhotos=[];}
  // Update only reference cells: late photography must not erase a form or focus.
  for(const cell of overlayRoot.querySelectorAll('[data-ingredient-photo]'))
    cell.innerHTML=ingredientReference(cell.dataset.ingredientPhoto,ingredientPhotos);
}
function findMeal(id) {
  return activeMeals.find(x => x.idMeal === id) || worldMeals.find(x=>x.idMeal===id) || store.saved[id]?.meal || (selectedMeal?.idMeal === id ? selectedMeal : null);
}
function savedEntry(id) {
  return store.saved[id] || { meal: findMeal(id), wanted: false, usual: false, favourite: false, cookedCount: 0 };
}
function flags(entry) {
  return Boolean(entry && (entry.wanted || entry.usual || entry.favourite || entry.cookedCount > 0 || tagsOf(entry).length || validServings(entry.baseServings)));
}
function updateNav() {
  document.querySelectorAll('[data-nav]').forEach(button => {
    const selected = button.dataset.nav === view;
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}
function currentRoute() {
  return {...discoveryChoice,view,query:searchTerm,area:area==='All'?'':area,
    category:category==='All'?'':category,letter:browseLetter,
    kitchen:discoveryMode==='pantry',recipe:selectedMeal?.idMeal || openingMealId};
}
function writeRoute({replace=false,recipeOverlay=false}={}) {
  const url=routeUrl(currentRoute(),window.location.href);
  if(!replace && url.href===window.location.href)return;
  if(!replace)window.history.replaceState({...window.history.state,scrollY:window.scrollY},'',window.location.href);
  window.history[replace?'replaceState':'pushState']({tasteit:true,recipeOverlay,scrollY:window.scrollY,returnRecipe:dialogReturnId,returnKind:dialogReturnKind,returnHref:dialogReturnHref},'',url.href);
}
function stopDiscovery() {
  requestNumber++; controller?.abort(); loading=false;
}
function changeView(next) {
  stopDiscovery();
  closeDialog({history:false});
  filterDraft=null;queryDraft=null;purchaseDraft=null;
  pendingResultFocus=null;
  view=next;
  if(next==='discover'){searchTerm='';area='All';category='All';browseLetter='';discoveryChoice=discoveryOptions({scope:discoveryChoice.scope==='provider'?'provider':'collection'});discoveryMode='browse';}
  writeRoute();
  if(next==='discover')void discover('restore','',{history:false});
  else render();
  window.scrollTo({top:0,behavior:'instant'});
  appRoot.focus({preventScroll:true});
  if(next==='world' && !worldAreas.length && !worldLoadingOptions)void loadWorldOptions();
}
async function restoreRoute(route) {
  stopDiscovery();
  closeDialog({history:false});
  filterDraft=null;queryDraft=null;purchaseDraft=null;
  view=route.view;
  const filters=normaliseFilters(route);
  discoveryChoice=discoveryOptions(route);
  searchTerm=filters.query;area=filters.area||'All';category=filters.category||'All';browseLetter=filters.letter;
  discoveryMode=route.kitchen?'pantry':'browse';
  if(view==='discover')void discover('restore','',{history:false});
  else {
    render();restoreResultFocus();
    if(view==='world' && !worldAreas.length && !worldLoadingOptions)void loadWorldOptions();
  }
  if(route.recipe)void openMeal(route.recipe,{history:false});
  else window.scrollTo({top:window.history.state?.scrollY||0,behavior:'instant'});
}
async function loadWorldGapAudit() {
  if(worldResearchGapAttempted)return;
  worldResearchGapAttempted=true;
  try{
    const response=await fetch('./data/world-research-gaps.json');
    if(!response.ok)return;
    const report=await response.json();
    if(report?.version!==1 || !Array.isArray(report.rows) ||
      report.rows.length>5000 ||
      report.status!=='unreviewed-research-leads-not-verified-best-recipes')return;
    worldResearchGapMap=new Map(report.rows.filter(row=>
      typeof row.country==='string' && typeof row.category==='string' &&
      Number.isInteger(row.wikibooksJointTagLeads) &&
      row.wikibooksJointTagLeads>=0 &&
      Number.isInteger(row.wikibooksCountryTagLeads) &&
      row.wikibooksCountryTagLeads>=0
    ).map(row=>[JSON.stringify([row.country,row.category]),row]));
  }catch{ /* Optional research audit can be absent or offline. */ }
  finally{if(view==='world')render();}
}
async function loadWorldOptions() {
  worldLoadingOptions=true;worldOptionsError='';
  void loadWorldGapAudit();
  if(view==='world')render();
  try{
    // Checked-in source metadata has names, provider IDs and remote photo
    // references; full recipes remain fetched on demand from their source.
    let snapshot=null;
    try{
      const response=await fetch('./data/world-catalogue-index.json');
      if(response.ok)snapshot=await response.json();
    }catch{ /* Fall back to live provider catalogue if the file is unavailable. */ }
    if(snapshot){
      try{
        const restored=hydrateCatalogueIndex(snapshot);
        worldIndex=restored;worldMeals=restored.meals;
        worldOverlapIndex=recipeTitleIndex(restored);
        worldScan={completed:26,total:26};
        worldPartial=Array.isArray(snapshot.failedInitials)?snapshot.failedInitials:[];
        worldScannedAt=String(snapshot.scannedAt||'');
        worldAreas=restored.countries.flatMap(c=>c.areas.map(area=>({strCountry:c.country,strArea:area})));
        worldCategories=restored.categories;
        // The saved index is ready now: initialise actual selectors before
        // rendering. Do not wait for the optional live-directory refresh.
        if(!restored.countries.some(c=>c.country===worldCountry))
          worldCountry=restored.countries[0]?.country||'';
        if(!worldCategories.includes(worldCategory))
          worldCategory=worldCategories.includes('Dessert')?'Dessert':worldCategories[0]||'';
        if(view==='world')render();
      }catch{ /* Unsupported snapshot: do not show unverified data. */ }
    }
    try{
      const [areas,providerCategories]=await Promise.all([availableAreaRecords(),availableCategories()]);
      if(countryDirectory(areas).length && providerCategories.length){
        worldAreas=areas;worldCategories=providerCategories;
      }
    }catch{
      if(!worldAreas.length || !worldCategories.length)
        worldOptionsError='The recipe source directory could not load.';
    }
    const countries=countryDirectory(worldAreas);
    if(!countries.some(c=>c.country===worldCountry))worldCountry=countries[0]?.country||'';
    if(!worldCategories.includes(worldCategory))
      worldCategory=worldCategories.includes('Dessert')?'Dessert':worldCategories[0]||'';
  }catch(error){worldOptionsError=error.message||'Country directory could not load.';}
  finally{worldLoadingOptions=false;if(view==='world')render();}
}
function sourceMediaPanel(){
  if(!worldResearchReviewId)return '';
  const source=worldResearchEntries.find(x=>x.id===worldResearchReviewId);
  if(!source)return '';
  const media=worldMedia.sourceId===source.id?worldMedia:
    {titles:[],selected:null,loading:false,error:''};
  const selected=media.selected;
  const fileDetails=selected ?
    '<div class="source-media-details"><h4>Selected file — unverified rights</h4>'+
    '<p><a href="'+escapeHtml(selected.filePage)+'" target="_blank" rel="noopener noreferrer">Open original file-description page ↗</a></p>'+
    '<p>Licence label: <strong>'+escapeHtml(selected.license||'Not reported')+'</strong></p>'+
    '<p>Artist information (as supplied): '+escapeHtml(selected.artist||'Not reported')+'</p>'+
    '<p>Credit information (as supplied): '+escapeHtml(selected.credit||'Not reported')+'</p>'+
    (selected.licenseUrl?'<p><a target="_blank" rel="noopener noreferrer" href="'+escapeHtml(selected.licenseUrl)+'">Inspect claimed licence ↗</a></p>':'<p>No verified licence link returned.</p>')+
    '<p>Attribution requirement flag: '+escapeHtml(selected.attributionRequired)+'</p>'+
    '<p>'+(!selected.foundOnCommons ?
      'This file was not found on Commons; it may be stored locally at Wikibooks. Check the original file description manually.' :
      'Machine-readable information may be missing, stale or incomplete. Inspect the file page before recording rights.')+
    '</p></div>' : '';
  return '<section id="source-media-panel" class="source-media-panel" aria-label="Original-source photograph research">'+
    '<div><h4>Inspect original Wikibooks file references</h4>'+
    '<p class="panel-note">Requests happen only when you choose Inspect. Filenames and licensing metadata are clues, not permission to reuse media.</p></div>'+
    '<button type="button" class="btn secondary small" data-action="world-media-inspect"'+
      (media.loading?' disabled':'')+'>Inspect linked source media ↗</button>'+
    (media.loading?'<p role="status" class="panel-note">Checking Wikimedia file metadata…</p>':'')+
    (media.error?'<p class="world-warning" role="alert">'+escapeHtml(media.error)+'</p>':'')+
    (media.titles.length ? '<div class="source-media-list" aria-label="Referenced files">'+
      media.titles.map(title=>'<button type="button" class="btn ghost small" data-action="world-media-file" data-title="'+escapeHtml(title)+'">'+escapeHtml(title)+'</button>').join('')+
      '</div>' : (!media.loading && !media.error && worldMedia.sourceId===source.id?
        '<p class="panel-note">No file references were returned. A photograph is not automatically available.</p>' : ''))+
    fileDetails+
    '<p class="panel-note"><strong>Reuse remains unapproved.</strong> Record the creator, file page, licence and attribution above only after independent checking.</p>'+
    '</section>';
}
function redrawSourceMediaPanel(){
  const existing=document.querySelector('#source-media-panel');
  if(existing)existing.outerHTML=sourceMediaPanel();
}
async function loadWorldResearch() {
  if(worldResearchLoading)return;
  worldResearchOpen=true;worldResearchLoading=true;worldResearchError='';
  if(view==='world')render();
  try{
    const res=await fetch('./data/wikibooks-research-queue.json');
    if(!res.ok)throw new Error('Research list unavailable.');
    const data=await res.json();
    if(!Array.isArray(data.recipes)||data.recipes.length>6000)
      throw new Error('Unexpected source data.');
    worldResearchEntries=data.recipes.filter(item=>{
      if(typeof item?.title!=='string'||item.title.length>180)return false;
      try{const u=new URL(item.url);return u.protocol==='https:'&&u.hostname==='en.wikibooks.org';}
      catch{return false;}
    });
    // Research-only hints from Wikibooks' own page-category membership.
    // Missing evidence never prevents browsing its source link.
    try{
      const response=await fetch('./data/wikibooks-category-evidence.json');
      if(response.ok){
        const evidence=await response.json();
        if(Array.isArray(evidence.recipes)&&evidence.recipes.length<=6000){
          worldResearchEvidence=new Map(evidence.recipes.filter(x=>
            Number.isSafeInteger(x.sourcePageId) && Array.isArray(x.categoryLabels))
            .map(x=>[x.sourcePageId,x.categoryLabels.filter(t=>
              typeof t==='string'&&t.length<=200).slice(0,20)]));
        }
      }
    }catch{ /* Source-category labels are optional research hints. */ }
  }catch(error){worldResearchError=error.message||'Could not read the research queue.';}
  finally{worldResearchLoading=false;if(view==='world')render();}
}
async function collectWorldRecipes() {
  if(worldScanning || !worldAreas.length || !worldCategories.length) return;
  // Keep the last successful sourced index visible if the user cancels or
  // the provider has an outage during a refresh.
  worldScanning=true;worldOptionsError='';
  worldScanProgress={completed:0,total:26,recipes:0,failed:0};
  worldScanController=new AbortController();
  render();
  try {
    const report=await scanWorldRecipes({
      signal:worldScanController.signal,
      onProgress:progress=>{worldScanProgress=progress;if(view==='world')render();}
    });
    if (!report.meals.length) throw new Error('No source recipes were returned.');
    if (report.failedLetters.length && worldIndex) {
      worldPartial=report.failedLetters;
      worldOptionsError='Some source initials could not load. Showing the previous catalogue instead.';
      return;
    }
    worldPartial=report.failedLetters;
    worldScan=report;
    worldMeals=report.meals;
    worldIndex=catalogueFromProvider(report.meals,worldAreas,worldCategories);
    worldOverlapIndex=recipeTitleIndex(worldIndex);
    worldScannedAt=new Date().toISOString();
  } catch(error) {
    if(error?.name!=='AbortError') {
      worldOptionsError='Could not refresh the provider catalogue. Previous sourced results have been retained.';
    }
  } finally {
    worldScanning=false;worldScanController=null;
    if(view==='world')render();
  }
}
function downloadWorldIndex(){
  if(!worldIndex)return;
  const meta=exportCatalogueIndex(worldIndex);
  meta.countries=countryDirectory(worldAreas);
  meta.categories=[...worldCategories];
  meta.failedInitials=[...worldPartial];
  meta.scanComplete=worldScan?.completed===worldScan?.total && !worldPartial.length;
  const blob=new Blob([JSON.stringify(meta,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='tasteit-world-catalogue-coverage.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}


async function discover(mode='featured', value='', {history=true}={}) {
  const thisRequest=++requestNumber;
  controller?.abort();
  const currentController=new AbortController();
  controller=currentController;
  const signal=currentController.signal;
  closeDialog({history:false});
  view='discover';
  if(mode==='featured' || mode==='pantry') {
    discoveryChoice=discoveryOptions({scope:discoveryChoice.scope});
    searchTerm='';area='All';category='All';browseLetter='';
  } else if(mode==='search'){searchTerm=String(value).trim().slice(0,100);discoveryChoice={...discoveryChoice,page:1};}
  else if(mode==='filters') {
    discoveryChoice=discoveryOptions({...currentRoute(),...value,page:1});
    const next=normaliseFilters({...currentRoute(),...value});
    searchTerm=next.query;area=next.area||'All';category=next.category||'All';browseLetter=next.letter;
  }
  if(mode!=='restore')discoveryMode=mode==='pantry'?'pantry':'browse';
  if(mode!=='restore') {filterDraft=null;queryDraft=null;}
  loading=true;problem='';serviceWarning='';
  if(history)writeRoute();
  render();
  try {
    let meals,warning='';
    if(globalThis.navigator?.onLine===false) {
      const available=offlineRecipes(store.saved,{});
      meals=discoveryMode==='pantry'?available:discoveryChoice.scope==='provider'?offlineRecipes(store.saved,normaliseFilters(currentRoute())):searchRecipeCollection([],Object.fromEntries(available.map(m=>[m.idMeal,{...store.saved[m.idMeal],meal:m}])),currentRoute());
      if(discoveryMode==='pantry')meals=rankByKitchen(meals,store.pantry);
      warning='You are offline. Showing recipe details saved in this browser. Photos and new source recipes need a connection.';
    } else if(discoveryMode==='pantry') {
      kitchenSelection=reconcileKitchenSelection(store.pantry,kitchenSelection);
      if(!kitchenSelection.length)kitchenSelection=initialKitchenSelection(store.pantry);
      const picked=searchPantryRows(store.pantry,kitchenSelection);
      const local=localKitchenRecipes(store.saved,store.pantry);
      let remote=[];
      try {
        const report=await pantryCandidateReport(picked,signal);
        remote=report.meals;
        if(report.partial)warning='Some recipe searches could not finish. These suggestions may be incomplete.';
      } catch(error) {
        if(signal.aborted || error?.name==='AbortError')throw error;
        if(!local.length)throw error;
        warning='The recipe service is unavailable. Showing matching recipes saved on this device.';
      }
      meals=rankByKitchen(combineKitchenRecipes(remote,local),store.pantry);
    } else if(discoveryChoice.scope!=='provider') {
      let available=[];
      if(discoveryChoice.scope!=='saved') {
        try {available=await collectionLoader.load();}
        catch {warning='The collected recipe catalogue is unavailable. Showing matching recipes saved in this browser. Retry to reconnect.';}
      }
      if(thisRequest!==requestNumber||signal.aborted)return;
      collectionRecords=available;
      meals=searchRecipeCollection(available,store.saved,currentRoute());
      cuisines=recipeCuisineOptions(providerCuisines,collectionRecords,store.saved);
    } else {
      const report=await discoverMeals(normaliseFilters(currentRoute()),signal);
      meals=report.meals;
      if(report.partial)warning='Some recipe searches could not finish. These results may be incomplete.';
    }
    if(thisRequest!==requestNumber || signal.aborted)return;
    activeMeals=meals;serviceWarning=warning;
    if(discoveryMode==='pantry')kitchenDirty=false;
  } catch(error) {
    if(thisRequest!==requestNumber || signal.aborted || error?.name==='AbortError')return;
    activeMeals=[];
    problem='The recipe service could not be reached. Check your connection and try again. Your saved recipes are still in My recipes.';
  } finally {
    if(thisRequest===requestNumber) {loading=false;render({preserveDialog:true});restoreResultFocus();}
  }
}

function photo(meal) {
  const url = externalUrl(meal?.strMealThumb, !collectedRecipe(meal));
  return url ? '<img data-recipe-photo src="' + url + '" alt="' + escapeHtml(meal.strMeal) + '" loading="lazy" referrerpolicy="no-referrer">' : '<div class="card-picture-fallback" aria-hidden="true">🍲</div>';
}
function card(meal, kitchenExplanation = false, personalReasons = null) {
  const id = escapeHtml(meal.idMeal);
  const entry = savedEntry(meal.idMeal);
  const analysis = ingredientsOf(meal).length && store.pantry.length ? analyseMeal(meal, store.pantry) : null;
  const useSoon = analysis && recipeUseSoon(meal,store.pantry);
  // Summary endpoints omit labels; an explicit source filter still supplies context.
  const browsing=view==='discover' && discoveryMode!=='pantry';
  const region = meal.strArea || (browsing && area!=='All'?area:'World kitchen');
  const mealCategory = meal.strCategory || (browsing && category!=='All'?category:'Recipe');
  const isSaved = Boolean(entry.wanted);
  const isPersonal = Boolean(meal.strPersonal);
  const kitchenInfo = kitchenExplanation ? kitchenMatchDetails(meal,store.pantry) : null;
  const reason = kitchenInfo ? '<div class="kitchen-match-reason"><strong>' + escapeHtml(kitchenInfo.explanation) + '</strong>' +
    (kitchenInfo.missing.length ? '<span>Missing: ' + escapeHtml(kitchenInfo.missing.slice(0,3).join(', ')) +
      (kitchenInfo.missing.length > 3 ? ' +' + (kitchenInfo.missing.length-3) + ' more' : '') + '</span>' :
      kitchenInfo.needReview.length ? '<span>Check amounts: ' + escapeHtml(kitchenInfo.needReview.slice(0,2).join(', ')) + '</span>' :
      '<span>Check amounts, freshness and dietary suitability before cooking.</span>') + '</div>' : '';
  return '<article class="recipe-card" data-recipe-id="'+id+'"'+(personalReasons?' data-personal-recipe':'')+'>' +
    '<button type="button" class="recipe-photo" data-action="open" data-id="' + id + '" aria-label="View recipe for ' + escapeHtml(meal.strMeal) + '">' +
    photo(meal) + (analysis ? '<span class="mini-pill">' + (useSoon.length ? 'Use soon: ' + escapeHtml(useSoon.slice(0,2).join(', ')) : analysis.isQuantityConfirmed ? 'Amounts confirmed*' : analysis.percent + '% names on hand*') + '</span>' : '<span class="mini-pill">' + escapeHtml(region) + '</span>') + '</button>' +
    '<div class="recipe-body"><button type="button" class="recipe-title" data-action="open" data-id="' + id + '">' + escapeHtml(meal.strMeal) + '</button>' +
    '<div class="recipe-meta"><span>' + escapeHtml(region) + '</span><span>·</span><span>' + escapeHtml(mealCategory) + '</span></div>' +
    reason + recipeRatingMarkup(collectedRecipe(meal)) + '<div class="card-bottom"><span class="source-line">' + (isPersonal ? 'YOUR RECIPE' : collectedRecipe(meal) ? escapeHtml(SOURCES.find(s=>s.id===meal.selectedRecipe.source)?.name||'Original publisher') : 'PHOTO · THEMEALDB') + '</span>' +
    '<button type="button" class="quick-save' + (isSaved ? ' saved' : '') + '" data-action="wanted" data-id="' + id + '" aria-pressed="' + isSaved + '">' + (isSaved ? '✓ Want to try' : '+ Want to try') + '</button></div></div>' +
    (personalReasons?'<div class="personal-reasons"><span class="eyebrow">WHY THIS DISH</span><ul>'+personalReasons.map(reason=>'<li>'+escapeHtml(reason)+'</li>').join('')+'</ul><button type="button" class="btn ghost small" data-action="taste-hide" data-id="'+id+'" aria-label="Not for me: '+escapeHtml(meal.strMeal)+'">Not for me</button></div>':'')+'</article>';
}
function cards(meals, kitchenExplanation = false) {
  return '<div class="recipe-grid">' + meals.map(meal => card(meal,kitchenExplanation)).join('') + '</div>';
}
function empty(icon, title, message, action = '') {
  return '<div class="empty"><div class="empty-icon" aria-hidden="true">' + icon + '</div><h3>' + escapeHtml(title) +
    '</h3><p>' + escapeHtml(message) + '</p>' + action + '</div>';
}
function loadingBox() {
  return '<div class="loading-screen" role="status"><span class="spinner"></span>Gathering good things to cook...</div>';
}

function tastePreferences() {
  const profile=store.tasteProfile||emptyTasteProfile();
  const fields=tasteDraft||{cuisines:profile.cuisines.join(', '),avoidIngredients:profile.avoidIngredients.join(', ')};
  const tags=collectionTags(store.saved).slice(0,6);
  return '<section class="panel taste-panel" aria-label="Personalise your discovery"><details id="taste-preferences"'+(tastePanelOpen?' open':'')+'><summary id="taste-summary">Your taste <span>Make suggestions yours</span></summary>'+
    '<p class="panel-note">Your choices shape suggestions and stay local unless you enable cloud sync. Search still shows the full source selection. Taste preferences are not allergy filters.</p>'+
    '<form id="taste-form" class="taste-form"><div class="field"><label for="taste-cuisines">Cuisines you enjoy</label><input id="taste-cuisines" name="cuisines" maxlength="650" value="'+escapeHtml(fields.cuisines)+'" placeholder="Indian, Turkish, Italian"><p class="panel-note">Up to 8, separated by commas.</p></div>'+
    '<div class="field"><label for="taste-avoid">Ingredients you would rather skip</label><textarea id="taste-avoid" name="avoidIngredients" maxlength="1650" rows="2" placeholder="e.g. aubergine, olives">'+escapeHtml(fields.avoidIngredients)+'</textarea><p class="panel-note">Up to 20 names, separated by commas. Check each recipe yourself.</p></div>'+
    '<div class="dialog-actions"><button id="taste-save" type="submit" class="btn small">Save my taste</button>'+
    (profile.hiddenRecipeIds.length?'<button id="taste-show-skipped" type="button" class="btn secondary small" data-action="taste-show-hidden">Show skipped recipes ('+profile.hiddenRecipeIds.length+')</button>':'')+'</div></form></details>'+
    (tags.length?'<div class="taste-collections" aria-label="Your curated collections"><span class="panel-note">Curated by you</span>'+tags.map(tag=>'<button type="button" class="chip" data-action="taste-collection" data-tag="'+escapeHtml(tag.name)+'">'+escapeHtml(tag.name)+' · '+tag.count+'</button>').join('')+'</div>':'')+'</section>';
}
function personalSuggestions(rows) {
  const profile=store.tasteProfile||emptyTasteProfile();
  if(!rows.length)return '<section class="personal-empty" aria-label="Personal recipe suggestions"><h2 id="personal-suggestions-title" tabindex="-1">Make your next meal yours.</h2><p class="panel-note">Save a dish, add ingredients to your kitchen or choose cuisines in Your taste to get suggestions. Skipped ingredients and recipes can limit this selection.</p>'+
    (profile.hiddenRecipeIds.length?'<button type="button" class="btn secondary small" data-action="taste-show-hidden">Show skipped recipes ('+profile.hiddenRecipeIds.length+')</button>':'')+'</section>';
  return '<section id="for-your-table" class="section" aria-labelledby="personal-suggestions-title"><div class="section-head"><div><div class="eyebrow">INSPIRED BY YOUR KITCHEN</div><h2 id="personal-suggestions-title" tabindex="-1">For your table</h2><p>Suggestions from this selection and your cookbook, with the reasons shown. Check quantities and each original recipe before cooking.</p></div></div><div class="recipe-grid">'+rows.map(row=>card(row.meal,false,row.reasons)).join('')+'</div></section>';
}

function homeCollections() {
  return [['usual','My usual dishes','The dishes you come back to.'],['wanted','Want to try','Your next good meal starts here.']].map(([key,title,note])=>{
    const entries=Object.values(store.saved).filter(entry=>entry?.[key]&&entry.meal);
    return '<section class="section home-collection" id="home-'+key+'" aria-labelledby="home-'+key+'-title"><div class="section-head"><div><div class="eyebrow">YOUR COOKBOOK · '+entries.length+' SAVED</div><h2 id="home-'+key+'-title">'+title+'</h2><p>'+note+'</p></div>'+
      (entries.length?'<button type="button" class="btn secondary small" data-action="home-collection" data-tab="'+key+'">View all '+entries.length+' →</button>':'')+'</div>'+
      (entries.length?cards(entries.slice(0,4).map(entry=>entry.meal)):'<p class="panel-note">'+(key==='usual'?'Mark a recipe as My usual dishes to keep it here.':'Save a recipe with Want to try to keep it here.')+' <a href="./selected-recipes.html">Explore your selected websites →</a></p>')+'</section>';
  }).join('');
}

function discoverPage() {
  const spotlight = activeMeals.find(x => externalUrl(x.strMealThumb,!collectedRecipe(x)));
  const heroPhoto = spotlight ? photo(spotlight) : '<div class="hero-placeholder" aria-hidden="true">🍝</div>';
  const label = discoveryMode==='pantry'?'Ideas from your kitchen':category!=='All'?category+' recipes':area!=='All'?area+' recipes':searchTerm?'Search results':browseLetter?'Recipes beginning with '+browseLetter:'Discover something delicious';
  const title = discoveryMode === 'pantry' ? 'Cook with what you <strong>have.</strong>' : 'Find your next <strong>favourite.</strong>';
  const countSaved = Object.values(store.saved).filter(flags).length;
  const filters=normaliseFilters(currentRoute());
  const draft=filterDraft || currentRoute();
  const applied=filterSummary(filters);
  const showPersonal=!applied.length&&!discoveryChoice.course&&!discoveryChoice.source&&!discoveryChoice.ratedOnly&&discoveryMode!=='pantry'&&discoveryChoice.page===1;
  const recommendations=showPersonal?recommendRecipes(loading?[]:activeMeals,store.saved,store.pantry,store.tasteProfile||emptyTasteProfile()):[];
  personalRecipeCards=new Map(recommendations.map(row=>[row.meal.idMeal,row.meal]));
  const recommendedIds=new Set(recommendations.map(row=>row.meal.idMeal));
  const option=(value,label,selected)=>'<option value="'+escapeHtml(value)+'"'+(selected?' selected':'')+'>'+escapeHtml(label)+'</option>';
  const categoryOptions=[...new Set([...categories.filter(c=>c!=='All'),...(draft.category?[draft.category]:[])])];
  const provider=draft.scope==='provider';
  const filterControls=discoveryMode==='pantry'?'':'<details id="discovery-filter-panel" class="discovery-filter-panel"'+(filtersOpen?' open':'')+'><summary>Filter &amp; sort <span>'+escapeHtml(discoveryChoice.scope==='provider'?'TheMealDB':discoveryChoice.scope==='saved'?'Saved recipes':'Your collection')+'</span></summary><form id="discovery-filters" class="discovery-filters" aria-label="Filter recipes">'+
    '<div class="field"><label for="discover-scope">Search in</label><select id="discover-scope" name="scope">'+[['collection','Collection + my cookbook'],['saved','My saved recipes'],['provider','TheMealDB · additional source']].map(([v,l])=>option(v,l,draft.scope===v)).join('')+'</select></div>'+
    '<div class="field"><label for="discover-cuisine">Cuisine</label><input id="discover-cuisine" name="area" type="search" autocomplete="off" list="cuisine-options" maxlength="80" placeholder="All cuisines · type to find" value="'+escapeHtml(draft.area)+'"><datalist id="cuisine-options">'+cuisines.filter(c=>c!=='All').map(c=>option(c,c,false)).join('')+'</datalist></div>'+
    (provider?'<div class="field"><label for="discover-category">Meal type</label><select id="discover-category" name="category">'+option('','All types',!draft.category)+categoryOptions.map(c=>option(c,c,c===draft.category)).join('')+'</select></div><div class="field"><label for="discover-letter">Starts with</label><select id="discover-letter" name="letter">'+option('','Any letter',!draft.letter)+alphabet.map(l=>option(l,l,l===draft.letter)).join('')+'</select></div>':
    '<div class="field"><label for="discover-course">Meal type</label><select id="discover-course" name="course">'+option('','All meal types',!draft.course)+RECIPE_COURSES.map(c=>option(c.id,c.label,c.id===draft.course)).join('')+'</select></div>'+
    '<div class="field"><label for="discover-source">Publisher</label><select id="discover-source" name="source">'+option('','All selected websites',!draft.source)+SOURCES.map(x=>option(x.id,x.name,x.id===draft.source)).join('')+'</select></div>'+
    '<div class="field"><label for="discover-sort">Sort by</label><select id="discover-sort" name="sort">'+[['title','Name A–Z'],['rating','Publisher rating'],['votes','Votes / reviews']].map(([v,l])=>option(v,l,draft.sort===v)).join('')+'</select></div><label class="discovery-rated"><input type="checkbox" id="discover-rated" name="ratedOnly"'+(draft.ratedOnly?' checked':'')+'> With a publisher rating</label>')+
    '<button type="submit" class="btn">Apply filters</button></form><p class="panel-note">'+(provider?'Additional community recipes from TheMealDB.':'Collected publisher recipes and your cookbook. Publisher scores come from different communities; they are not a Tasteit ranking.')+'</p></details>'+
    '<div class="discovery-filter-footer"><div class="active-filters" aria-label="Current filters">'+applied.map(f=>'<button class="chip" type="button" data-action="remove-filter" data-filter="'+f.key+'" aria-label="Remove '+escapeHtml(f.label)+'">'+escapeHtml(f.label)+' ×</button>').join('')+
    (discoveryChoice.course?'<button type="button" class="chip" data-action="remove-course">'+escapeHtml(RECIPE_COURSES.find(c=>c.id===discoveryChoice.course)?.label)+' ×</button>':'')+'</div>'+
    (applied.length||discoveryChoice.course||discoveryChoice.source||discoveryChoice.ratedOnly?'<button type="button" class="btn ghost small" data-action="featured">Clear filters</button>':'')+'<button type="button" class="btn secondary small" data-action="surprise">✦ Surprise me</button></div>';
  const kitchenChoices = discoveryMode === 'pantry' ? kitchenIngredientChoices(store.pantry) : [];
  const choicesShown = kitchenShowAll ? kitchenChoices : kitchenChoices.slice(0,24);
  const kitchenPicker = discoveryMode === 'pantry' ? '<section class="kitchen-selector" aria-label="Choose ingredients for recipe discovery">' +
    '<div class="kitchen-selector-head"><div><h3>Choose ingredients to search</h3>' +
    '<p>Search using up to ' + MAX_KITCHEN_SEARCH + ' ingredients. Other pantry items still count when we compare recipes.</p></div>' +
    '<button class="btn secondary small" type="button" data-action="kitchen-reset">Use suggested selection ↺</button></div>' +
    '<div class="kitchen-ingredient-list" role="group" aria-label="Ingredients selected for search">' +
    choicesShown.map(choice => '<button type="button" class="chip' + (kitchenSelection.includes(choice.key) ? ' selected' : '') +
      '" data-action="kitchen-ingredient" data-key="' + escapeHtml(choice.key) +
      '" aria-pressed="' + kitchenSelection.includes(choice.key) + '">' +
      escapeHtml(choice.name) + (choice.batches > 1 ? ' (' + choice.batches + ' batches)' : '') + '</button>').join('') + '</div>' +
    (kitchenChoices.length > 24 ? '<button class="btn ghost small" type="button" data-action="kitchen-more">' +
      (kitchenShowAll ? 'Show fewer ingredients' : 'Show all ' + kitchenChoices.length + ' ingredients') + '</button>' : '') +
    '<div class="kitchen-selector-footer"><span role="status">' + kitchenSelection.length + ' of ' + MAX_KITCHEN_SEARCH + ' selected' +
    (kitchenDirty ? ' · Update suggestions to apply the changes' : '') + '</span>' +
    '<button type="button" class="btn small" data-action="kitchen-update"' +
      (!kitchenSelection.length || loading ? ' disabled' : '') + '>Update recipe ideas →</button></div>' +
    '<p class="panel-note">Recipes come from TheMealDB or your saved cookbook. This is a shortlist, not an exhaustive search. Ingredient names and available amounts may require checking.</p></section>' : '';
  const resultPage=recipePage(activeMeals,discoveryChoice.page);
  if(discoveryMode!=='pantry'&&!loading&&discoveryChoice.page!==resultPage.page){discoveryChoice={...discoveryChoice,page:resultPage.page};writeRoute({replace:true});}
  const visibleMeals = discoveryMode === 'pantry'
    ? filterKitchenRecipes(activeMeals,store.pantry,kitchenReadiness) : resultPage.records.filter(meal=>!recommendedIds.has(meal.idMeal));
  const kitchenReadinessChips = discoveryMode === 'pantry'
    ? '<div class="kitchen-readiness" role="group" aria-label="Filter recipes by kitchen ingredient availability">' +
      [['all','All ideas'],['names','All ingredient names on hand'],['amounts','Measured amounts appear sufficient']].map(([key,label]) =>
        '<button type="button" class="chip' + (kitchenReadiness === key ? ' selected' : '') +
        '" data-action="kitchen-readiness" data-readiness="' + key + '" aria-pressed="' +
        (kitchenReadiness === key) + '">' + label + '</button>').join('') +
      '<p class="panel-note" role="status">Showing ' + visibleMeals.length + ' of ' + activeMeals.length +
      ' suggestions. These are inventory estimates, not confirmation of food safety or allergy suitability.</p></div>' : '';
  const pagination=discoveryMode!=='pantry'&&!loading&&resultPage.pages>1?'<nav class="main-pagination" aria-label="Recipe pages"><button class="btn secondary" data-action="discovery-page" data-page="'+(resultPage.page-1)+'"'+(resultPage.page===1?' disabled':'')+'>← Previous</button><span role="status" id="discovery-page-status" tabindex="-1">Page '+resultPage.page+' of '+resultPage.pages+' · '+resultPage.start+'–'+resultPage.end+' of '+resultPage.total+'</span><button class="btn secondary" data-action="discovery-page" data-page="'+(resultPage.page+1)+'"'+(resultPage.page===resultPage.pages?' disabled':'')+'>Next →</button></nav>':'';
  const currentResults = loading ? loadingBox() : problem ? '<div class="alert">' + escapeHtml(problem) + '<button class="btn small" type="button" data-action="retry">Try again</button></div>' :
    visibleMeals.length ? cards(visibleMeals, discoveryMode === 'pantry') : recommendations.length?'<p class="panel-note">This selection is on your table above. Explore a cuisine or search for another dish.</p>':
    (discoveryMode === 'pantry' && activeMeals.length ? empty('🥕', 'Nothing meets that match filter', 'Try All ideas, or add the missing ingredients to your kitchen.', '<button class="btn" type="button" data-action="kitchen-readiness" data-readiness="all">Show all ideas</button>') : empty('🔎', serviceWarning ? 'No recipes returned by available sources' : 'No recipes found', 'Try a different dish name, cuisine or kitchen ingredient.', '<button class="btn" type="button" data-action="featured">Explore popular dishes</button>'));
  return '<section class="hero'+(applied.length || discoveryMode==='pantry'?' browsing':'')+'"><div class="hero-copy"><div class="eyebrow">YOUR PERSONAL RECIPE UNIVERSE</div><h1>' + title + '</h1>' +
    '<p class="lead">Discover food from different cultures, collect your favourite meals, and find inspiration in the ingredients you already own.</p>' +
    '<form id="search-form" class="search-bar" role="search"><span class="search-icon" aria-hidden="true">⌕</span><input id="recipe-search" name="query" aria-label="Search recipe names" maxlength="100" placeholder="Search a recipe or ingredient…" value="' + escapeHtml(queryDraft ?? searchTerm) + '"><button class="btn" type="submit">Find recipes ↗</button></form>' +
    '</div><div class="hero-visual">' + heroPhoto + (spotlight ? '<div class="photo-tag"><span class="spark">✳ ON THE MENU</span><b>' + escapeHtml(spotlight.strMeal) + '</b><span>Photograph: '+escapeHtml(collectedRecipe(spotlight)?SOURCES.find(s=>s.id===spotlight.selectedRecipe.source)?.name:'TheMealDB contributors')+'</span></div>' : '') + '</div></section>' +
    (showPersonal?'<nav class="meal-shortcuts" aria-label="Explore meal types">'+[['breakfast','Breakfast'],['main','Main dishes'],['dessert','Sweets'],['appetiser','Snacks']].map(([id,label])=>'<button class="chip" data-action="meal-shortcut" data-course="'+id+'">'+label+'</button>').join('')+'</nav>':'')+
    '<div class="feature-strip">' +
    '<button type="button" class="feature-card" data-nav="pantry"><span class="feature-icon" aria-hidden="true">🥕</span><div><b>My kitchen</b><span>' + store.pantry.length + ' ingredients in stock</span></div></button>' +
    '<button type="button" class="feature-card" data-nav="library"><span class="feature-icon" aria-hidden="true">♡</span><div><b>My cookbook</b><span>' + countSaved + ' saved or cooked recipes</span></div></button>' +
    '<button type="button" class="feature-card" data-action="suggest"><span class="feature-icon" aria-hidden="true">✦</span><div><b>What can I make?</b><span>Find recipes using my ingredients</span></div></button></div>' +
    (showPersonal?homeCollections()+tastePreferences()+personalSuggestions(recommendations):'') +
    '<section class="section"><div class="section-head"><div><div class="eyebrow">DISCOVER</div><h2 id="discovery-results-title" tabindex="-1">' + escapeHtml(label) + '</h2><p>' + (discoveryMode === 'pantry' ? 'Sorted by ingredient-name overlap; exact amounts are checked where measurements are clear.' : discoveryChoice.scope==='provider'?'Additional recipes from TheMealDB.':'Your selected recipe websites and personal cookbook, together.') + '</p></div>' +
    '<span class="source-line">' + (loading ? 'LOADING' : activeMeals.length + ' RECIPES') + '</span></div>' +
    filterControls + kitchenPicker + kitchenReadinessChips + (discoveryMode === 'pantry' ? '<p class="note" style="margin-bottom:22px">* Match percentages compare names only. Amount checks use compatible units and exclude expired entries. Food safety, allergies and substitutions are not verified.</p>' : '') +
    (serviceWarning ? '<div class="note service-warning" role="status">' + escapeHtml(serviceWarning) + '<button class="btn secondary small" type="button" data-action="retry">Try again</button></div>' : '') + currentResults + pagination + '</section>';
}

function personalRecipeForm() {
  if (!showRecipeForm) return '';
  const meal = editingRecipeId ? store.saved[editingRecipeId]?.meal : null;
  const ingredientRows = meal ? ingredientsOf(meal).map(x => x.name + (x.measure ? ' | ' + x.measure : '')).join('\n') : '';
  return '<section class="panel" style="margin-bottom:24px" aria-label="Personal recipe editor">' +
    '<div class="section-head"><div><h3>' + (meal ? 'Edit your recipe' : 'Add your own recipe') + '</h3><p>Preserve your everyday dishes and the way you actually cook them.</p></div>' +
    '<button type="button" class="btn ghost small" data-action="cancel-recipe">Close ×</button></div>' +
    '<form id="personal-recipe-form" class="personal-recipe-form">' +
    '<div class="field"><label for="personal-title">Recipe name *</label><input id="personal-title" name="title" required maxlength="120" placeholder="e.g. Mum’s chicken curry" value="' + escapeHtml(meal?.strMeal || '') + '"></div>' +
    '<div class="field"><label for="personal-origin">Cuisine or region</label><input id="personal-origin" name="origin" maxlength="80" placeholder="e.g. Bangladeshi" value="' + escapeHtml(meal?.strArea || '') + '"></div>' +
    '<div class="field wide"><label for="personal-source">Original publisher link (optional)</label><input id="personal-source" name="source" type="url" maxlength="500" placeholder="https://example.com/original-recipe" value="' + escapeHtml(meal?.strSource || '') + '"><p class="panel-note">Save a source or inspiration link. Write your cooking steps in your own words; third-party photographs will not be copied.</p></div>' +
    '<div class="field"><label for="personal-base-servings">Original servings (optional)</label><input id="personal-base-servings" name="baseServings" type="number" min="1" max="24" step="1" placeholder="Unknown" value="' + escapeHtml(validServings(store.saved[editingRecipeId]?.baseServings) || '') + '"></div>' +
    '<div class="field wide"><label for="personal-ingredients">Ingredients * (one per line, optional amount after |)</label>' +
    '<textarea name="ingredients" id="personal-ingredients" required rows="7" placeholder="Rice | 2 cups&#10;Chicken | 500 g&#10;Onion | 2">' + escapeHtml(ingredientRows) + '</textarea></div>' +
    '<div class="field wide"><label for="personal-instructions">Cooking instructions *</label><textarea name="instructions" id="personal-instructions" required rows="7" maxlength="15000" placeholder="Describe the cooking steps in your own words...">' + escapeHtml(meal?.strInstructions || '') + '</textarea></div>' +
    '<div class="field wide"><p class="panel-note">Your own recipes stay local unless you enable cloud sync. Personal photo storage will come later; third-party photographs are not copied without permission.</p></div>' +
    '<div class="field wide"><button class="btn" type="submit">' + (meal ? 'Save recipe changes' : '+ Add to my usual dishes') + '</button></div></form></section>';
}
function cloudControls() {
  const labels={off:'Cloud sync is off',pending:'Changes waiting to sync',checking:'Checking the cloud copy…',synced:'Synced',offline:'Offline — changes saved here',conflict:'Review your two copies','account-changed':'Account changed','signed-out':'Sign in to resume sync',error:'Sync needs attention'};
  const button=(action,label,disabled=false)=>'<button id="'+action+'" type="button" class="btn secondary small" data-action="'+action+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
  const summary=copy=>copy?copy.recipes+' recipes · '+copy.batches+' kitchen batches · '+copy.planned+' planned days · '+copy.leftovers+' leftover records':'Cloud copy removed';
  const conflict=syncState.status==='conflict'?'<div class="sync-conflict"><h4>Choose the copy to keep</h4><p class="panel-note">This replaces one complete copy. It does not merge individual records.</p><p><strong>This browser:</strong> '+summary(syncState.local)+'</p><p><strong>Cloud:</strong> '+summary(syncState.remote)+'</p>'+
    (syncState.updatedAt?'<p class="panel-note">Cloud updated '+escapeHtml(new Date(syncState.updatedAt).toLocaleString())+'</p>':'')+'<div class="dialog-actions">'+button('sync-keep-local','Use this browser’s copy')+(syncState.remote?button('sync-keep-cloud','Use the cloud copy'):'')+'</div></div>':'';
  return '<p id="cloud-status" role="status" aria-live="polite"><strong>'+escapeHtml(labels[syncState.status]||labels.off)+'</strong></p>'+
    (syncState.message?'<p class="panel-note">'+escapeHtml(syncState.message)+'</p>':'')+conflict+'<div class="dialog-actions">'+
    (syncState.enabled?button('sync-now','Sync now',syncState.status==='checking')+button('sync-off','Turn sync off')+button('sync-remove','Remove cloud copy',syncState.status==='checking'):button('sync-enable','Enable cloud sync'))+'</div>';
}
function continuityPanel() {
  const offlineLabels={ready:'Ready offline',preparing:'Preparing offline access…',update:'An app update is ready',unsupported:'Offline caching is not supported in this browser',unavailable:'Offline preparation could not finish — reconnect and reload'};
  return '<section class="panel continuity-panel" aria-label="Offline access and cloud sync"><h3>Your kitchen, wherever you cook</h3><p id="offline-status" class="panel-note">'+escapeHtml(offlineLabels[offlineState.status]||offlineLabels.preparing)+'</p>'+
    '<p class="panel-note">Saved recipe details, your kitchen and local edits work offline after preparation. Photos and new recipes need a connection. You can add Tasteit to your home screen through your browser menu.</p>'+
    '<h4>Optional cloud sync</h4><p class="panel-note">Enable to sync your cookbook, pantry, shopping list, meal plans, cooking journal and timers, leftovers, research notes and taste preferences with your private signed-in account. It works while Tasteit is open. Off keeps this browser’s data local; removing the cloud copy keeps this browser’s records.</p><div id="cloud-controls">'+cloudControls()+'</div></section>';
}
function updateConnectionUI() {
  const root=document.getElementById('cloud-controls'),focused=document.activeElement?.id;
  if(root){const markup=cloudControls();if(root.innerHTML!==markup)root.innerHTML=markup;if(focused?.startsWith('sync-'))document.getElementById(focused)?.focus({preventScroll:true});}
  const offline=document.getElementById('offline-status');
  if(offline)offline.textContent=offlineState.status==='ready'?'Ready offline':offlineState.status==='update'?'An app update is ready':offlineState.status==='preparing'?'Preparing offline access…':'Offline caching is unavailable in this browser.';
  const bar=document.getElementById('connection-status');if(!bar)return;
  const disconnected=globalThis.navigator?.onLine===false;
  bar.hidden=!disconnected&&offlineState.status!=='update';
  bar.innerHTML=(disconnected?'You are offline. Saved recipes and local changes are available.':'An updated Tasteit is ready.')+
    (offlineState.status==='update'?'<button type="button" class="btn secondary small" data-action="offline-update">Reload to update</button>':'');
}
function libraryPage() {
  const all = filterCookbook(store.saved);
  const tags = collectionTags(store.saved);
  const list = filterCookbook(store.saved,{collection:libraryTab,tag:libraryTag,query:librarySearch,sort:librarySort});
  const choices = [{key:'all',name:'All recipes'},{key:'wanted',name:'Want to try'},{key:'usual',name:'My usual dishes'},{key:'favourite',name:'Favourites'},{key:'cooked',name:'Cooked before'}];
  return '<div class="page-top"><div class="eyebrow">CURATED BY YOU</div><h1>My personal <em>cookbook.</em></h1><p class="lead">Keep your usual dishes, cooking history and want-to-try recipes easy to find.</p></div>' +
    '<div class="section-head"><div><h3>Your collection</h3><p>' + all.length + ' saved or cooked dishes</p></div><button class="btn" type="button" data-action="new-recipe">+ Add my recipe</button></div>' +
    personalRecipeForm() +
    '<div class="tabs" aria-label="Recipe collections">' + choices.map(x => '<button type="button" class="chip' + (libraryTab === x.key ? ' selected' : '') + '" data-action="collection" data-value="' + x.key + '" aria-pressed="' + (libraryTab === x.key) + '">' + x.name + '</button>').join('') + '</div>' +
    '<div class="cookbook-toolbar"><form id="cookbook-search-form" class="cookbook-search" role="search">' +
    '<label for="cookbook-query">Search my recipes</label><div class="cookbook-search-row"><input id="cookbook-query" name="query" maxlength="100" value="' + escapeHtml(librarySearch) + '" placeholder="Dish, country, or my label..." aria-label="Search my cookbook"><button type="submit" class="btn small">Search</button></div></form>' +
    '<div class="field"><label for="cookbook-sort">Sort recipes</label><select id="cookbook-sort" data-library-sort aria-label="Sort my cookbook">' +
    [['name','Name A–Z'],['recent','Last cooked'],['most-cooked','Most cooked']].map(([value,label]) => '<option value="' + value + '"' + (value === librarySort ? ' selected' : '') + '>' + label + '</option>').join('') +
    '</select></div></div>' +
    (tags.length ? '<div class="cookbook-tag-filters" aria-label="Filter by your labels"><span class="panel-note">My labels:</span>' +
      '<button type="button" class="chip' + (!libraryTag ? ' selected' : '') + '" data-action="tag-filter" data-tag="" aria-pressed="' + !libraryTag + '">All labels</button>' +
      tags.map(tag => '<button type="button" class="chip' + (libraryTag.toLocaleLowerCase() === tag.name.toLocaleLowerCase() ? ' selected' : '') +
      '" data-action="tag-filter" data-tag="' + escapeHtml(tag.name) + '" aria-pressed="' + (libraryTag.toLocaleLowerCase() === tag.name.toLocaleLowerCase()) +
      '">' + escapeHtml(tag.name) + ' · ' + tag.count + '</button>').join('') + '</div>' : '') +
    '<div class="section-head"><p class="panel-note" role="status">' + list.length + ' matching recipes</p>' +
    ((librarySearch || libraryTag) ? '<button class="btn ghost small" type="button" data-action="clear-library-filters">Clear filters</button>' : '') + '</div>' +
    (list.length ? cards(list.map(x => x.meal)) :
      empty('📖', 'Nothing matching yet', all.length ? 'Try a different search, collection or label.' : 'Discover a recipe or add your own everyday dish.', '<button class="btn" type="button" data-action="clear-library-filters">Show all saved recipes</button>')) +
    continuityPanel()+'<section class="panel" style="margin-top:28px"><div class="section-head"><div><h3>Your data, your choice</h3><p>Keep a backup of your recipes, labels, cooking history, pantry and meal plans.</p></div></div>' +
    '<div class="dialog-actions"><button type="button" class="btn secondary small" data-action="export-data">↓ Export backup</button>' +
    '<label class="btn secondary small" for="backup-file">↑ Import backup</label><input type="file" id="backup-file" accept=".json,application/json" class="visually-hidden"><button type="button" class="btn ghost small" data-action="recovery-download-preserved">Download preserved recovery data</button></div>' +
    '<p class="panel-note" style="margin-top:13px">Backups include your personal information. Keep them private. Import replaces this browser’s copy; if cloud sync is enabled, those changes may sync.</p></section>';
}

function expiryText(value) {
  if (!value) return '';
  const info = dateStatus(value);
  if (info.kind === 'past') return '<span class="expiry-expired">Past recorded date · ' + Math.abs(info.days) + 'd</span>';
  if (info.kind === 'soon') return '<span class="expiry-warning">' + escapeHtml(info.label) + '</span>';
  if (info.kind === 'invalid') return '<span class="expiry-warning">Check recorded date</span>';
  return 'Best before ' + escapeHtml(value);
}
function pantryPage() {
  const edit = store.pantry.find(x => x.id === editingId);
  const soon = expiringBatches(store.pantry);
  const bulkUi = bulkOpen ? '<section class="panel bulk-panel" aria-label="Add many ingredients">' +
    '<div class="section-head"><div><h3>Add several ingredients</h3><p>Paste a shopping list, then review before adding. Existing items remain unchanged.</p></div>' +
    '<button type="button" class="btn ghost small" data-action="bulk-close">Close ×</button></div>' +
    '<form id="bulk-pantry-form" class="field"><label for="bulk-input">Ingredients — one per line, or names separated by commas</label>' +
    '<textarea id="bulk-input" name="bulk" rows="6" maxlength="15000" required placeholder="Rice | 1 kg | Pantry&#10;Eggs | 6 pcs | Fridge&#10;Tomatoes&#10;Chicken | 500 g | Freezer | 2026-11-15">' + escapeHtml(bulkDraft) + '</textarea>' +
    '<p class="panel-note">Optional format: Name | amount + unit | Pantry/Fridge/Freezer/Other | YYYY-MM-DD. Missing quantities stay unknown; we never assume you have enough.</p>' +
    '<div class="dialog-actions"><button class="btn" type="submit">Preview ingredients →</button>' +
    '<button class="btn secondary" type="button" data-action="bulk-clear">Clear</button></div></form>' +
    (bulkPreview ? '<div class="bulk-preview" role="status"><h3>Review your ingredients</h3>' +
    '<p class="panel-note">' + bulkPreview.items.length + ' ready to add · ' + bulkPreview.skipped.length + ' duplicates skipped · ' + bulkPreview.errors.length + ' lines need fixing</p>' +
    (bulkPreview.items.length ? '<ul class="bulk-items">' + bulkPreview.items.map(item => '<li><strong>' + escapeHtml(item.name) + '</strong><span>' +
       escapeHtml((item.quantity ? item.quantity + ' ' + item.unit : 'Amount unknown') + ' · ' + item.location + (item.expiry ? ' · ' + item.expiry : '')) + '</span></li>').join('') + '</ul>' : '') +
    (bulkPreview.skipped.length ? '<p class="note">Already listed: ' + escapeHtml(bulkPreview.skipped.map(x => x.name).join(', ')) + ' — these will not be overwritten.</p>' : '') +
    (bulkPreview.errors.length ? '<ul class="bulk-errors">' + bulkPreview.errors.map(x => '<li>Line ' + x.line + ': ' + escapeHtml(x.message) + '</li>').join('') + '</ul>' : '') +
    (bulkPreview.items.length && !bulkPreview.errors.length ? '<button class="btn" type="button" data-action="bulk-confirm">Add ' + bulkPreview.items.length + ' ingredients ✓</button>' :
      '<p class="panel-note">Fix any invalid lines above before importing.</p>') + '</div>' : '') +
    '</section>' : '';
  const rows = [...store.pantry].sort((a, b) => a.name.localeCompare(b.name));
  const form = '<form id="pantry-form" class="pantry-form">' +
    (newBatchName && !edit ? '<p class="note" style="grid-column:1/-1">New batch of ' + escapeHtml(newBatchName) + '. Its quantity, location and date will be kept separate from your existing stock.</p>' : '') + '<div class="field wide"><label for="ingredient-name">Ingredient name *</label><input name="name" id="ingredient-name" placeholder="e.g. tomatoes, chicken breast, rice..." maxlength="80" value="' + escapeHtml(edit?.name || newBatchName || '') + '" required></div>' +
    '<div class="field"><label for="ingredient-quantity">Amount</label><input name="quantity" id="ingredient-quantity" type="number" min="0" step="any" placeholder="500" value="' + escapeHtml(edit?.quantity || '') + '"></div>' +
    '<div class="field"><label for="ingredient-unit">Unit</label><select name="unit" id="ingredient-unit">' +
    ['pcs','g','kg','ml','l','tsp','tbsp','cups','packs'].map(x => '<option value="' + x + '"' + ((edit?.unit || 'pcs') === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
    '<div class="field"><label for="ingredient-location">Stored in</label><select name="location" id="ingredient-location">' +
    ['Pantry','Fridge','Freezer','Other'].map(x => '<option' + ((edit?.location || 'Pantry') === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
    '<div class="field"><label for="ingredient-expiry">Best before (optional)</label><input id="ingredient-expiry" name="expiry" type="date" value="' + escapeHtml(edit?.expiry || '') + '"></div>' +
    '<div class="field buttons"><button class="btn" type="submit">' + (edit ? 'Save changes' : newBatchName ? '+ Save separate batch' : '+ Add ingredient') + '</button>' + (edit || newBatchName ? '<button type="button" class="btn secondary" data-action="cancel-edit">Cancel</button>' : '') + '</div></form>';
  const inventory = rows.length ? '<div class="inventory-list">' + rows.map(x => {
    const meta = [x.quantity !== '' && x.quantity != null ? x.quantity + ' ' + (x.unit || '') : 'Amount not set', x.location || 'Pantry'].join(' · ');
    return '<div class="inventory-row"><div><div class="inventory-name">' + escapeHtml(x.name) + '</div><div class="inventory-meta">' + escapeHtml(meta) + (x.expiry ? ' · ' + expiryText(x.expiry) : '') + '</div></div>' +
      '<div class="row-actions"><button class="icon-button" type="button" data-action="add-batch" data-id="' + escapeHtml(x.id) + '" aria-label="Add another batch of ' + escapeHtml(x.name) + '">＋</button><button class="icon-button" type="button" data-action="edit-pantry" data-id="' + escapeHtml(x.id) + '" aria-label="Edit ' + escapeHtml(x.name) + '">✎</button>' +
      '<button class="icon-button" type="button" data-action="remove-pantry" data-id="' + escapeHtml(x.id) + '" aria-label="Remove ' + escapeHtml(x.name) + '">×</button></div></div>';
  }).join('') + '</div>' : empty('🥬','Your kitchen is empty','Add the ingredients in your fridge, freezer or cupboards to get relevant cooking ideas.');
  const expiring = rows.filter(x => ['soon','past'].includes(dateStatus(x.expiry).kind)).length;
  const dueSoon = soon.length ? '<section class="panel due-soon" aria-label="Ingredients dated soon"><div class="section-head"><div><h3>Use these soon</h3><p>Recorded dates within three days, starting today</p></div><button type="button" class="btn secondary small" data-action="suggest">Find recipes ↗</button></div><div class="due-list">' + soon.map(item => '<div class="due-item"><strong>' + escapeHtml(item.name) + '</strong><span>' + escapeHtml(item.dateInfo.label) + '</span></div>').join('') + '</div><p class="panel-note">These are your recorded dates, not a food-safety decision. Always check storage and freshness.</p></section>' : '';
  return '<div class="page-top"><div class="eyebrow">KNOW WHAT YOU HAVE</div><h1>Your kitchen, <em>organised.</em></h1><p class="lead">Keep a simple inventory and find recipes that match what is already at home.</p></div>' +
    '<div class="page-grid"><div><div class="panel"><div class="section-head"><h3>' + (edit ? 'Edit an ingredient' : 'Add to your kitchen') + '</h3><button type="button" class="btn secondary small" data-action="bulk-open">+ Add many at once</button></div>' + form + '</div>' + bulkUi +
    '<section class="section"><div class="section-head"><div><h3>On your shelves</h3><p>' + rows.length + ' recorded batches</p></div></div>' + inventory + '</section>' + leftoversPanel() + '</div>' +
    '<aside><div class="panel"><h3>Kitchen at a glance</h3><div class="stat-block"><span class="stat-number">' + rows.length + '</span><span class="stat-label">ingredients recorded</span></div><div class="stat-block"><span class="stat-number">' + expiring + '</span><span class="stat-label">past or within 3 days of their recorded date</span></div>' +
    '<button type="button" class="btn" data-action="suggest" style="width:100%;margin:14px 0">✦ Find recipes with my food</button>' +
    '<p class="panel-note">Keep purchases with different dates as separate batches using ＋. Names are matched first; amounts are added only when compatible. Recorded best-before dates are not proof that food is safe or unsafe.</p></div>' + dueSoon + '</aside></div>';
}

function captureFields(form) {
  return form ? [...form.elements].filter(x=>x.name).map(x=>({name:x.name,value:x.value,checked:x.checked,type:x.type})) : [];
}
function restoreFields(form,fields) {
  if(!form)return;
  for(const field of fields) {
    const input=form.elements.namedItem(field.name);
    if(!input)continue;
    if(field.type==='checkbox')input.checked=field.checked;
    else input.value=field.value;
  }
}
function currentShoppingChecklist() {
  const dates=nextSevenDates().map(x=>x.key);
  const week=Object.fromEntries(dates.map(day=>[day,store.plan[day]]).filter(([,id])=>id));
  return shoppingChecklist(shoppingList(week,store.saved,store.pantry,store.planServings),store.shoppingExtras,store.shoppingChecked);
}
function choiceOptions(values,selected) {
  return values.map(value=>'<option'+(value===selected?' selected':'')+'>'+escapeHtml(value)+'</option>').join('');
}
function purchasePanel() {
  if(!purchaseDraft)return '';
  return '<section class="panel kitchen-review" aria-labelledby="purchase-review-title"><h3 id="purchase-review-title" tabindex="-1">Review food purchases</h3>'+
    '<p class="panel-note">Select only food you want to track. Enter the actual amount you bought, not just the recipe shortfall. Each selected purchase becomes a separate batch.</p>'+
    '<form id="purchase-review-form" data-review-id="'+escapeHtml(purchaseDraft.id)+'">'+purchaseDraft.rows.map((row,i)=>'<fieldset class="purchase-row"><legend><label><input type="checkbox" name="pick-'+i+'"> '+escapeHtml(row.item.name)+'</label></legend>'+
      '<div class="purchase-fields"><div class="field"><label for="purchase-name-'+i+'">Pantry ingredient name</label><input id="purchase-name-'+i+'" name="name-'+i+'" maxlength="150" value="'+escapeHtml(row.item.name.length<=150?row.item.name:'')+'" placeholder="e.g. Rice cakes">'+(row.item.name.length>150?'<p class="panel-note">Give this long ingredient a short pantry name. Its original wording stays above.</p>':'')+'</div><div class="field"><label for="purchase-amount-'+i+'">Actual amount</label><input id="purchase-amount-'+i+'" name="amount-'+i+'" type="number" min="0" step="any" placeholder="Enter amount"></div>'+
      '<div class="field"><label for="purchase-unit-'+i+'">Unit</label><select id="purchase-unit-'+i+'" name="unit-'+i+'">'+choiceOptions(STOCK_UNITS,'pcs')+'</select></div>'+
      '<div class="field"><label for="purchase-location-'+i+'">Stored in</label><select id="purchase-location-'+i+'" name="location-'+i+'">'+choiceOptions(STOCK_LOCATIONS,'Pantry')+'</select></div>'+
      '<div class="field"><label for="purchase-expiry-'+i+'">Recorded date · optional</label><input id="purchase-expiry-'+i+'" name="expiry-'+i+'" type="date"></div></div></fieldset>').join('')+
    '<div class="dialog-actions"><button class="btn" type="submit">Confirm and add to kitchen</button><button class="btn secondary" type="button" data-action="shopping-receive-cancel">Cancel</button></div></form></section>';
}
function cookingStockPanel() {
  const rows=cookingStockSnapshot.map((row,i)=>'<div class="usage-row"><label class="usage-select"><input type="checkbox" name="use-'+i+'"> '+escapeHtml(row.name)+
    '<span class="panel-note">'+escapeHtml(row.quantity+' '+row.unit+' · '+row.location+(row.expiry?' · dated '+row.expiry:''))+'</span></label>'+
    '<div class="field"><label for="used-'+i+'">Actually used ('+escapeHtml(row.unit)+')</label><input id="used-'+i+'" name="used-'+i+'" type="number" min="0" max="'+escapeHtml(row.quantity)+'" step="any" value="'+escapeHtml(row.suggested)+'" placeholder="Enter amount"></div></div>').join('');
  return '<details class="field wide kitchen-review-details"><summary>Review ingredients used · optional</summary><p class="panel-note">Select the batches you used and confirm actual amounts. Suggestions are editable. Unselected batches stay unchanged; unknown amounts are never guessed.</p>'+
    (rows || '<p class="panel-note">No compatible measured stock to review. You can update amounts in My kitchen.</p>')+'</details>'+
    '<details class="field wide kitchen-review-details"><summary>Save leftovers · optional</summary><div class="purchase-fields">'+
    '<div class="field"><label for="leftover-portions">Portions left</label><input id="leftover-portions" name="leftoverPortions" type="number" min="0" max="100" step="1" placeholder="None"></div>'+
    '<div class="field"><label for="leftover-location">Stored in</label><select id="leftover-location" name="leftoverLocation">'+choiceOptions(['Fridge','Freezer'],'Fridge')+'</select></div>'+
    '<div class="field"><label for="leftover-prepared">Prepared on</label><input id="leftover-prepared" name="leftoverPrepared" type="date" value="'+nextSevenDates()[0].key+'"></div>'+
    '<div class="field"><label for="leftover-reminder">Reminder date · optional</label><input id="leftover-reminder" name="leftoverReminder" type="date"></div></div><p class="panel-note">Dates are your reminders, not food-safety advice. No notification is scheduled.</p></details>';
}
function leftoversPanel() {
  if(!store.leftovers?.length)return '';
  return '<section class="panel leftovers-panel" aria-label="Cooked meals and leftovers"><h3>Cooked meals &amp; leftovers</h3><p class="panel-note">Keep portions separate from raw ingredients. Check storage and freshness yourself.</p>'+
    store.leftovers.map(row=>'<div class="leftover-row"><div><strong>'+escapeHtml(row.name)+'</strong><p class="panel-note">'+row.portions+' portion'+(row.portions===1?'':'s')+' · '+escapeHtml(row.location)+' · prepared '+escapeHtml(row.preparedAt)+(row.reminderDate?' · reminder '+escapeHtml(row.reminderDate):'')+'</p></div>'+
    '<div class="dialog-actions"><button class="btn secondary small" type="button" data-action="leftover-use" data-id="'+escapeHtml(row.id)+'"'+(!row.portions?' disabled':'')+'>Use one portion</button>'+
    '<button class="icon-button" type="button" data-action="leftover-more" data-id="'+escapeHtml(row.id)+'" aria-label="Restore one portion of '+escapeHtml(row.name)+'"'+(row.portions>=100?' disabled':'')+'>＋</button>'+
    '<button class="icon-button" type="button" data-action="leftover-remove" data-id="'+escapeHtml(row.id)+'" aria-label="Remove leftover '+escapeHtml(row.name)+'">×</button></div></div>').join('')+'</section>';
}
function planPage() {
  const dates = nextSevenDates();
  const plannedIds = new Set(Object.values(store.plan));
  const saved = Object.entries(store.saved).filter(([id,entry]) => (flags(entry) || plannedIds.has(id)) && entry.meal);
  const options = saved.map(([id, entry]) => '<option value="' + escapeHtml(id) + '">' + escapeHtml(entry.meal.strMeal) + '</option>');
  const rows = dates.map(day => {
    const mealId = store.plan[day.key];
    const reference = validServings(store.saved[mealId]?.baseServings);
    const intended = resolvePlanServings(store.saved[mealId],store.planServings?.[day.key]);
    const servingInput = reference
      ? '<div class="plan-serving-control"><label for="plan-servings-' + day.key + '">Servings</label>' +
        '<input id="plan-servings-' + day.key + '" data-plan-servings="' + day.key +
        '" type="number" inputmode="numeric" min="1" max="24" step="1" value="' + intended + '">' +
        '<span class="panel-note">Original serves ' + reference + '</span></div>'
      : mealId
        ? '<div class="plan-serving-unset"><span class="panel-note">Amounts as written — original servings unknown.</span>' +
          '<button type="button" class="btn ghost small" data-action="open" data-id="' + escapeHtml(mealId) + '">Set reference ↗</button></div>'
        : '';
    return '<div class="day-row"><div class="day-name">' + day.label + '<span class="day-date">' + day.date +
      '</span></div><div class="day-recipe-controls"><select class="plan-select" data-plan-day="' + day.key +
      '" aria-label="Recipe for ' + day.label + ' ' + day.date + '">' +
      '<option value="">Choose a recipe...</option>' + options.map((option, i) =>
        option.replace('<option value=', '<option' + (saved[i][0] === mealId ? ' selected' : '') + ' value=')).join('') +
      '</select>' + servingInput + '</div></div>';
  }).join('');
  const week = Object.fromEntries(dates.map(x => [x.key, store.plan[x.key]]).filter(([,id]) => id));
  const shopping = shoppingList(week, store.saved, store.pantry, store.planServings);
  const checklist = shoppingChecklist(shopping,store.shoppingExtras,store.shoppingChecked);
  const shoppingRow = row => {
    const item = row.item;
    const title = escapeHtml(item.name);
    const stocked=store.shoppingStocked?.[row.key]===purchaseFingerprint(row);
    const meta = stocked?'Already added to your kitchen':row.manual ? 'Your own item · not automatically added to the kitchen' :
      'For ' + escapeHtml(item.meals.join(', '));
    const identity = row.manual ? 'data-shopping-extra="' + escapeHtml(row.key) + '"' :
      'data-shopping-recipe="' + escapeHtml(row.key) + '"';
    return '<div class="shopping-row shopping-check-row' + (row.checked ? ' shopping-checked' : '') +
      '"><label class="shopping-row-label"><input type="checkbox" ' + identity +
      (row.checked ? ' checked' : '') + ' aria-label="Mark ' + title +
      (row.checked ? ' not purchased' : ' purchased') + '"><span class="shopping-item-text"><strong class="shopping-name">' +
      title + '</strong><span class="shopping-meta">' + meta + '</span></span></label>' +
      (row.manual
        ? '<button type="button" class="icon-button" data-action="shopping-remove-extra" data-id="' +
          escapeHtml(row.key) + '" aria-label="Remove ' + title + ' from personal shopping list">×</button>'
        : '<span class="shopping-amount">' + escapeHtml(item.label) + '</span>') + '</div>';
  };
  const currentRows = checklist.toBuy.length ? checklist.toBuy.map(shoppingRow).join('') :
    '<p class="panel-note shopping-empty">Nothing left to pick up. Add a personal item below or choose meals for the week.</p>';
  const completedRows = checklist.completed.length ? '<details class="completed-shopping"><summary>' +
    checklist.completed.length + ' picked up · tap to review</summary>' +
    checklist.completed.map(shoppingRow).join('') + '</details>' : '';
  return '<div class="page-top"><div class="eyebrow">PLAN AHEAD, WORRY LESS</div><h1>What’s cooking <em>this week?</em></h1><p class="lead">Choose from recipes you have saved and see which ingredients you still need to buy.</p></div>' +
    (!saved.length ? '<div class="note" style="margin-bottom:23px">First save some recipes in My recipes. They will appear as options in your meal plan.</div>' : '') +
    '<div class="page-grid"><section class="panel"><h3>Next seven days</h3><div class="list-sections">' + rows + '</div></section>' +
    '<aside class="panel"><div class="section-head"><div><h3>Shopping checklist</h3><p role="status">' +
    checklist.completedCount + ' of ' + checklist.total + ' picked up</p></div></div>' +
    '<div class="shopping-checklist">' + currentRows + completedRows + '</div>' +
    '<button class="btn secondary" type="button" data-action="shopping-receive"'+(!purchaseReview(checklist,store.shoppingStocked).length?' disabled':'')+'>Review purchases for kitchen ('+purchaseReview(checklist,store.shoppingStocked).length+')</button>' +
    '<form id="shopping-extra-form" class="shopping-add-form"><label for="shopping-extra-input">Add another item</label>' +
    '<div class="shopping-add-inline"><input id="shopping-extra-input" type="text" name="item" maxlength="100" placeholder="e.g. Dish soap, bananas…" required>' +
    '<button type="submit" class="btn secondary small">+ Add</button></div></form>' +
    (checklist.toBuy.length ? '<button class="btn secondary" type="button" data-action="copy-shopping" style="width:100%;margin:18px 0">Copy remaining items ↗</button>' : '') +
    '<p class="panel-note">Ticking an item only tracks shopping progress. Review actual food purchases before adding them to your kitchen. If recipe requirements change, earlier checkmarks need checking again.</p></aside></div>' + purchasePanel();
}


function worldPage() {
  const countries=countryDirectory(worldAreas);
  const cell=worldIndex ? catalogueCell(worldIndex,worldCountry,worldCategory) : null;
  const pairResearch=researchReviewSummary(store.editorialReviews,worldCountry,worldCategory);
  const auditedHints=worldResearchGapMap?.get(JSON.stringify([worldCountry,worldCategory]));
  const number=cell?.count ?? 0;
  const assessed=Boolean(worldIndex);
  const incomplete=worldPartial.length>0;
  const selectedOption=(name,selected)=>
    '<option value="'+escapeHtml(name)+'"'+(name===selected?' selected':'')+'>'+escapeHtml(name)+'</option>';
  const controls='<div class="world-filters"><div class="field"><label for="world-country">Country or territory</label>' +
    '<select id="world-country" data-world-country '+(!countries.length?'disabled':'')+'>'+
    countries.map(x=>selectedOption(x.country,worldCountry)).join('')+'</select></div>' +
    '<div class="field"><label for="world-category">Recipe category</label>' +
    '<select id="world-category" data-world-category '+(!worldCategories.length?'disabled':'')+'>'+
    worldCategories.map(x=>selectedOption(x,worldCategory)).join('')+'</select></div></div>';
  const startButton='<div class="world-actions"><button type="button" class="btn" data-action="world-scan" '+
    (worldScanning || !countries.length?'disabled':'')+'>'+
    (worldScanning?'Collecting recipes…':assessed?'Rescan source catalogue':'Collect available recipes')+'</button>'+
    (worldScanning?'<button type="button" class="btn secondary" data-action="world-cancel">Stop scan</button>':'')+
    (assessed?'<button type="button" class="btn secondary" data-action="world-export">Export coverage report ↓</button>':'')+'</div>';
  const progress=worldScanning ?
    '<div class="world-progress" role="status"><div class="progress-bar"><span style="width:'+
    Math.round(100*worldScanProgress.completed/Math.max(1,worldScanProgress.total))+'%"></span></div>'+
    '<p>Checked '+worldScanProgress.completed+' of '+worldScanProgress.total+
    ' recipe initials · '+worldScanProgress.recipes+' source entries read · '+
    worldScanProgress.failed+' failed requests</p></div>' : '';
  const scannedStats=assessed ?
    '<div class="world-stats" aria-label="Catalogue source coverage"><div><strong>'+
    worldIndex.stats.countries+'</strong><span>Provider-listed places</span></div><div><strong>'+
    worldIndex.stats.categories+'</strong><span>Categories</span></div><div><strong>'+
    worldIndex.stats.nonempty+'</strong><span>Country-category pairs with recipes</span></div><div><strong>'+
    worldIndex.stats.full+'</strong><span>Pairs reaching '+CATALOGUE_TARGET+'</span></div></div>' : '';
  const summary=assessed && cell ?
    '<section class="world-result-head" aria-live="polite"><div><div class="eyebrow">SOURCED CANDIDATES</div>'+
    '<h2>'+escapeHtml(worldCountry)+' · '+escapeHtml(worldCategory)+'</h2>'+
    '<p>'+number+' / '+CATALOGUE_TARGET+' source recipes found for this combination. '+
    (cell.missing?'Still '+cell.missing+' short of the collection target.':'Collection target reached.')+
    ' None have been independently selected as “best” or authenticated as traditional dishes. '+pairResearch.shortlisted+
    ' additional Wikibooks lead(s) shortlisted by you for this pair (separate research; NOT part of the '+number+' source records).</p></div>'+
    '<div class="world-count">'+number+' <span>/ '+CATALOGUE_TARGET+'</span></div></section>' : '';
  const gapClues=assessed && auditedHints ?
    '<section class="world-review-audit" aria-label="Unverified research leads">'+
    '<div><h3>Sources still worth investigating</h3><p>'+
    auditedHints.wikibooksJointTagLeads+
    ' Wikibooks page(s) have category tags mentioning both '+escapeHtml(worldCountry)+
    ' and '+escapeHtml(worldCategory)+'. '+auditedHints.wikibooksCountryTagLeads+
    ' mention the country. These are <strong>unverified source clues</strong>, not additional authenticated dishes or approved photographs.</p></div>'+
    '<button class="btn secondary small" type="button" data-action="world-review-focus">Explore research clues →</button>'+
    '</section>' : '';
  const caution=assessed && incomplete ?
    '<p class="world-warning" role="status">Incomplete provider scan: requests for '+
    escapeHtml(worldPartial.join(', ').toUpperCase())+
    ' failed. Counts may be lower than the provider’s actual catalogue.</p>' : '';
  const sourceQuery=worldResearchQuery.trim().toLocaleLowerCase();
  const searchedResearch=researchLeadResults(worldResearchEntries,sourceQuery,worldResearchEvidence,
    {tag:worldResearchTag,status:worldResearchStatus,reviews:store.editorialReviews});
  const priorityOptions={country:worldCountry,category:worldCategory,
    areas:worldAreas,reviews:store.editorialReviews,mode:worldResearchFocus};
  const priorityResearch=buildResearchPriority(searchedResearch,worldResearchEvidence,priorityOptions);
  const matchedResearch=priorityResearch.map(x=>x.entry);
  const priorityById=new Map(priorityResearch.map(x=>[x.entry.id,x]));
  const queueSummary=researchQueueCounts(worldResearchEntries,worldResearchEvidence,priorityOptions);
  const researchPages=Math.max(1,Math.ceil(matchedResearch.length/24));
  const researchPage=Math.max(0,Math.min(worldResearchPage,researchPages-1));
  const reviewedStats=researchReviewSummary(store.editorialReviews);
  const editSource=worldResearchEntries.find(x=>x.id===worldResearchReviewId);
  const possibleOverlap=editSource?possibleSourceMatches(editSource.title,worldOverlapIndex):[];
  const selectedResearch=editSource&&(store.editorialReviews?.[editSource.id]||{});
  const selectedRights=selectedResearch?.rights||emptyRightsReview();
  const rightsState=rightsReviewChecklist(selectedResearch?.rights);
  const overlapWarning=editSource && possibleOverlap.length ?
    '<aside class="source-overlap-panel" role="note">'+
      '<h4>Possibly already documented in TheMealDB</h4>'+
      '<p class="panel-note">Matching recipe titles are research clues only. Recipes may differ in ingredients, preparation, or regional tradition. Check both original sources before counting distinct dishes.</p>'+
      '<ul>'+possibleOverlap.map(record=>
        '<li><a href="'+escapeHtml(record.detailEndpoint)+'" target="_blank" rel="noopener noreferrer">'+
        escapeHtml(record.name)+' ↗</a><span>'+
        escapeHtml(record.country)+' · '+escapeHtml(record.category)+' · '+
        (record.matchType==='same-normalised-title'?'Same normalised title':'Same words in different order')+
        '</span></li>').join('')+'</ul>'+
      '<p class="panel-note"><strong>Not confirmed duplicates.</strong> No candidate has been removed or assigned authenticity.</p></aside>'
    : editSource ? '<p class="panel-note source-overlap-clear">No close title match in the current TheMealDB source index. That does not prove this recipe is unique.</p>' : '';
  const reviewEditor=editSource ?
    '<form id="world-review-form" class="world-review-editor" aria-label="Research record for '+escapeHtml(editSource.title)+'">'+
    '<div class="section-head"><div><h3>Research: '+escapeHtml(editSource.title)+'</h3>'+
    '<p>Private research notes. This is not a public editorial approval.</p></div>'+
    '<button type="button" class="btn ghost small" data-action="world-review-close">Close</button></div>'+
    '<label for="review-country">Country or region to investigate</label>'+
    '<select id="review-country" name="country"><option value="">Not assigned</option>'+
    countries.map(x=>selectedOption(x.country,selectedResearch.country)).join('')+'</select>'+
    '<label for="review-category">Course or category to investigate</label>'+
    '<select id="review-category" name="category"><option value="">Not assigned</option>'+
    worldCategories.map(x=>selectedOption(x,selectedResearch.category)).join('')+'</select>'+
    '<label for="review-status">Research status</label>'+
    '<select id="review-status" name="status">'+
    [['researching','Researching'],['needs-evidence','Needs more evidence'],
      ['shortlisted','Shortlisted — NOT approved'],['rejected','Exclude from this research']].map(([key,label])=>
      '<option value="'+key+'"'+((selectedResearch.status||'researching')===key?' selected':'')+'>'+label+'</option>').join('')+
    '</select>'+
    '<label for="review-evidence">Independent supporting HTTPS link</label>'+
    '<input id="review-evidence" name="evidenceUrl" type="url" maxlength="500" placeholder="https://..." value="'+escapeHtml(selectedResearch.evidenceUrl||'')+'">'+
    '<label for="review-notes">Evidence notes and cultural context</label>'+
    '<textarea id="review-notes" name="notes" maxlength="1000" rows="4" placeholder="Origin evidence, shared cuisine variants, licences still to check">'+
    escapeHtml(selectedResearch.notes||'')+'</textarea>'+
    '<p class="panel-note">A shortlist requires a country, category, independent HTTPS link and at least 20 characters of notes. It is NOT a verified “best 30” recipe and does not change public country totals.</p>'+
    '<details class="rights-editor"><summary>Text and photograph rights · optional evidence</summary>'+
    '<p class="panel-note">Recording a licence or attribution is not legal clearance. No copied photos or recipe instructions are published from this form.</p>'+
    '<label for="review-text-plan">Recipe text handling</label>'+
    '<select id="review-text-plan" name="textPlan">'+
    [['link-only','Link to original only (default)'],['reuse-needs-review','Propose text reuse — pending permission review']].map(([value,label])=>
      '<option value="'+value+'"'+(selectedRights.textPlan===value?' selected':'')+'>'+label+'</option>').join('')+
    '</select>'+
    '<label for="review-text-license">Recipe text licence or permission evidence (HTTPS)</label>'+
    '<input id="review-text-license" name="textLicenseUrl" type="url" maxlength="500" value="'+escapeHtml(selectedRights.textLicenseUrl)+'" placeholder="https://...">'+
    '<label for="review-text-attribution">Recipe-text creator / attribution wording</label>'+
    '<input id="review-text-attribution" name="textAttribution" maxlength="300" value="'+escapeHtml(selectedRights.textAttribution)+'" placeholder="Original contributor(s), source, licence">'+
    '<label for="review-photo-plan">Photograph handling</label>'+
    '<select id="review-photo-plan" name="photoPlan">'+
    [['no-photo','No photo planned (default)'],['external-link-only','Reference original photo only'],['reuse-needs-review','Propose photo reuse — pending permission review']].map(([value,label])=>
      '<option value="'+value+'"'+(selectedRights.photoPlan===value?' selected':'')+'>'+label+'</option>').join('')+
    '</select>'+
    '<label for="review-photo-source">Original photo or Commons file-description page (HTTPS)</label>'+
    '<input id="review-photo-source" name="photoSourceUrl" type="url" maxlength="500" value="'+escapeHtml(selectedRights.photoSourceUrl)+'" placeholder="https://commons.wikimedia.org/wiki/File:...">'+
    '<label for="review-photo-license">Specific photo licence evidence (HTTPS)</label>'+
    '<input id="review-photo-license" name="photoLicenseUrl" type="url" maxlength="500" value="'+escapeHtml(selectedRights.photoLicenseUrl)+'" placeholder="https://creativecommons.org/licenses/...">'+
    '<label for="review-photo-creator">Photo creator</label>'+
    '<input id="review-photo-creator" name="photoCreator" maxlength="160" value="'+escapeHtml(selectedRights.photoCreator)+'" placeholder="Creator as credited on file page">'+
    '<label for="review-photo-attribution">Required photo attribution</label>'+
    '<input id="review-photo-attribution" name="photoAttribution" maxlength="300" value="'+escapeHtml(selectedRights.photoAttribution)+'" placeholder="Creator · source · licence · changes">'+
    '<label for="review-rights-notes">Rights investigation notes</label>'+
    '<textarea id="review-rights-notes" name="reviewNotes" maxlength="750" rows="3" placeholder="Source and photo rights still to be checked">'+escapeHtml(selectedRights.reviewNotes)+'</textarea>'+
    '<p class="panel-note">Rights status: '+escapeHtml(rightsState.textEvidence)+'; '+escapeHtml(rightsState.photoEvidence)+'. <strong>Not approved for publication.</strong></p>'+
    '</details>'+
    '<div class="world-actions"><button type="submit" class="btn">Save research notes</button>'+
    (store.editorialReviews?.[editSource.id] ?
      '<button type="button" class="btn secondary" data-action="world-review-delete" data-id="'+escapeHtml(editSource.id)+'">Discard notes</button>' : '')+
    '</div></form>' : '';
  const originalSourceMedia=editSource?sourceMediaPanel():'';
  const researchList=worldResearchOpen ? '<section class="panel world-research" aria-label="Wikibooks source research"><div class="section-head"><div>'+
    '<h3>More recipe sources to research</h3><p>Linked Wikibooks Cookbook pages, not classified or verified as any country’s best recipes.</p></div></div>'+
    (worldResearchLoading?'<p class="panel-note" role="status">Loading source links…</p>':'')+
    (worldResearchError?'<p role="alert" class="world-warning">'+escapeHtml(worldResearchError)+
      ' <button class="btn secondary small" type="button" data-action="world-research-load">Retry</button></p>':'')+
    (!worldResearchLoading&&!worldResearchError?'<form id="world-research-form" role="search" class="world-research-form">'+
      '<label for="world-research-query">Search these recipe titles</label><div class="shopping-add-inline">'+
      '<input id="world-research-query" name="query" maxlength="100" value="'+escapeHtml(worldResearchQuery)+
      '" placeholder="Try biryani, stew, cake…">'+
      '<button class="btn secondary small" type="submit">Search</button></div>'+
      '<div class="world-review-filters"><label for="world-research-tag">Source category label contains</label>'+
      '<input id="world-research-tag" name="tag" maxlength="100" value="'+escapeHtml(worldResearchTag)+
      '" placeholder="e.g. South Asian, rice, soup">'+
      '<label for="world-research-status">Your research progress</label>'+
      '<select id="world-research-status" name="status">'+
      [['all','All research leads'],['unreviewed','Not yet reviewed'],['researching','Researching'],
      ['needs-evidence','Needs stronger evidence'],['shortlisted','Shortlisted (not approved)'],['rejected','Excluded']].map(([key,label])=>
        '<option value="'+key+'"'+(worldResearchStatus===key?' selected':'')+'>'+label+'</option>').join('')+
      '</select><label for="world-research-focus">Research leads to prioritise</label>'+
      '<select id="world-research-focus" name="priority">'+
      [['all','All linked leads'],['country','Source tags mention this country'],
        ['country-category','Source tags mention country and category']].map(([key,label])=>
        '<option value="'+key+'"'+(worldResearchFocus===key?' selected':'')+'>'+label+'</option>').join('')+
      '</select></div></form>'+
      '<p class="panel-note world-priority-summary" role="status">Source-tag hints (not verified): '+
        queueSummary.countryHints+' mention '+escapeHtml(worldCountry)+'; '+
        queueSummary.jointHints+' also mention '+escapeHtml(worldCategory)+
        '. These do not increase the 30-recipe target count.</p>'+
      '<p class="panel-note" role="status">'+matchedResearch.length+' linked source records'+
      (sourceQuery?' match your search':'')+'. Page '+(researchPage+1)+' of '+researchPages+' · up to 24 per page'+
      '. Country and course assignments require human verification.</p>'+
      '<ul class="world-research-list">'+matchedResearch.slice(researchPage*24,(researchPage+1)*24).map(x=>
        '<li><a href="'+externalUrl(x.url)+'" target="_blank" rel="noopener noreferrer">'+
        escapeHtml(x.title)+' ↗</a><span>Wikibooks · course/origin unreviewed</span>'+
        (priorityById.get(x.id)?.countryTags.length ?
          '<span class="research-tags country-hint">Country tag clue: '+
          escapeHtml(priorityById.get(x.id).countryTags.slice(0,2).join(' · '))+'</span>' : '')+
        (priorityById.get(x.id)?.categoryTags.length ?
          '<span class="research-tags">Category tag clue: '+
          escapeHtml(priorityById.get(x.id).categoryTags.slice(0,2).join(' · '))+'</span>' : '')+
        (store.editorialReviews?.[x.id] ? '<span class="research-status">Your research: '+
          escapeHtml(store.editorialReviews[x.id].status.replaceAll('-',' '))+
          (store.editorialReviews[x.id].country ? ' · '+escapeHtml(store.editorialReviews[x.id].country) : '')+
          '</span>' : '')+
        (worldResearchEvidence.has(x.sourcePageId)&&worldResearchEvidence.get(x.sourcePageId).length ?
          '<span class="research-tags">Source tags (unverified): '+
          escapeHtml(worldResearchEvidence.get(x.sourcePageId).slice(0,3).join(' · '))+'</span>' : '')+
        '<button type="button" class="btn secondary small" data-action="world-research-review" data-id="'+
        escapeHtml(x.id)+'">Research this recipe</button></li>').join('')+'</ul>'+overlapWarning+reviewEditor+originalSourceMedia+
      '<div class="world-research-summary" role="status">Your reviewed leads: '+reviewedStats.reviewed+
      ' · shortlisted (NOT approved): '+reviewedStats.shortlisted+
      ' · verified “best 30” recommendations: 0</div>'+
      '<button type="button" class="btn secondary small" data-action="world-review-export"'+
        (!reviewedStats.reviewed?' disabled':'')+'>Export your research CSV ↓</button>'+
      '<div class="world-research-pages"><button type="button" class="btn secondary small" data-action="world-research-prev"'+(researchPage===0?' disabled':'')+'>← Previous</button><span>Page '+(researchPage+1)+' / '+researchPages+'</span><button type="button" class="btn secondary small" data-action="world-research-next"'+(researchPage>=researchPages-1?' disabled':'')+'>Next →</button></div>'+ '<p class="panel-note">Wikibooks text is subject to CC BY-SA attribution and terms. Images have separate licences. No source photos or recipe instructions are copied into Tasteit.</p>':'')+
      '</section>' :
    '<section class="panel world-research"><div class="section-head"><div><h3>Explore additional recipe leads</h3>'+
    '<p>Thousands of linked Wikibooks Cookbook titles await origin, category and rights review. They are not counted toward the 30 target.</p></div></div>'+
    '<button type="button" class="btn secondary" data-action="world-research-load">Explore Wikibooks research leads ↗</button></section>';
  const recipes=cell?.recipes?.length ? cards(cell.recipes.map(x=>x.meal)) :
    assessed ? '<div class="world-empty"><h3>No sourced recipes in this combination</h3>'+
      '<p>We have not verified a recipe in this country and category from the current source scan. This is a coverage gap, not proof that no local recipes exist.</p></div>' :
      '<div class="world-empty"><h3>Ready to start the collection</h3>'+
      '<p>Choose a country and category, then scan the provider’s recipe index. The first scan makes 26 initial-letter requests; it is started only when you choose to collect.</p></div>';
  return '<div class="page-top"><div class="eyebrow">COOK ACROSS BORDERS</div>'+
    '<h1>The world on <em>your plate.</em></h1>'+
    '<p class="lead">Our collection goal: up to 30 well-documented recipes per relevant country and category. Discover what the provider actually has, with gaps shown clearly.</p></div>'+
    '<section class="panel world-panel"><div class="section-head"><div><h3>Choose a cuisine and category</h3>'+
    '<p>TheMealDB source classifications — they are not independent cultural or dietary certification.</p></div></div>'+
    (worldLoadingOptions?'<p class="panel-note">Loading the country and category directory…</p>':'')+
    (worldOptionsError?'<p role="alert" class="world-warning">'+escapeHtml(worldOptionsError)+
    ' <button class="btn secondary small" data-action="world-retry-options">Try again</button></p>':'')+
    controls+startButton+progress+
    '<p class="panel-note">TheMealDB data and photo source: <a href="https://www.themealdb.com/" target="_blank" rel="noopener noreferrer">TheMealDB</a>. Photos are not ours; public reuse requires rights checks. A data-completeness score chooses candidates, not quality ratings. No invented recipes.</p>'+
    '</section>'+caution+scannedStats+summary+gapClues+recipes+
    (assessed?'<p class="panel-note">Provider records found: '+worldIndex.stats.scanned+
    '. Unclassified: '+worldIndex.stats.unclassified+
    ' · Ambiguous regional labels held back: '+worldIndex.stats.ambiguous+
    '. Empty combinations and unavailable source content require further research and rights review.</p>':'')+
    researchList;
}

function recoveryPage(health) {
  recoveryViewRaw=health.raw;
  const unavailable=health.status==='unavailable',copy=health.lastGood;
  return '<section class="panel recovery-panel" role="region" aria-labelledby="recovery-title"><div class="eyebrow">YOUR COOKBOOK</div><h1 id="recovery-title">'+(unavailable?'Browser storage is unavailable':'Your cookbook needs attention')+'</h1><p class="lead">'+(unavailable?'Allow this browser to store site data, then retry. Your cookbook has not been reset.':'We could not read this browser’s saved records. Editing is paused so a new save cannot replace them.')+'</p>'+
    '<div class="dialog-actions"><button class="btn secondary" type="button" data-action="recovery-retry">Retry</button>'+
    (!unavailable?'<button class="btn secondary" type="button" data-action="recovery-download">Download unreadable copy</button><label class="btn secondary" for="backup-file">Import a backup</label><input type="file" id="backup-file" accept=".json,application/json" class="visually-hidden">':'')+'</div>'+
    (copy?'<h2>Last saved recovery copy</h2><p>'+Object.keys(copy.data.saved).length+' recipes · '+copy.data.pantry.length+' kitchen items. Restore only if this is the copy you want.</p><button class="btn" type="button" data-action="recovery-restore">Restore this copy</button>':'<p class="panel-note">No validated recovery copy is available in this browser.</p>')+
    '<p class="panel-note">An explicit restore keeps the most recent unreadable copy separately. Download recovery files somewhere private.</p></section>';
}
function downloadRecoveryCopy(raw) {
  if(typeof raw!=='string'){notice('No preserved recovery data is available.');return;}
  const url=URL.createObjectURL(new Blob([raw],{type:'text/plain'})),link=document.createElement('a');
  link.href=url;link.download='tasteit-recovery-'+new Date().toISOString().slice(0,10)+'.txt';
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function restoreResultFocus() {
  if(!pendingResultFocus||loading||selectedMeal||openingMealId)return;
  const pending=pendingResultFocus;pendingResultFocus=null;
  if(pending.href&&pending.href!==window.location.href)return;
  if(document.activeElement?.matches?.('input,textarea,select'))return;
  if(/^[A-Za-z0-9_-]{1,219}$/.test(pending.id))document.querySelector('.'+pending.kind+'[data-action="open"][data-id="'+pending.id+'"]')?.focus({preventScroll:true});
}
function render({preserveDialog=false}={}) {
  const filterPanel=document.getElementById('discovery-filter-panel');if(filterPanel)filtersOpen=filterPanel.open;
  cuisines=recipeCuisineOptions(providerCuisines,collectionRecords,store.saved);
  const health=localStoreStatus();
  if(!['ready','empty'].includes(health.status)) {
    closeDialog({history:false});updateNav();appRoot.innerHTML=recoveryPage(health);updateConnectionUI();return;
  }
  recoveryViewRaw=null;
  const tasteDetails=document.getElementById('taste-preferences');
  if(tasteDetails)tastePanelOpen=tasteDetails.open;
  const purchaseForm=document.getElementById('purchase-review-form');
  const purchaseIdentity=purchaseForm?.dataset.reviewId;
  const purchaseFields=captureFields(purchaseForm);
  const active=document.activeElement;
  const restoreInput=['recipe-search','discover-cuisine','discover-category','discover-letter','discover-scope','discover-source','discover-course','discover-sort','discover-rated','taste-cuisines','taste-avoid','taste-summary','taste-save','taste-show-skipped'].includes(active?.id)
    ? {id:active.id,start:active.selectionStart,end:active.selectionEnd}:null;
  updateNav();
  appRoot.innerHTML = view === 'discover' ? discoverPage() : view === 'world' ? worldPage() : view === 'library' ? libraryPage() : view === 'pantry' ? pantryPage() : planPage();
  if(purchaseDraft?.id===purchaseIdentity)restoreFields(document.getElementById('purchase-review-form'),purchaseFields);
  if(restoreInput) {
    const input=document.getElementById(restoreInput.id);
    input?.focus({preventScroll:true});
    if(typeof restoreInput.start==='number')input?.setSelectionRange(restoreInput.start,restoreInput.end);
  }
  if (selectedMeal&&!preserveDialog) renderDialog();
  updateConnectionUI();restoreResultFocus();
}

function instructions(meal) { return recipeSteps(meal); }

function currentCookingSession(meal = selectedMeal) {
  return safeCookingSession(store.cookingSessions?.[meal?.idMeal],Math.max(1,instructions(meal).length));
}
function updateCookingSession(next, remove=false) {
  if (!selectedMeal) return false;
  const nextSessions = {...(store.cookingSessions || {})};
  if (remove) delete nextSessions[selectedMeal.idMeal];
  else nextSessions[selectedMeal.idMeal] = next;
  if (!persistStore({...store,cookingSessions:nextSessions})) {
    notice('Could not save cooking progress in this browser.'); return false;
  }
  store.cookingSessions = nextSessions;
  return true;
}
function syncCookingTimer() {
  clearInterval(cookingTimerTicker);
  cookingTimerTicker = null;
  if (!selectedMeal || stepIndex < 0) return;
  const draw=()=>{
    const display=overlayRoot.querySelector('[data-cooking-clock]');
    if (!display || !selectedMeal) return;
    const session=currentCookingSession();
    const status=timerStatus(session);
    display.textContent=status.text;
    const state=overlayRoot.querySelector('[data-timer-state]');
    if (state) state.textContent=status.complete ? 'Time is up — check your food.' : status.running ? 'Timer running' : 'Timer stopped';
    if (status.complete && timerCompletionNotified !== session.endsAt) {
      timerCompletionNotified = session.endsAt;
      notice('Cooking timer finished. Check your food.');
    }
  };
  draw();
  cookingTimerTicker=setInterval(draw,1000);
}

function actionButton(type, meal, icon, label) {
  const toggled = Boolean(savedEntry(meal.idMeal)[type]);
  return '<button type="button" class="btn ' + (toggled ? '' : 'secondary') + ' small" data-action="' + type + '" data-id="' + escapeHtml(meal.idMeal) + '" aria-pressed="' + toggled + '">' + icon + ' ' + (toggled ? '✓ ' : '') + label + '</button>';
}
function renderDialog() {
  if (!selectedMeal) { overlayRoot.innerHTML = ''; return; }
  const journalFields=captureFields(overlayRoot.querySelector('#cooking-log-form'));
  const focusedControl = overlayRoot.contains(document.activeElement) ? document.activeElement.closest('[data-action]') : null;
  const focusedAction = focusedControl?.dataset.action;
  const focusedId = focusedControl?.dataset.id;
  const meal = selectedMeal;
  const ingredientItems = ingredientsOf(meal);
  const parts = instructions(meal);
  const currentSession = currentCookingSession(meal);
  const timeInfo = timerStatus(currentSession);
  const originalServings = validServings(savedEntry(meal.idMeal).baseServings);
  const targetServings = originalServings ? (validServings(detailTargetServings) || originalServings) : null;
  const prepared = scaledIngredients(meal,originalServings,targetServings);
  const measuredScore = analyseMeal(scaledRecipeForComparison(meal,originalServings,targetServings),store.pantry);
  let contents;
  if (showCookingLog) {
    contents = '<div class="dialog-content"><div class="eyebrow">YOUR COOKING JOURNAL</div><h3>How did it turn out?</h3>' +
      '<p class="panel-note" style="margin-bottom:16px">Save a little reminder for next time. The rating and notes are optional.</p>' +
      '<form id="cooking-log-form" class="personal-recipe-form">' +
      '<div class="field"><label for="cooking-rating">Your rating</label><select name="rating" id="cooking-rating">' +
      '<option value="0">Not rated</option>' + [1,2,3,4,5].map(n => '<option value="' + n + '">' + n + ' / 5</option>').join('') + '</select></div>' +
      '<div class="field wide"><label for="cooking-note">What would you change or remember next time?</label>' +
      '<textarea id="cooking-note" name="note" rows="5" maxlength="1000" placeholder="More chilli next time, cook 3 minutes less, use fresh coriander..."></textarea></div>' +
      cookingStockPanel() + '<div class="field wide dialog-actions"><button type="submit" class="btn">Save cooking experience ✓</button>' +
      '<button type="button" class="btn secondary" data-action="cancel-cook-log">Back to recipe</button></div></form></div>';
  } else if (stepIndex >= 0) {
    const total = parts.length;
    const timerControls = '<section class="cooking-timer" aria-label="Manual cooking timer">' +
      '<div class="cooking-timer-header"><div><strong>Cooking timer</strong><p>Set your own time. Never inferred from recipe directions.</p></div>' +
      '<div class="clock" data-cooking-clock>' + timeInfo.text + '</div></div>' +
      '<div class="timer-presets">' + [1,5,10,15].map(min => '<button type="button" class="btn secondary small" data-action="timer-preset" data-minutes="' + min + '">' + min + ' min</button>').join('') + '</div>' +
      '<div class="timer-controls"><label for="cook-minutes">Minutes</label><input id="cook-minutes" type="number" inputmode="numeric" min="1" max="180" step="1" value="' + (currentSession.durationSeconds/60) + '">' +
      '<button type="button" class="btn secondary small" data-action="timer-set">Set</button>' +
      (timeInfo.running ? '<button type="button" class="btn small" data-action="timer-pause">Pause</button>' : '<button type="button" class="btn small" data-action="timer-start"' + (timeInfo.remainingSeconds === 0 ? ' disabled' : '') + '>Start</button>') +
      '<button type="button" class="btn ghost small" data-action="timer-reset">Reset</button></div>' +
      '<p class="panel-note" data-timer-state aria-live="polite">' + (timeInfo.complete ? 'Time is up — check your food.' : timeInfo.running ? 'Timer running' : 'Timer stopped') + '</p>' +
      '<p class="panel-note">The countdown uses clock time, including when the tab is in the background. An alert is only shown while Tasteit is open. Do not rely on it for food safety.</p></section>';
    contents = '<div class="dialog-content cooking-mode"><div class="eyebrow">COOKING MODE · ' + escapeHtml(meal.strMeal) + '</div>' +
      '<div class="cook-heading"><h3>Step ' + (stepIndex + 1) + ' of ' + total + '</h3><span>' +
      Math.round(100*(stepIndex+1)/Math.max(1,total)) + '% through the recipe</span></div>' +
      '<div class="progress-bar"><span style="width:' + (100 * (stepIndex+1)/Math.max(1,total)) + '%"></span></div>' +
      '<p class="cook-step" tabindex="-1">' + escapeHtml(parts[stepIndex] || '') + '</p>' + timerControls +
      '<div class="dialog-actions"><button type="button" class="btn secondary" data-action="step-back"' + (stepIndex === 0 ? ' disabled' : '') + '>← Previous</button>' +
      (stepIndex < total - 1 ? '<button type="button" class="btn" data-action="step-next">Next step →</button>' :
      '<button type="button" class="btn" data-action="cook-done" data-id="' + escapeHtml(meal.idMeal) + '">Finish cooking ✓</button>') +
      '<button type="button" class="btn ghost" data-action="exit-cooking">View full recipe</button></div>' +
      '<p class="panel-note">Your step is saved on this device. Closing the recipe does not erase it.</p></div>';
  } else {
    const ingredientHtml = ingredientItems.length ? '<ul class="ingredient-list">' + measuredScore.availability.map((x,i) => {
      const enough = x.status === 'enough';
      const marker = enough ? '✓ ' : x.status === 'review' ? '? ' : '○ ';
      const item = prepared[i];
      const amount = item.value ? item.value + (item.status === 'review' ? ' · review scaling' : '') + ' · ' : '';
      return '<li class="' + (enough ? '' : 'missing') + '"><div class="ingredient-photo-cell" data-ingredient-photo="'+escapeHtml(x.name)+'">'+ingredientReference(x.name,ingredientPhotos)+'</div><div class="ingredient-details"><span class="ingredient-name">' + marker + escapeHtml(x.name) + '</span><span class="ingredient-stock">' + escapeHtml(amount + x.label) + '</span></div></li>';
    }).join('') + '</ul>' : '<p class="panel-note">Ingredient details unavailable for this recipe.</p>';
    const servingControls = '<section class="serving-panel" aria-label="Serving size"><div class="tag-heading"><strong>Serving size</strong>' +
      '<span class="panel-note">The original serving count must be confirmed by you.</span></div>' +
      '<form id="original-servings-form" class="serving-original-form"><label for="base-servings-input">Original recipe serves</label>' +
      '<input id="base-servings-input" name="baseServings" type="number" min="1" max="24" step="1" placeholder="Unknown" value="' + escapeHtml(originalServings || '') + '">' +
      '<button class="btn secondary small" type="submit">Save reference</button></form>' +
      (originalServings ? '<div class="serving-adjust"><span>Cook for</span>' +
        '<button class="btn secondary small" type="button" data-action="servings-minus"' + (targetServings <= 1 ? ' disabled' : '') + ' aria-label="Reduce servings">−</button>' +
        '<strong data-target-servings>' + targetServings + '</strong>' +
        '<button class="btn secondary small" type="button" data-action="servings-plus"' + (targetServings >= 24 ? ' disabled' : '') + ' aria-label="Increase servings">＋</button></div>' :
        '<p class="panel-note">Until the original count is confirmed, amounts remain exactly as written.</p>') +
      '<p class="panel-note">Only clear ingredient measurements can be scaled; seasoning, fractional whole items and instructions still need manual judgement. No ingredient changes are applied to your pantry.</p></section>';
    const recipeTags = tagsOf(savedEntry(meal.idMeal));
    const tagEditor = '<section class="recipe-tags" aria-label="My recipe labels"><div class="tag-heading"><strong>My labels</strong>' +
      '<span class="panel-note">Organise this recipe your way</span></div>' +
      '<div class="recipe-tag-list">' + (recipeTags.length ? recipeTags.map(tag =>
        '<span class="recipe-tag">' + escapeHtml(tag) + '<button type="button" data-action="remove-tag" data-id="' + escapeHtml(meal.idMeal) +
        '" data-tag="' + escapeHtml(tag) + '" aria-label="Remove label ' + escapeHtml(tag) + ' from ' + escapeHtml(meal.strMeal) + '">×</button></span>').join('') :
        '<span class="panel-note">No labels yet. Try Weeknight, Family or Meal prep.</span>') + '</div>' +
      '<form id="recipe-tag-form" class="tag-entry-form"><label class="visually-hidden" for="recipe-tag-input">Add a personal label</label>' +
      '<input id="recipe-tag-input" name="tag" maxlength="30" placeholder="Add a label…" aria-label="Add a personal label" required>' +
      '<button class="btn secondary small" type="submit">+ Add label</button></form></section>';
    const history = (Array.isArray(savedEntry(meal.idMeal).cookingHistory) ? savedEntry(meal.idMeal).cookingHistory : []).slice(0, 3);
    const journalHtml = history.length ? '<section class="cooking-journal"><h3>My cooking notes</h3>' +
      history.map(log => '<div class="cooking-log"><strong>' + escapeHtml(new Date(log.date).toLocaleDateString('en',{year:'numeric',month:'short',day:'numeric'})) +
      (log.rating ? ' · ' + log.rating + '/5 ★' : '') + '</strong>' +
      (log.note ? '<p>' + escapeHtml(log.note) + '</p>' : '<p>Cooked without a note.</p>') + '</div>').join('') + '</section>' : '';
    contents = '<div class="dialog-content"><div class="dialog-actions">' + actionButton('wanted',meal,'＋','Want to try') +
      actionButton('usual',meal,'↻','My usual dishes') + actionButton('favourite',meal,'♡','Favourite') +
      '<button type="button" class="btn secondary small" data-action="cook-done" data-id="' + escapeHtml(meal.idMeal) + '">✓ I cooked this' + (savedEntry(meal.idMeal).cookedCount ? ' (' + savedEntry(meal.idMeal).cookedCount + ')' : '') + '</button></div>' +
      (meal.strPersonal ? '<button class="btn secondary small" type="button" data-action="edit-recipe" data-id="' + escapeHtml(meal.idMeal) + '" style="margin-top:9px">✎ Edit my recipe</button>' : '') +
      '<p class="panel-note" style="margin-top:12px">* Estimates only. Check freshness, units and food safety before cooking.</p>' + '<form id="recipe-plan-form" class="recipe-plan-form"><div class="field"><label for="recipe-plan-day">Plan this recipe</label><select id="recipe-plan-day" name="day">'+nextSevenDates().map(d=>'<option value="'+d.key+'">'+escapeHtml(d.label+' · '+d.date)+'</option>').join('')+'</select></div><button class="btn secondary" type="submit">Add to plan</button></form>' + servingControls + tagEditor + '<div class="dialog-columns"><section><h3>Ingredients</h3><p class="panel-note" style="margin-bottom:14px">' + (ingredientItems.length ? measuredScore.have.length + ' of ' + ingredientItems.length + ' ingredient names in your kitchen. ' + (measuredScore.isQuantityConfirmed ? 'All listed amounts appear sufficient.*' : 'See amounts and stock checks below.*') + '' : 'Ingredients pending') + '</p>' + ingredientHtml +
      '</section><section><h3>How to make it</h3>' + (collectedRecipe(meal)?'<p class="panel-note">Cooking methods stay with the original author. Ingredient amounts above are shown as written; they are not automatically parsed or scaled.</p><a class="btn secondary" href="'+externalUrl(meal.strSource)+'" target="_blank" rel="noopener noreferrer">Open original cooking method ↗</a>':parts.length ? '<ol class="instruction-list">' + parts.map(t => '<li>' + escapeHtml(t) + '</li>').join('') + '</ol>' : '<p class="panel-note">Instructions unavailable.</p>') +
      (parts.length ? '<div class="dialog-actions" style="margin-top:20px"><button type="button" class="btn" data-action="start-cooking">' + (store.cookingSessions?.[meal.idMeal] ? 'Resume guided cooking →' : 'Start guided cooking →') + '</button>' +
      (store.cookingSessions?.[meal.idMeal] ? '<button type="button" class="btn secondary" data-action="restart-cooking">Start from the beginning</button>' : '') + '</div>' : '') +
      '</section></div>' + journalHtml + '<div style="margin-top:27px" class="note">' + (collectedRecipe(meal) ? 'Recipe metadata and ingredient facts from your selected publisher. Reference photographs are separately credited; they identify ingredients, not exact brands or amounts.' : meal.strPersonal ? 'This is your own saved recipe. Check cooking temperatures, allergens and food safety before eating.' : 'Community-contributed recipe and photography via TheMealDB. Regional categories are source labels, not certification of one definitive traditional method. Check allergens, temperatures and food safety independently.') + '</div></div>';
  }
  const original=collectedRecipe(meal);
  const publisher=original&&SOURCES.find(s=>s.id===original.source);
  const originalRating=original?.rating;
  const source = externalUrl(meal.strSource);
  const video = externalUrl(meal.strYoutube);
  const sourceLink = source ? '<a href="' + source + '" target="_blank" rel="noopener noreferrer" class="btn secondary small">Original source ↗</a>' : '';
  const videoLink = video && !meal.strPersonal ? '<a href="' + video + '" target="_blank" rel="noopener noreferrer" class="btn secondary small">Watch source video ↗</a>' : '';
  overlayRoot.innerHTML = '<div class="overlay" data-action="overlay" role="presentation"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">' +
    '<button class="dialog-close" data-action="close" type="button" aria-label="Close recipe">×</button>' +
    '<div class="dialog-hero">' + (externalUrl(meal.strMealThumb,!original) ? '<img data-recipe-photo class="dialog-photo" src="' + externalUrl(meal.strMealThumb,!original) + '" alt="' + escapeHtml(meal.strMeal) + '">' : '<div class="hero-placeholder">🍲</div>') +
    '<div class="dialog-intro"><div class="eyebrow">' + escapeHtml(meal.strArea || 'World cuisine') + ' · ' + escapeHtml(meal.strCategory || 'Home cooking') + '</div><h2 id="dialog-title">' + escapeHtml(meal.strMeal) + '</h2>' +
    '<p class="lead">Save your favourites and make your next meal yours.</p><div class="dialog-actions">' + sourceLink + videoLink +
    (meal.strPersonal ? '' : original ? '<a class="btn secondary small" href="'+source+'" target="_blank" rel="noopener noreferrer">Recipe: '+escapeHtml(publisher.name)+' ↗</a>' : '<button class="btn secondary small" type="button" data-action="copy-recipe-link">Copy recipe link ↗</button><a class="btn secondary small" href="https://www.themealdb.com/" target="_blank" rel="noopener noreferrer">Recipe data: TheMealDB ↗</a>') +
    '</div><p class="panel-note">' + (original ? escapeHtml(publisher.name)+' · Original publisher photograph. '+(originalRating?escapeHtml(originalRating.value)+' / '+escapeHtml(originalRating.best)+' · '+escapeHtml(originalRating.count??'Count not collected')+' '+escapeHtml(originalRating.countType||''):'Rating not collected') : meal.strPersonal ? (externalUrl(meal.strSource) ? 'Your personal adaptation · Original publisher linked. No third-party photo copied.' : 'Personal recipe written by you.') : 'Community-provided data and photography via TheMealDB. Cuisine, category and regional authenticity have not been independently verified.') + '</p></div></div>' + contents + '</section></div>';
  document.body.style.overflow = 'hidden';
  syncCookingTimer();
  if(showCookingLog)restoreFields(overlayRoot.querySelector('#cooking-log-form'),journalFields);
  if (focusedAction) {
    const nextFocus = [...overlayRoot.querySelectorAll('[data-action]')].find(node =>
      node.dataset.action === focusedAction && node.dataset.id === focusedId);
    nextFocus?.focus();
  }
}
function closeDialog({history=true}={}) {
  const wasOpen=Boolean(selectedMeal || openingMealId);
  if(wasOpen&&dialogReturnId)pendingResultFocus={id:dialogReturnId,kind:dialogReturnKind,href:dialogReturnHref};
  detailRequestNumber++;
  detailController?.abort();detailController=null;
  clearInterval(cookingTimerTicker);cookingTimerTicker=null;
  selectedMeal=null;openingMealId='';stepIndex=-1;showCookingLog=false;detailTargetServings=null;cookingStockSnapshot=[];
  overlayRoot.innerHTML='';document.body.style.overflow='';
  if(wasOpen) {
    if(dialogReturnFocus?.isConnected)dialogReturnFocus.focus({preventScroll:true});
    else if(dialogReturnId)document.querySelector('[data-action="open"][data-id="'+dialogReturnId+'"]')?.focus({preventScroll:true});
    else document.querySelector('.site-nav .active')?.focus({preventScroll:true});
  }
  dialogReturnFocus=null;dialogReturnId='';
  if(history && wasOpen) {
    if(window.history.state?.recipeOverlay)window.history.back();
    else writeRoute({replace:true});
  }
}
function recipeStatus(message,failed=false) {
  overlayRoot.innerHTML='<div class="overlay" data-action="overlay" role="presentation"><section class="dialog recipe-status" role="dialog" aria-modal="true" aria-labelledby="recipe-status-title">'+
    '<button class="dialog-close" data-action="close" type="button" aria-label="Close recipe">×</button><div class="dialog-content">'+
    '<h2 id="recipe-status-title">'+(failed?'Recipe unavailable':'Opening your recipe…')+'</h2><p role="status">'+escapeHtml(message)+'</p>'+
    (failed?'<button type="button" class="btn" data-action="retry-recipe" data-id="'+escapeHtml(openingMealId)+'">Try again</button>':'<div class="spinner" aria-hidden="true"></div>')+'</div></section></div>';
  document.body.style.overflow='hidden';
  overlayRoot.querySelector('.dialog-close')?.focus();
}
async function openMeal(id,{history=true,meal:provided}={}) {
  let possible=provided || findMeal(id);
  const request=++detailRequestNumber;
  detailController?.abort();
  const currentController=new AbortController();detailController=currentController;
  pendingResultFocus=null;
  if(!dialogReturnFocus){dialogReturnFocus=document.activeElement;dialogReturnId=document.activeElement?.dataset?.id||window.history.state?.returnRecipe||'';dialogReturnKind=document.activeElement?.matches?.('.recipe-title')?'recipe-title':window.history.state?.returnKind||'recipe-photo';dialogReturnHref=window.history.state?.recipeOverlay?window.history.state.returnHref||'':window.location.href;}
  openingMealId=id;selectedMeal=null;
  if(history)writeRoute({recipeOverlay:true});
  recipeStatus('Loading ingredients and instructions.');
  try {
    if(id.startsWith('selected-')&&!possible) {
      const records=await collectionLoader.load();
      const record=records.find(r=>'selected-'+r.id===id);if(record)possible=collectedMeal(validateRecipe(record));
    }
    if(id.startsWith('selected-')&&!collectedRecipe(possible))throw new Error('This collected recipe is unavailable. Reconnect or open a saved copy.');
    if(id.startsWith('personal-') && !possible)throw new Error('This personal recipe is not in this browser. Save, restore or sync it here first.');
    const meal=collectedRecipe(possible)||ingredientsOf(possible).length && possible.strInstructions?possible:await mealDetails(id,currentController.signal);
    if(request!==detailRequestNumber || currentController.signal.aborted)return;
    openingMealId='';selectedMeal=meal;
    if(store.saved[id]) {
      const saved={...store.saved,[id]:{...store.saved[id],meal}};
      if(persistStore({...store,saved}))store.saved=saved;
      else notice('Could not save updated recipe details. Your saved recipe is unchanged.');
    }
    stepIndex=-1;showCookingLog=false;
    detailTargetServings=validServings(store.saved[id]?.baseServings);
    renderDialog();overlayRoot.querySelector('.dialog-close')?.focus();
  } catch(error) {
    if(request!==detailRequestNumber || currentController.signal.aborted)return;
    recipeStatus(id.startsWith('personal-')?error.message:'Could not load this recipe. Check your connection and try again.',true);
  }
}
async function markRecipe(id, field, provided=null) {
  if(recipeMutations.has(id))return;
  recipeMutations.add(id);
  try {
  let meal = provided || (selectedMeal?.idMeal===id?selectedMeal:findMeal(id));
  if (!meal) return;
  if (!collectedRecipe(meal)&&(!ingredientsOf(meal).length || !meal.strInstructions)) {
    try { meal = await mealDetails(id); } catch { notice('Recipe details could not load. Try again.'); return; }
  }
  const entry = {...savedEntry(id),meal};
  if (field === 'cookedCount') entry.cookedCount = (Number(entry.cookedCount) || 0) + 1;
  else entry[field] = !entry[field];
  const saved = {...store.saved};
  if (flags(entry) || Object.values(store.plan).includes(id)) saved[id] = entry;
  else delete saved[id];
  if (!persistStore({...store,saved})) {
    notice('Could not save changes to this browser. Your cookbook is unchanged.'); return;
  }
  store.saved=saved;
  if (selectedMeal?.idMeal === id) selectedMeal = meal;
  render();
  notice(field === 'cookedCount' ? 'Added to your cooking history!' : 'Your cookbook is updated.');
  } finally { recipeMutations.delete(id); }
}

document.addEventListener('click', async event => {
  const nav = event.target.closest('[data-nav]');
  if (nav) { changeView(nav.dataset.nav); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  const personalMeal=button.closest('[data-personal-recipe]')?personalRecipeCards.get(id):null;
  if(action==='discovery-page'){discoveryChoice={...discoveryChoice,page:Number(button.dataset.page)};writeRoute();render();document.getElementById('discovery-page-status')?.focus({preventScroll:true});document.getElementById('discovery-results-title')?.scrollIntoView({block:'start'});return;}
  if(action==='remove-course'){void discover('filters',{course:''});return;}
  if(action==='meal-shortcut'){void discover('filters',{query:'',area:'',category:'',letter:'',scope:'collection',source:'',course:button.dataset.course,sort:'title',ratedOnly:false});return;}
  if(action==='recovery-retry'){Object.assign(store,loadStore());render();return;}
  if(action==='recovery-download'){downloadRecoveryCopy(recoveryViewRaw);return;}
  if(action==='recovery-download-preserved'){
    try{downloadRecoveryCopy(localStorage.getItem(RECOVERY_KEY));}catch{notice('Browser storage is unavailable.');}return;
  }
  if(action==='recovery-restore') {
    const expected=recoveryViewRaw,health=localStoreStatus();
    if(health.status!=='damaged'||health.raw!==expected||!health.lastGood){render();notice('The browser copy changed. Review it again.');return;}
    if(!window.confirm('Restore this saved recovery copy? The unreadable data will be preserved separately.'))return;
    if(!restoreLocalStore(health.lastGood.data,expected)){notice('Could not preserve and restore this copy. Nothing was replaced. Check available browser storage, then retry.');return;}
    Object.assign(store,loadStore());render();notice('Your recovery copy has been restored.');return;
  }
  if(action.startsWith('sync-')) {
    if(!cloudSync){notice('Cloud sync is not available yet.');return;}
    if(action==='sync-enable')await cloudSync.connect();
    if(action==='sync-now')await cloudSync.sync();
    if(action==='sync-off')cloudSync.disconnect();
    if(action==='sync-keep-local' && window.confirm('Replace the cloud copy with this browser’s complete copy?'))await cloudSync.resolve('local');
    if(action==='sync-keep-cloud' && window.confirm('Replace this browser’s complete copy with the cloud copy? Export a backup first if you want to keep both.'))await cloudSync.resolve('remote');
    if(action==='sync-remove' && window.confirm('Remove your cloud copy and turn sync off? Your records in this browser will stay.'))await cloudSync.removeCloud();
    return;
  }
  if(action==='offline-update') {
    if(!offlineState.registration?.waiting)return;
    if(!window.confirm('Reload to update Tasteit? Saved data stays. Unsaved form text may be lost.'))return;
    applyingUpdate=true;offlineState.registration.waiting.postMessage('TASTEIT_APPLY_UPDATE');return;
  }
  if (action === 'overlay') { if (event.target === button) closeDialog(); return; }
  if (action === 'close') { closeDialog(); return; }
  if(action==='taste-hide' || action==='taste-show-hidden') {
    const profile=store.tasteProfile||emptyTasteProfile();
    if(action==='taste-hide' && (!findMeal(id) || profile.hiddenRecipeIds.includes(id)))return;
    try {
      const next=createTasteProfile({...profile,hiddenRecipeIds:action==='taste-hide'?[...profile.hiddenRecipeIds,id]:[]});
      if(!persistStore({...store,tasteProfile:next})){notice('Could not save your taste preferences. Nothing changed.');return;}
      store.tasteProfile=next;render();
      document.getElementById('personal-suggestions-title')?.focus({preventScroll:true});
      notice(action==='taste-hide'?'Recipe skipped in suggestions. Your cookbook is unchanged.':'Skipped recipes are back in suggestions.');
    } catch(error){notice(error.message||'Could not update your taste preferences.');}
    return;
  }
  if(action==='home-collection') {
    libraryTab=button.dataset.tab==='usual'?'usual':'wanted';libraryTag='';librarySearch='';changeView('library');return;
  }
  if(action==='taste-collection') {
    libraryTab='all';libraryTag=button.dataset.tag||'';librarySearch='';
    changeView('library');return;
  }
  if (action === 'world-review-focus') {
    worldResearchFocus='country-category';
    worldResearchQuery='';worldResearchTag='';worldResearchStatus='all';worldResearchPage=0;
    if(!worldResearchEntries.length || !worldResearchOpen)await loadWorldResearch();
    else render();
    document.querySelector('.world-research')?.scrollIntoView({block:'start'});
    return;
  }
  if (action === 'world-research-load') { worldResearchPage=0; await loadWorldResearch(); return; }
  if (action === 'world-research-review') {
    const source=worldResearchEntries.find(x=>x.id===id);
    if(!source)return;
    if(worldMedia.sourceId!==source.id)worldMedia={sourceId:source.id,titles:[],selected:null,loading:false,error:''};
    worldResearchReviewId=source.id;render();
    document.getElementById('world-review-form')?.scrollIntoView({block:'nearest'});
    document.getElementById('review-country')?.focus();return;
  }
  if (action === 'world-review-close') {
    worldResearchReviewId='';worldMedia={sourceId:'',titles:[],selected:null,loading:false,error:''};
    render();return;
  }
  if (action === 'world-media-inspect') {
    const source=worldResearchEntries.find(x=>x.id===worldResearchReviewId);
    if(!source || worldMedia.loading)return;
    const id=source.id;
    worldMedia={sourceId:id,titles:[],selected:null,loading:true,error:''};
    redrawSourceMediaPanel();
    try{
      const titles=await sourceImageTitles(source.sourcePageId);
      if(worldResearchReviewId!==id || worldMedia.sourceId!==id)return;
      worldMedia={sourceId:id,titles,selected:null,loading:false,error:''};
    }catch(error){
      if(worldResearchReviewId!==id)return;
      worldMedia={sourceId:id,titles:[],selected:null,loading:false,
        error:'Could not inspect the Wikimedia source. Open its page manually or try again.'};
    }
    redrawSourceMediaPanel();return;
  }
  if (action === 'world-media-file') {
    const source=worldResearchEntries.find(x=>x.id===worldResearchReviewId);
    const title=button.dataset.title;
    if(!source || !worldMedia.titles.includes(title) || worldMedia.loading)return;
    const id=source.id;
    worldMedia={...worldMedia,loading:true,error:''};
    redrawSourceMediaPanel();
    try{
      const selected=await commonsFileMetadata(title);
      if(worldResearchReviewId!==id || worldMedia.sourceId!==id)return;
      worldMedia={...worldMedia,selected,loading:false,error:''};
    }catch{
      if(worldResearchReviewId!==id)return;
      worldMedia={...worldMedia,selected:null,loading:false,
        error:'Commons file metadata could not be retrieved. Verify the original file page manually.'};
    }
    redrawSourceMediaPanel();return;
  }
  if (action === 'world-review-delete') {
    if (!store.editorialReviews?.[id])return;
    const reviews=savedEditorialReview(store.editorialReviews,id,null);
    if (!persistStore({...store,editorialReviews:reviews})) {
      notice('Could not save the research deletion.');return;
    }
    store.editorialReviews=reviews;
    worldResearchReviewId='';render();notice('Research notes discarded.');return;
  }
  if (action === 'world-review-export') {
    const csv=exportEditorialReviewCsv(store.editorialReviews,worldResearchEntries);
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;
    link.download='tasteit-private-recipe-research.csv';
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);return;
  }
  if (action === 'world-research-prev' || action === 'world-research-next') {
    const q=worldResearchQuery.toLocaleLowerCase();
    const searched=researchLeadResults(worldResearchEntries,q,worldResearchEvidence,
      {tag:worldResearchTag,status:worldResearchStatus,reviews:store.editorialReviews});
    const count=buildResearchPriority(searched,worldResearchEvidence,{
      country:worldCountry,category:worldCategory,areas:worldAreas,
      reviews:store.editorialReviews,mode:worldResearchFocus
    }).length;
    const last=Math.max(0,Math.ceil(count/24)-1);
    worldResearchPage=Math.max(0,Math.min(last,worldResearchPage+(action==='world-research-next'?1:-1)));
    render();return;
  }
  if (action === 'world-scan') { await collectWorldRecipes(); return; }
  if (action === 'world-cancel') { worldScanController?.abort(); return; }
  if (action === 'world-export') { downloadWorldIndex(); return; }
  if (action === 'world-retry-options') { await loadWorldOptions(); return; }
  if (action === 'open') { await openMeal(id,personalMeal?{meal:personalMeal}:undefined); return; }
  if (action === 'retry-recipe') { await openMeal(id,{history:false}); return; }
  if (action === 'copy-recipe-link') {
    try { await navigator.clipboard.writeText(routeUrl(currentRoute(),window.location.href).href);notice('Recipe link copied.'); }
    catch { notice('Could not copy the link. You can copy it from your browser address bar.'); }
    return;
  }
  if (['wanted','usual','favourite'].includes(action)) { await markRecipe(id,action,personalMeal); return; }
  if (action === 'cook-done') { if (!selectedMeal || selectedMeal.idMeal !== id) return; stepIndex = -1; cookingStockSnapshot=consumptionReview(selectedMeal,store.pantry,savedEntry(id).baseServings,detailTargetServings); showCookingLog = true; renderDialog(); overlayRoot.querySelector('#cooking-rating')?.focus(); return; }
  if (action === 'cancel-cook-log') { showCookingLog = false; renderDialog(); return; }
  if (action === 'featured') { await discover(); return; }
  if(action==='surprise'&&discoveryChoice.scope!=='provider'){const choices=activeMeals.length?activeMeals:searchRecipeCollection(collectionRecords,store.saved,{});if(choices.length){const chosen=choices[Math.floor(Math.random()*choices.length)];void openMeal(chosen.idMeal,{meal:chosen});}else notice('Load a recipe collection first.');return;}
  if (action === 'surprise') {
    const intent=++detailRequestNumber;
    detailController?.abort();
    const pending=new AbortController();detailController=pending;
    const original=button.textContent;
    button.disabled=true;button.textContent='Finding a recipe…';
    try {
      const meal=await randomMeal(pending.signal);
      if(intent!==detailRequestNumber || pending.signal.aborted)return;
      await openMeal(meal.idMeal,{meal});
    } catch(error) { if(!pending.signal.aborted)notice('Could not load a surprise recipe. Try again.'); }
    finally {if(button.isConnected){button.disabled=false;button.textContent=original;}}
    return;
  }
  if (action === 'suggest') {
    if (!store.pantry.some(i => usablePantryItem(i))) { changeView('pantry'); notice('Add an available, unexpired ingredient to your kitchen first.'); return; }
    kitchenSelection = reconcileKitchenSelection(store.pantry,kitchenSelection);
    if (!kitchenSelection.length) kitchenSelection = initialKitchenSelection(store.pantry);
    kitchenDirty = false;
    await discover('pantry'); return;
  }
  if (action === 'kitchen-ingredient') {
    if (discoveryMode !== 'pantry') return;
    const key = button.dataset.key;
    if (!kitchenIngredientChoices(store.pantry).some(row=>row.key===key)) return;
    if (kitchenSelection.includes(key)) {
      if (kitchenSelection.length === 1) { notice('Keep at least one ingredient selected.'); return; }
      kitchenSelection = kitchenSelection.filter(x=>x!==key);
    } else {
      if (kitchenSelection.length >= MAX_KITCHEN_SEARCH) { notice('Choose up to four ingredients. Unselect one first.'); return; }
      kitchenSelection = [...kitchenSelection,key];
    }
    kitchenDirty = true; render(); return;
  }
  if (action === 'kitchen-readiness') {
    if (discoveryMode !== 'pantry') return;
    const requested = button.dataset.readiness;
    if (!['all','names','amounts'].includes(requested)) return;
    kitchenReadiness = requested; render(); return;
  }
  if (action === 'kitchen-more') { kitchenShowAll = !kitchenShowAll; render(); return; }
  if (action === 'kitchen-reset') {
    kitchenSelection = initialKitchenSelection(store.pantry); kitchenDirty = true;
    render(); return;
  }
  if (action === 'kitchen-update') {
    if (discoveryMode !== 'pantry' || !kitchenSelection.length) return;
    await discover('pantry'); return;
  }
  if (action === 'retry') { await discover('restore','',{history:false}); return; }
  if (action === 'remove-filter') {
    const key=button.dataset.filter;
    if(['query','area','category','letter'].includes(key))await discover('filters',{[key]:''});
    return;
  }
  if (action === 'collection') { libraryTab = button.dataset.value; render(); return; }
  if (action === 'tag-filter') { libraryTag = button.dataset.tag || ''; render(); return; }
  if (action === 'clear-library-filters') { libraryTag = ''; librarySearch = ''; libraryTab = 'all'; librarySort = 'name'; render(); return; }
  if (action === 'remove-tag') {
    const meal = store.saved[id]?.meal;
    if (!meal) return;
    const next = removeTag(store.saved[id], button.dataset.tag);
    const saved={...store.saved};
    if (flags(next) || Object.values(store.plan).includes(id)) saved[id]=next;
    else delete saved[id];
    if(!persistStore({...store,saved})) { notice('Could not save this label removal. Your cookbook is unchanged.'); return; }
    store.saved=saved; render(); notice('Label removed.'); return;
  }
  if (action === 'new-recipe') { showRecipeForm = true; editingRecipeId = null; libraryTab = 'all'; render(); document.getElementById('personal-title')?.focus(); return; }
  if (action === 'cancel-recipe') { showRecipeForm = false; editingRecipeId = null; render(); return; }
  if (action === 'edit-recipe') {
    if (!store.saved[id]?.meal?.strPersonal) return;
    closeDialog({history:false}); view = 'library'; writeRoute(); libraryTab = 'all'; showRecipeForm = true; editingRecipeId = id;
    render(); document.getElementById('personal-title')?.focus(); return;
  }
  if (action === 'export-data') {
    const blob = new Blob([exportBackup(store)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tasteit-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    notice('Backup downloaded. Keep it somewhere private.'); return;
  }
  if (action === 'bulk-open') { bulkOpen = true; bulkPreview = null; render(); document.getElementById('bulk-input')?.focus(); return; }
  if (action === 'bulk-close') { bulkOpen = false; bulkPreview = null; bulkDraft = ''; render(); return; }
  if (action === 'bulk-clear') { bulkDraft = ''; bulkPreview = null; render(); document.getElementById('bulk-input')?.focus(); return; }
  if (action === 'bulk-confirm') {
    if (!bulkPreview || bulkPreview.errors.length || !bulkPreview.items.length) return;
    const countBefore = store.pantry.length;
    try {
      const next = applyBulkPantry(store.pantry, bulkPreview, () => globalThis.crypto?.randomUUID?.() || String(Date.now()) + '-' + String(Math.random()).slice(2));
      if (next.length <= countBefore) { notice('All the items were already in your kitchen.'); return; }
      // Persist before updating the visible working state.
      if (!persistStore({ ...store, pantry:next })) { notice('Unable to save ingredients in this browser. No items were added.'); return; }
      store.pantry = next;
      const added = next.length - countBefore;
      bulkOpen = false; bulkDraft = ''; bulkPreview = null;
      render(); notice(added + ' ingredients added to your kitchen.');
    } catch(error) { notice(error.message || 'Unable to add these ingredients.'); }
    return;
  }
  if (action === 'add-batch') {
    const item = store.pantry.find(x=>x.id === id);
    if (!item) return;
    editingId = null; newBatchName = item.name;
    render(); document.getElementById('ingredient-name')?.focus(); return;
  }
  if (action === 'edit-pantry') { newBatchName = null; editingId = id; render(); document.getElementById('ingredient-name')?.focus(); return; }
  if (action === 'cancel-edit') { editingId = null; newBatchName = null; render(); return; }
  if (action === 'remove-pantry') {
    const next = store.pantry.filter(x => x.id !== id);
    if (!persistStore({ ...store, pantry:next })) { notice('Unable to save this change. No ingredient was removed.'); return; }
    store.pantry = next; if (editingId === id) editingId = null; newBatchName = null;
    render(); notice('Ingredient batch removed.'); return;
  }
  if (action === 'start-cooking' || action === 'restart-cooking') {
    if (!selectedMeal || !instructions(selectedMeal).length) return;
    const next = action === 'restart-cooking' ? safeCookingSession(null,instructions(selectedMeal).length) : currentCookingSession();
    if (!updateCookingSession(next)) return;
    stepIndex = next.step; timerCompletionNotified = null;
    renderDialog(); overlayRoot.querySelector('.cook-step')?.focus(); return;
  }
  if (action === 'step-back' || action === 'step-next') {
    if (!selectedMeal || stepIndex < 0) return;
    const next = moveCookingStep(currentCookingSession(),stepIndex+(action==='step-next'?1:-1),instructions(selectedMeal).length);
    if (!updateCookingSession(next)) return;
    stepIndex=next.step; renderDialog();
    overlayRoot.querySelector('.cook-step')?.focus(); return;
  }
  if (['timer-preset','timer-set','timer-start','timer-pause','timer-reset'].includes(action)) {
    if (!selectedMeal || stepIndex < 0) return;
    const total=instructions(selectedMeal).length;
    try {
      const current=currentCookingSession();
      const next=action==='timer-preset' ? setCookingTimer(current,button.dataset.minutes,total) :
        action==='timer-set' ? setCookingTimer(current,overlayRoot.querySelector('#cook-minutes')?.value,total) :
        action==='timer-start' ? startCookingTimer(current,total) :
        action==='timer-pause' ? pauseCookingTimer(current,total) :
        resetCookingTimer(current,total);
      if (!updateCookingSession(next)) return;
      timerCompletionNotified=null; renderDialog();
      const key=action==='timer-set' ? 'timer-set' : action;
      overlayRoot.querySelector('[data-action="'+key+'"]')?.focus();
    } catch(error) { notice(error.message || 'Unable to set cooking timer.'); }
    return;
  }
  if (action === 'exit-cooking') { stepIndex = -1; renderDialog(); return; }
  if (action === 'servings-minus' || action === 'servings-plus') {
    if (!selectedMeal) return;
    const original = validServings(savedEntry(selectedMeal.idMeal).baseServings);
    if (!original) return;
    const current = validServings(detailTargetServings) || original;
    detailTargetServings = Math.max(1,Math.min(24,current + (action === 'servings-plus' ? 1 : -1)));
    renderDialog(); return;
  }
  if(action==='shopping-receive') {
    const rows=purchaseReview(currentShoppingChecklist(),store.shoppingStocked);
    if(!rows.length){notice('Tick off food purchases first, then review them here.');return;}
    purchaseDraft={rows,id:globalThis.crypto?.randomUUID?.() || Date.now()+'-'+String(Math.random()).slice(2)};
    render();document.getElementById('purchase-review-title')?.scrollIntoView({block:'start'});document.getElementById('purchase-review-title')?.focus();return;
  }
  if(action==='shopping-receive-cancel') {purchaseDraft=null;render();return;}
  if(['leftover-use','leftover-more','leftover-remove'].includes(action)) {
    const row=store.leftovers.find(x=>x.id===id);if(!row)return;
    if(action==='leftover-remove' && !window.confirm('Remove this leftover record?'))return;
    const leftovers=action==='leftover-remove'?store.leftovers.filter(x=>x.id!==id):store.leftovers.map(x=>x.id===id?{...x,portions:Math.max(0,Math.min(100,x.portions+(action==='leftover-use'?-1:1)))}:x);
    if(!validKitchenState(undefined,leftovers) || !persistStore({...store,leftovers})) {notice('Could not save the leftover update. Nothing changed.');return;}
    store.leftovers=leftovers;render();notice('Leftover portions updated.');return;
  }
  if (action === 'shopping-remove-extra') {
    const next=removeShoppingExtra(store.shoppingExtras,id);
    if (!persistStore({...store,shoppingExtras:next})) { notice('Unable to save this shopping change.'); return; }
    store.shoppingExtras=next; render(); notice('Personal item removed.'); return;
  }
  if (action === 'copy-shopping') {
    const dates = nextSevenDates().map(x => x.key);
    const week = Object.fromEntries(dates.map(day => [day,store.plan[day]]).filter(([,v]) => v));
    const list = shoppingList(week,store.saved,store.pantry,store.planServings);
    const text = shoppingPlainText(shoppingChecklist(list,store.shoppingExtras,store.shoppingChecked));
    try { await navigator.clipboard.writeText(text); notice('Shopping list copied.'); }
    catch { notice('Clipboard is unavailable. Select and copy the shopping list manually.'); }
  }
});

document.addEventListener('toggle',event=>{if(event.target.id==='discovery-filter-panel')filtersOpen=event.target.open;},true);
document.addEventListener('input', event => {
  if(['taste-cuisines','taste-avoid'].includes(event.target.id)) {
    tasteDraft={cuisines:document.getElementById('taste-cuisines').value,avoidIngredients:document.getElementById('taste-avoid').value};
  }
  if(event.target.id==='recipe-search')queryDraft=event.target.value;
  if(['discover-cuisine','discover-category','discover-letter','discover-scope','discover-source','discover-course','discover-sort','discover-rated'].includes(event.target.id)) {
    filterDraft={...(filterDraft || currentRoute()),[event.target.name]:event.target.type==='checkbox'?event.target.checked:event.target.value};
    if(event.target.id==='discover-scope')render({preserveDialog:true});
  }
  if(event.target.id==='discover-cuisine')event.target.setCustomValidity('');
  if (event.target.id !== 'bulk-input') return;
  bulkDraft = event.target.value;
  if (bulkPreview) {
    bulkPreview = null;
    // Do not leave an outdated confirmation button active after the input changed.
    document.querySelector('.bulk-preview')?.remove();
  }
});

document.addEventListener('submit', event => {
  if(event.target.id==='taste-form') {
    event.preventDefault();
    try {
      const fields=Object.fromEntries(new FormData(event.target));
      const profile=createTasteProfile({...fields,hiddenRecipeIds:store.tasteProfile?.hiddenRecipeIds||[]});
      if(!persistStore({...store,tasteProfile:profile})){notice('Could not save your taste preferences. Your previous choices are unchanged.');return;}
      store.tasteProfile=profile;tasteDraft=null;render();
      document.getElementById('taste-form')?.querySelector('button[type=submit]')?.focus();
      notice('Your taste preferences are saved.');
    } catch(error){notice(error.message||'Check your taste preferences.');}
    return;
  }
  if(event.target.id==='purchase-review-form') {
    event.preventDefault();if(!purchaseDraft)return;
    const input=Object.fromEntries(new FormData(event.target));
    const selections=purchaseDraft.rows.flatMap((row,i)=>input['pick-'+i]?[{key:row.key,name:input['name-'+i],quantity:input['amount-'+i],unit:input['unit-'+i],location:input['location-'+i],expiry:input['expiry-'+i]}]:[]);
    try {
      const next=receivePurchases(store,purchaseDraft.rows,selections,purchaseDraft.id);
      if(!persistStore(next)){notice('Could not save purchases. Your kitchen is unchanged.');return;}
      store.pantry=next.pantry;store.shoppingStocked=next.shoppingStocked;purchaseDraft=null;
      render();notice('Reviewed purchases added as separate kitchen batches.');
    } catch(error) {notice(error.message || 'Could not add these purchases.');}
    return;
  }
  if(event.target.id==='recipe-plan-form') {
    event.preventDefault();if(!selectedMeal)return;const day=new FormData(event.target).get('day');
    if(store.plan[day]&&store.plan[day]!==selectedMeal.idMeal&&!window.confirm('Replace the recipe already planned for this day?'))return;
    try{const next=planRecipe(store,selectedMeal,day);if(!persistStore(next))throw Error('Could not save your plan. Nothing changed.');Object.assign(store,next);render();notice('Added to your meal plan.');}catch(error){notice(error.message);}return;
  }
  if(event.target.id==='discovery-filters') {
    event.preventDefault();
    const fields=Object.fromEntries(new FormData(event.target));
    const input=document.getElementById('discover-cuisine');
    const typed=String(fields.area||'').trim();
    const cuisine=cuisines.find(c=>c.toLowerCase()===typed.toLowerCase());
    if(typed && !cuisine && typed!==area) {
      input.setCustomValidity('Choose a cuisine from the suggestions, or leave it empty.');
      input.reportValidity();return;
    }
    void discover('filters',{...fields,ratedOnly:fields.ratedOnly==='on',area:cuisine==='All'?'':cuisine||typed});
    return;
  }
  if(event.target.id==='world-review-form'){
    event.preventDefault();
    const selected=worldResearchEntries.find(x=>x.id===worldResearchReviewId);
    if(!selected) return;
    const fields=Object.fromEntries(new FormData(event.target));
    try{
      const review=editorialReview(fields,{id:selected.id,
        countries:countryDirectory(worldAreas).map(x=>x.country),
        categories:worldCategories});
      const updates=savedEditorialReview(store.editorialReviews,selected.id,review);
      if(!persistStore({...store,editorialReviews:updates})){
        notice('Could not save research notes in this browser.');return;
      }
      store.editorialReviews=updates;render();notice('Private research notes saved. Recipe is not publicly approved.');
    }catch(error){notice(error.message||'Invalid research record.');}
    return;
  }
  if(event.target.id==='world-research-form'){
    event.preventDefault();
    const fields=new FormData(event.target);
    worldResearchQuery=String(fields.get('query')||'').trim().slice(0,100);
    worldResearchTag=String(fields.get('tag')||'').trim().slice(0,100);
    worldResearchStatus=String(fields.get('status')||'all');
    const focus=String(fields.get('priority')||'all');
    worldResearchFocus=TRIAGE_MODES.includes(focus)?focus:'all';
    if(!['all','unreviewed','researching','needs-evidence','shortlisted','rejected'].includes(worldResearchStatus))worldResearchStatus='all';
    worldResearchPage=0;
    render();document.getElementById('world-research-query')?.focus();return;
  }
  if (event.target.id === 'shopping-extra-form') {
    event.preventDefault();
    const name=String(new FormData(event.target).get('item')||'');
    try {
      const id='manual-' + (globalThis.crypto?.randomUUID?.() || Date.now() + '-' + String(Math.random()).slice(2));
      const extras=addShoppingExtra(store.shoppingExtras,name,id);
      if (!persistStore({...store,shoppingExtras:extras})) {
        notice('Could not save your shopping item. Nothing was added.'); return;
      }
      store.shoppingExtras=extras; render(); notice('Personal shopping item added.');
      document.getElementById('shopping-extra-input')?.focus();
    } catch(error) { notice(error.message || 'Could not add shopping item.'); }
    return;
  }
  if (event.target.id === 'original-servings-form') {
    event.preventDefault();
    if (!selectedMeal) return;
    const id=selectedMeal.idMeal;
    const input=new FormData(event.target).get('baseServings');
    try {
      const previous={...savedEntry(id),meal:selectedMeal};
      const nextEntry=setRecipeServings(previous,input);
      const nextSaved={...store.saved};
      const scheduled=Object.values(store.plan).includes(id);
      if (flags(nextEntry) || scheduled) nextSaved[id]=nextEntry;
      else delete nextSaved[id];
      const nextTargets={...store.planServings};
      for(const [day,plannedId] of Object.entries(store.plan)) {
        if(plannedId===id) delete nextTargets[day]; // Old target may be inappropriate for a new reference.
      }
      if(!persistStore({...store,saved:nextSaved,planServings:nextTargets})) {
        notice('Could not save this reference in your browser.'); return;
      }
      store.saved=nextSaved;
      store.planServings=nextTargets;
      detailTargetServings=validServings(nextEntry.baseServings);
      render(); notice(detailTargetServings ? 'Original serving count saved.' : 'Serving reference cleared.');
    } catch(error) { notice(error.message || 'Invalid serving count.'); }
    return;
  }
  if (event.target.id === 'cookbook-search-form') {
    event.preventDefault();
    librarySearch = String(new FormData(event.target).get('query') || '').trim();
    render();
    document.getElementById('cookbook-query')?.focus();
    return;
  }
  if (event.target.id === 'recipe-tag-form') {
    event.preventDefault();
    if (!selectedMeal) return;
    const raw = new FormData(event.target).get('tag');
    try {
      const id = selectedMeal.idMeal;
      const saved={...store.saved,[id]:addTag({ ...savedEntry(id), meal:selectedMeal },raw)};
      if(!persistStore({...store,saved})) { notice('Could not save this label. Your cookbook is unchanged.'); return; }
      store.saved=saved; render();
      overlayRoot.querySelector('#recipe-tag-input')?.focus();
      notice('Label saved on this recipe.');
    } catch (error) { notice(error.message || 'Could not save label.'); }
    return;
  }
  if (event.target.id === 'search-form') {
    event.preventDefault();
    const value = String(new FormData(event.target).get('query') || '').trim();
    void discover('search',value);
  }
  if (event.target.id === 'cooking-log-form') {
    event.preventDefault();
    if (!selectedMeal || !showCookingLog) return;
    const id=selectedMeal.idMeal,input=Object.fromEntries(new FormData(event.target));
    try {
      const deductions=cookingStockSnapshot.flatMap((row,i)=>input['use-'+i]?[{...row,used:input['used-'+i]}]:[]);
      const pantry=applyConsumption(store.pantry,deductions);
      const current={...savedEntry(id),meal:selectedMeal};
      const saved={...store.saved,[id]:recordCooking(current,input)};
      const sessions={...store.cookingSessions};delete sessions[id];
      let leftovers=store.leftovers;
      if(String(input.leftoverPortions||'').trim() && Number(input.leftoverPortions)!==0)leftovers=addLeftover(leftovers,{
        id:'leftover-'+(globalThis.crypto?.randomUUID?.() || Date.now()+'-'+String(Math.random()).slice(2)),mealId:id,name:selectedMeal.strMeal,
        portions:input.leftoverPortions,preparedAt:input.leftoverPrepared||nextSevenDates()[0].key,reminderDate:input.leftoverReminder||'',location:input.leftoverLocation||'Fridge'});
      if(!persistStore({...store,saved,cookingSessions:sessions,pantry,leftovers})) {
        notice('Unable to save cooking experience. Your kitchen, leftovers and in-progress steps are unchanged.');return;
      }
      store.saved=saved;store.cookingSessions=sessions;store.pantry=pantry;store.leftovers=leftovers;
      showCookingLog=false;stepIndex=-1;cookingStockSnapshot=[];
      render();notice('Cooking journal and confirmed kitchen updates saved.');
    } catch(error) {notice(error.message || 'Could not save cooking notes.');}
    return;
  }
  if (event.target.id === 'personal-recipe-form') {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    const id = editingRecipeId || ('personal-' + (globalThis.crypto?.randomUUID?.() || Date.now() + '-' + String(Math.random()).slice(2)));
    try {
      const meal = createPersonalMeal(data,id);
      const previous = store.saved[id] || { wanted:false, usual:true, favourite:false, cookedCount:0 };
      const updated=setRecipeServings({...previous,meal,usual:true},data.baseServings);
      const nextSaved={...store.saved,[id]:updated};
      const targets={...store.planServings};
      for(const [day,plannedId] of Object.entries(store.plan)) if(plannedId===id) delete targets[day];
      if(!persistStore({...store,saved:nextSaved,planServings:targets})) {
        notice('Unable to save the recipe in this browser.'); return;
      }
      store.saved=nextSaved;
      store.planServings=targets;
      showRecipeForm = false; editingRecipeId = null; libraryTab = 'all';
      render(); notice('Your personal recipe has been saved.');
    } catch (error) { notice(error.message); }
    return;
  }
  if (event.target.id === 'bulk-pantry-form') {
    event.preventDefault();
    bulkDraft = String(new FormData(event.target).get('bulk') || '');
    bulkPreview = parseBulkPantry(bulkDraft, store.pantry);
    render();
    document.querySelector('.bulk-preview')?.scrollIntoView({block:'nearest'});
    return;
  }
  if (event.target.id === 'pantry-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    const name = String(form.get('name') || '').trim();
    if (!name) return;
    const duplicate = store.pantry.some(x => normalizeIngredient(x.name) === normalizeIngredient(name) && x.id !== editingId);
    if (duplicate && (!newBatchName || normalizeIngredient(name) !== normalizeIngredient(newBatchName))) { notice('Already recorded. Use ＋ beside the ingredient to add a separate batch.'); return; }
    const current = store.pantry.find(x => x.id === editingId);
    const item = {
      id: current?.id || globalThis.crypto?.randomUUID?.() || String(Date.now()) + '-' + String(Math.random()).slice(2),
      name, quantity: String(form.get('quantity') || '').trim(), unit: String(form.get('unit') || 'pcs'),
      location: String(form.get('location') || 'Pantry'), expiry: String(form.get('expiry') || '')
    };
    const next = editingId ? store.pantry.map(x => x.id === editingId ? item : x) : [...store.pantry,item];
    if (!persistStore({ ...store, pantry:next })) { notice('Unable to save this change. Your kitchen was not modified.'); return; }
    store.pantry = next; editingId = null; newBatchName = null;
    render(); notice('Kitchen inventory updated.');
  }
});

document.addEventListener('change', async event => {
  if(event.target.matches('[data-world-country]')){
    const selected=event.target.value;
    if(countryDirectory(worldAreas).some(x=>x.country===selected)){worldCountry=selected;render();}
    return;
  }
  if(event.target.matches('[data-world-category]')){
    if(worldCategories.includes(event.target.value)){worldCategory=event.target.value;render();}
    return;
  }
  const manual = event.target.closest('[data-shopping-extra]');
  if (manual) {
    const key=manual.dataset.shoppingExtra;
    if(!store.shoppingExtras.some(x=>x.id===key)) return;
    const updated=toggleShoppingExtra(store.shoppingExtras,key);
    if(!persistStore({...store,shoppingExtras:updated})) { notice('Could not save shopping progress.'); render(); return; }
    store.shoppingExtras=updated; render(); return;
  }
  const planned = event.target.closest('[data-shopping-recipe]');
  if (planned) {
    const days=nextSevenDates().map(x=>x.key);
    const week=Object.fromEntries(days.map(day=>[day,store.plan[day]]).filter(([,v])=>v));
    const ingredient=shoppingList(week,store.saved,store.pantry,store.planServings)
      .find(item=>shoppingKey(item)===planned.dataset.shoppingRecipe);
    if(!ingredient) { render(); return; }
    const checked=toggleRecipeChecked(store.shoppingChecked,ingredient);
    if(!persistStore({...store,shoppingChecked:checked})) { notice('Could not save shopping progress.'); render(); return; }
    store.shoppingChecked=checked; render(); return;
  }
  if (event.target.matches('[data-library-sort]')) {
    librarySort = event.target.value;
    render();
    document.getElementById('cookbook-sort')?.focus();
    return;
  }
  if (event.target.id === 'backup-file') {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('Backup is too large (max 2 MB).');
      const expectedRecovery=recoveryViewRaw;
      const restored = parseBackup(await file.text());
      const yes = window.confirm('Import this backup? Your current Tasteit recipes, kitchen and plans in this browser will be replaced.');
      if (!yes) return;
      if (!(expectedRecovery!==null?restoreLocalStore(restored,expectedRecovery):persistStore(restored))) throw new Error('The backup could not be saved or the browser copy changed. Your previous data is unchanged.');
      store.pantry = restored.pantry;
      store.saved = restored.saved;
      store.plan = restored.plan;
      store.planServings = restored.planServings || {};
      store.cookingSessions = restored.cookingSessions || {};
      store.shoppingChecked = restored.shoppingChecked || {};
      store.shoppingExtras = restored.shoppingExtras || [];
      store.editorialReviews = restored.editorialReviews || {};
      store.shoppingStocked = restored.shoppingStocked || {};
      store.leftovers = restored.leftovers || [];
      store.tasteProfile = restored.tasteProfile || emptyTasteProfile();tasteDraft=null;
      showRecipeForm = false; editingRecipeId = null;
      render(); notice('Your Tasteit backup has been restored.');
    } catch (error) { notice(error.message || 'Import failed.'); }
    finally { event.target.value = ''; }
    return;
  }
  const servingInput = event.target.closest('[data-plan-servings]');
  if (servingInput) {
    const day = servingInput.dataset.planServings;
    const chosen = validServings(servingInput.value);
    const ref = validServings(store.saved[store.plan[day]]?.baseServings);
    if (!chosen || !ref) { notice('Enter between 1 and 24 servings after confirming the recipe reference.'); render(); return; }
    const next = { ...store.planServings, [day]:chosen };
    if (!persistStore({ ...store, planServings:next })) { notice('Could not save servings in this browser.'); render(); return; }
    store.planServings = next; render(); notice('Meal servings updated.'); return;
  }
  const select = event.target.closest('[data-plan-day]');
  if (!select) return;
  const day = select.dataset.planDay;
  const id = select.value;
  const nextPlan = {...store.plan};
  const nextServings = {...store.planServings};
  if (id && store.saved[id]?.meal) nextPlan[day] = id;
  else delete nextPlan[day];
  delete nextServings[day]; // Avoid applying a prior recipe's portion preference.
  if (!persistStore({...store,plan:nextPlan,planServings:nextServings})) {
    notice('Could not save the meal plan. Nothing was changed.'); render(); return;
  }
  store.plan = nextPlan; store.planServings = nextServings;
  render(); notice('Meal plan updated.');
});

// Keep the original photograph when available, but never replace a failed
// third-party image with an unrelated stock picture or invented meal photo.
document.addEventListener('error', event => {
  const node = event.target;
  if (!(node instanceof HTMLImageElement))return;
  if(node.closest('.ingredient-reference')){const fallback=document.createElement('span');fallback.className='ingredient-photo-missing';fallback.textContent='Photo unavailable';node.replaceWith(fallback);return;}
  if (!node.matches('[data-recipe-photo]')) return;
  const placeholder = document.createElement('div');
  placeholder.className = node.classList.contains('dialog-photo')
    ? 'image-unavailable dialog-photo-unavailable' : 'card-picture-fallback image-unavailable';
  placeholder.setAttribute('role','img');
  placeholder.setAttribute('aria-label','Photograph unavailable for ' + (node.alt || 'this recipe'));
  placeholder.textContent = '🍲';
  node.replaceWith(placeholder);
}, true);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && (selectedMeal || openingMealId)) { closeDialog(); return; }
  if (selectedMeal && stepIndex >= 0 && ['ArrowLeft','ArrowRight'].includes(event.key) &&
      !event.altKey && !event.ctrlKey && !event.metaKey &&
      !event.target.closest('input,textarea,select,[contenteditable="true"]')) {
    event.preventDefault();
    const next = moveCookingStep(currentCookingSession(),stepIndex+(event.key==='ArrowRight'?1:-1),instructions(selectedMeal).length);
    if (!updateCookingSession(next)) return;
    stepIndex=next.step; renderDialog(); overlayRoot.querySelector('.cook-step')?.focus(); return;
  }
  if (event.key !== 'Tab' || (!selectedMeal && !openingMealId)) return;
  const elements = [...overlayRoot.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')].filter(x => x.getClientRects().length > 0);
  if (!elements.length) return;
  const first = elements[0], last = elements[elements.length - 1];
  if (!overlayRoot.contains(document.activeElement)) {
    event.preventDefault(); first.focus(); return;
  }
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

window.addEventListener('storage', event => {
  if(event.key===SYNC_KEY||event.key===SYNC_META_KEY){void cloudSync?.refresh();return;}
  if (event.key !== 'tasteit.local.v1') return;
  const fresh = loadStore();
  store.pantry = fresh.pantry;
  store.saved = fresh.saved;
  store.plan = fresh.plan;
  store.planServings = fresh.planServings;
  store.cookingSessions = fresh.cookingSessions;
  store.shoppingChecked = fresh.shoppingChecked;
  store.shoppingExtras = fresh.shoppingExtras;
  store.editorialReviews = fresh.editorialReviews;
  store.shoppingStocked = fresh.shoppingStocked;
  store.leftovers = fresh.leftovers;
  store.tasteProfile = fresh.tasteProfile;tasteDraft=null;
  render();
});

// Start application.
void loadIngredientReferences();
cloudSync=createCloudSync({readLocal:()=>readStoreStrict(),readMeta:()=>JSON.parse(localStorage.getItem(SYNC_META_KEY)||'null'),
  writeMeta:data=>{try{localStorage.setItem(SYNC_META_KEY,JSON.stringify(data));return true;}catch{return false;}},
  readConsent:()=>localStorage.getItem(SYNC_KEY),
  writeConsent:value=>{try{if(value===null)localStorage.removeItem(SYNC_KEY);else localStorage.setItem(SYNC_KEY,value);return true;}catch{return false;}},
  writeLocal:data=>{
    if(selectedMeal||openingMealId||showRecipeForm||editingId||bulkOpen||purchaseDraft||tasteDraft)throw new Error('Close the recipe or finish your current editor, then press Sync now. Your local copy is unchanged.');
    const fields=captureFields(document.getElementById('pantry-form')),search=captureFields(document.getElementById('cookbook-search-form'));
    const focus=document.activeElement?.id;
    applyingCloud=true;
    try {
      if(!persistStore(data))return false;
      Object.assign(store,data);render();
      restoreFields(document.getElementById('pantry-form'),fields);restoreFields(document.getElementById('cookbook-search-form'),search);
      document.getElementById(focus)?.focus({preventScroll:true});return true;
    } finally {applyingCloud=false;}
  },onState:state=>{syncState=state;updateConnectionUI();}});
syncState=cloudSync.state;
window.addEventListener('tasteit:local-change',()=>{if(!applyingCloud)cloudSync.changed();});
window.addEventListener('online',()=>{updateConnectionUI();void cloudSync.sync();if(view==='discover'&&!selectedMeal&&!openingMealId)void discover('restore','',{history:false});});
window.addEventListener('offline',()=>{updateConnectionUI();void cloudSync.sync();if(view==='discover'&&!selectedMeal&&!openingMealId)void discover('restore','',{history:false});});
window.addEventListener('focus',()=>{void cloudSync.sync();});
if(syncState.status!=='off')void cloudSync.sync();
void installOffline(state=>{offlineState=state;updateConnectionUI();});
navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(applyingUpdate)window.location.reload();});
window.addEventListener('popstate',()=>void restoreRoute(readRoute(window.location.href)));
window.history.replaceState({tasteit:true,recipeOverlay:false,scrollY:0},'',window.location.href);
void restoreRoute(readRoute(window.location.href));

availableAreas().then(areas => {
  if (!areas.length) return;
  providerCuisines=areas;cuisines=recipeCuisineOptions(providerCuisines,collectionRecords,store.saved);
  if (view === 'discover') render({preserveDialog:true});
}).catch(() => { /* Keep fallback cuisines when the area endpoint is unavailable. */ });
availableCategories().then(values => {
  if (!values.length) return;
  categories = ['All', ...values];
  if (view === 'discover') render({preserveDialog:true});
}).catch(() => { /* Keep fallback meal categories when the endpoint is unavailable. */ });
