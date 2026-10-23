import { loadStore, persistStore, normalizeIngredient, ingredientsOf, analyseMeal, shoppingList, nextSevenDates, usablePantryItem, exportBackup, parseBackup, createPersonalMeal, recordCooking } from './model.js';
import { featured, searchMeals, cuisineMeals, categoryMeals, mealDetails, pantryCandidates, availableAreas, availableAreaRecords, availableCategories, letterMeals, randomMeal, scanWorldRecipes } from './api.js';
import { parseBulkPantry, applyBulkPantry } from './pantry-bulk.js';
import { dateStatus, expiringBatches, recipeUseSoon, rankByKitchen } from './pantry-batches.js';
import { validServings, scaledIngredients, scaledRecipeForComparison, setRecipeServings, resolvePlanServings } from './servings.js';
import { kitchenIngredientChoices, initialKitchenSelection, reconcileKitchenSelection, searchPantryRows, kitchenMatchDetails, localKitchenRecipes, combineKitchenRecipes, filterKitchenRecipes, MAX_KITCHEN_SEARCH } from './kitchen-discovery.js';
import { recipeSteps, safeCookingSession, timerStatus, moveCookingStep, setCookingTimer, startCookingTimer, pauseCookingTimer, resetCookingTimer } from './cooking.js';
import { addShoppingExtra, removeShoppingExtra, toggleShoppingExtra, toggleRecipeChecked, shoppingChecklist, shoppingPlainText, shoppingKey } from './shopping.js';
import { countryDirectory, catalogueFromProvider, catalogueCell, exportCatalogueIndex, hydrateCatalogueIndex, CATALOGUE_TARGET } from './world-catalogue.js';
import { editorialReview, savedEditorialReview, researchReviewSummary, researchLeadResults, exportEditorialReviewCsv } from './editorial.js';
import { addTag, removeTag, tagsOf, collectionTags, filterCookbook } from './organise.js';

const appRoot = document.getElementById('app');
const overlayRoot = document.getElementById('overlay-root');
const toastRoot = document.getElementById('toast');
const store = loadStore();

let cuisines = ['All', 'Italian', 'Indian', 'Japanese', 'Mexican', 'Moroccan', 'Thai', 'Turkish', 'Chinese', 'British', 'American', 'Greek', 'French', 'Vietnamese'];
let categories = ['All', 'Chicken', 'Seafood', 'Vegetarian', 'Pasta', 'Dessert', 'Vegan'];
let view = 'discover';
let activeMeals = [];
let loading = true;
let problem = '';
let area = 'All';
let category = 'All';
let browseLetter = '';
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
let bulkOpen = false;
let bulkDraft = '';
let bulkPreview = null;
let searchTerm = '';
let discoveryMode = 'featured';
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
let worldResearchReviewId='';

let libraryTab = 'all';
let libraryTag = '';
let librarySearch = '';
let librarySort = 'name';
let selectedMeal = null;
let stepIndex = -1;
let showCookingLog = false;
let detailTargetServings = null;
let editingId = null;
let newBatchName = null;
let showRecipeForm = false;
let editingRecipeId = null;
let requestNumber = 0;
let controller = null;
let toastTimer = null;
let dialogReturnFocus = null;
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
function save() {
  const saved = persistStore(store);
  if (!saved) notice('Could not save changes to this browser. Check privacy or storage settings.');
  return saved;
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
function changeView(next) {
  view = next;
  updateNav();
  closeDialog();
  render();
  window.scrollTo({top:0,behavior:'instant'});
  if (next==='world' && !worldAreas.length && !worldLoadingOptions) void loadWorldOptions();
}
async function loadWorldOptions() {
  worldLoadingOptions=true;worldOptionsError='';
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
        worldScan={completed:26,total:26};
        worldPartial=Array.isArray(snapshot.failedInitials)?snapshot.failedInitials:[];
        worldScannedAt=String(snapshot.scannedAt||'');
        worldAreas=restored.countries.flatMap(c=>c.areas.map(area=>({strCountry:c.country,strArea:area})));
        worldCategories=restored.categories;
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


async function discover(mode = 'featured', value = '') {
  requestNumber += 1;
  const thisRequest = requestNumber;
  controller?.abort();
  controller = new AbortController();
  view = 'discover';
  discoveryMode = mode;
  loading = true;
  problem = '';
  searchTerm = mode === 'search' ? value : '';
  area = mode === 'area' ? value : 'All';
  category = mode === 'category' ? value : 'All';
  browseLetter = mode === 'letter' ? value : '';
  updateNav();
  render();
  try {
    let meals;
    if (mode === 'search') meals = await searchMeals(value, controller.signal);
    else if (mode === 'area') meals = await cuisineMeals(value, controller.signal);
    else if (mode === 'category') meals = await categoryMeals(value, controller.signal);
    else if (mode === 'letter') meals = await letterMeals(value, controller.signal);
    else if (mode === 'pantry') {
      // Query only the user-chosen ingredient names, not arbitrary first entries.
      kitchenSelection = reconcileKitchenSelection(store.pantry,kitchenSelection);
      if (!kitchenSelection.length) kitchenSelection = initialKitchenSelection(store.pantry);
      const picked = searchPantryRows(store.pantry,kitchenSelection);
      const local = localKitchenRecipes(store.saved,store.pantry);
      const remote = await pantryCandidates(picked, controller.signal);
      meals = rankByKitchen(combineKitchenRecipes(remote,local),store.pantry);
    } else meals = await featured(controller.signal);
    if (thisRequest !== requestNumber) return;
    activeMeals = meals;
    if (mode === 'pantry') kitchenDirty = false;
  } catch (error) {
    if (thisRequest !== requestNumber || error?.name === 'AbortError') return;
    activeMeals = [];
    problem = 'Recipes could not load. Check your internet connection and try again.';
  } finally {
    if (thisRequest === requestNumber) { loading = false; render(); }
  }
}

function photo(meal) {
  const url = externalUrl(meal?.strMealThumb, true);
  return url ? '<img data-recipe-photo src="' + url + '" alt="' + escapeHtml(meal.strMeal) + '" loading="lazy" referrerpolicy="no-referrer">' : '<div class="card-picture-fallback" aria-hidden="true">🍲</div>';
}
function card(meal, kitchenExplanation = false) {
  const id = escapeHtml(meal.idMeal);
  const entry = savedEntry(meal.idMeal);
  const analysis = ingredientsOf(meal).length && store.pantry.length ? analyseMeal(meal, store.pantry) : null;
  const useSoon = analysis && recipeUseSoon(meal,store.pantry);
  const region = meal.strArea || 'World kitchen';
  const category = meal.strCategory || 'Recipe';
  const isSaved = Boolean(entry.wanted);
  const isPersonal = Boolean(meal.strPersonal);
  const kitchenInfo = kitchenExplanation ? kitchenMatchDetails(meal,store.pantry) : null;
  const reason = kitchenInfo ? '<div class="kitchen-match-reason"><strong>' + escapeHtml(kitchenInfo.explanation) + '</strong>' +
    (kitchenInfo.missing.length ? '<span>Missing: ' + escapeHtml(kitchenInfo.missing.slice(0,3).join(', ')) +
      (kitchenInfo.missing.length > 3 ? ' +' + (kitchenInfo.missing.length-3) + ' more' : '') + '</span>' :
      kitchenInfo.needReview.length ? '<span>Check amounts: ' + escapeHtml(kitchenInfo.needReview.slice(0,2).join(', ')) + '</span>' :
      '<span>Check amounts, freshness and dietary suitability before cooking.</span>') + '</div>' : '';
  return '<article class="recipe-card">' +
    '<button type="button" class="recipe-photo" data-action="open" data-id="' + id + '" aria-label="View recipe for ' + escapeHtml(meal.strMeal) + '">' +
    photo(meal) + (analysis ? '<span class="mini-pill">' + (useSoon.length ? 'Use soon: ' + escapeHtml(useSoon.slice(0,2).join(', ')) : analysis.isQuantityConfirmed ? 'Amounts confirmed*' : analysis.percent + '% names on hand*') + '</span>' : '<span class="mini-pill">' + escapeHtml(region) + '</span>') + '</button>' +
    '<div class="recipe-body"><button type="button" class="recipe-title" data-action="open" data-id="' + id + '">' + escapeHtml(meal.strMeal) + '</button>' +
    '<div class="recipe-meta"><span>' + escapeHtml(region) + '</span><span>·</span><span>' + escapeHtml(category) + '</span></div>' +
    reason + '<div class="card-bottom"><span class="source-line">' + (isPersonal ? 'YOUR RECIPE' : 'PHOTO · THEMEALDB') + '</span>' +
    '<button type="button" class="quick-save' + (isSaved ? ' saved' : '') + '" data-action="wanted" data-id="' + id + '" aria-pressed="' + isSaved + '">' + (isSaved ? '✓ Want to try' : '+ Want to try') + '</button></div></div></article>';
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

function discoverPage() {
  const spotlight = activeMeals.find(x => externalUrl(x.strMealThumb, true));
  const heroPhoto = spotlight ? photo(spotlight) : '<div class="hero-placeholder" aria-hidden="true">🍝</div>';
  const label = discoveryMode === 'pantry' ? 'Ideas from your kitchen' : discoveryMode === 'area' ? area + ' recipes' : discoveryMode === 'category' ? category + ' recipes' : discoveryMode === 'search' ? 'Search results' : discoveryMode === 'letter' ? 'Recipes beginning with ' + browseLetter.toUpperCase() : 'Discover something delicious';
  const title = discoveryMode === 'pantry' ? 'Cook with what you <strong>have.</strong>' : 'A whole world of <strong>good food.</strong>';
  const countSaved = Object.values(store.saved).filter(flags).length;
  const nextToTry = rankByKitchen(Object.values(store.saved).filter(entry => entry.wanted && entry.meal).map(entry => entry.meal),store.pantry).slice(0,4);
  const chips = cuisines.map(c => '<button type="button" class="chip' + (area === c && (discoveryMode === 'area' || (c === 'All' && discoveryMode === 'featured')) ? ' selected' : '') +
    '" data-action="area" data-area="' + escapeHtml(c) + '" aria-pressed="' + (area === c && (discoveryMode === 'area' || (c === 'All' && discoveryMode === 'featured'))) + '">' + escapeHtml(c) + '</button>').join('');
  const courseChips = categories.map(c => '<button type="button" class="chip' + (category === c && discoveryMode === 'category' ? ' selected' : '') + '" data-action="course" data-course="' + escapeHtml(c) + '" aria-pressed="' + (category === c && discoveryMode === 'category') + '">' + escapeHtml(c) + '</button>').join('');
  const letterChips = alphabet.map(l => '<button type="button" class="chip' + (browseLetter.toUpperCase() === l && discoveryMode === 'letter' ? ' selected' : '') + '" data-action="letter" data-letter="' + l + '" aria-pressed="' + (browseLetter.toUpperCase() === l && discoveryMode === 'letter') + '">' + l + '</button>').join('');
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
  const visibleMeals = discoveryMode === 'pantry'
    ? filterKitchenRecipes(activeMeals,store.pantry,kitchenReadiness) : activeMeals;
  const kitchenReadinessChips = discoveryMode === 'pantry'
    ? '<div class="kitchen-readiness" role="group" aria-label="Filter recipes by kitchen ingredient availability">' +
      [['all','All ideas'],['names','All ingredient names on hand'],['amounts','Measured amounts appear sufficient']].map(([key,label]) =>
        '<button type="button" class="chip' + (kitchenReadiness === key ? ' selected' : '') +
        '" data-action="kitchen-readiness" data-readiness="' + key + '" aria-pressed="' +
        (kitchenReadiness === key) + '">' + label + '</button>').join('') +
      '<p class="panel-note" role="status">Showing ' + visibleMeals.length + ' of ' + activeMeals.length +
      ' suggestions. These are inventory estimates, not confirmation of food safety or allergy suitability.</p></div>' : '';
  const currentResults = loading ? loadingBox() : problem ? '<div class="alert">' + escapeHtml(problem) + '<button class="btn small" type="button" data-action="retry">Try again</button></div>' :
    visibleMeals.length ? cards(visibleMeals, discoveryMode === 'pantry') :
    (discoveryMode === 'pantry' && activeMeals.length ? empty('🥕', 'Nothing meets that match filter', 'Try All ideas, or add the missing ingredients to your kitchen.', '<button class="btn" type="button" data-action="kitchen-readiness" data-readiness="all">Show all ideas</button>') : empty('🔎', 'No recipes found', 'Try a different dish name, cuisine or kitchen ingredient.', '<button class="btn" type="button" data-action="featured">Explore popular dishes</button>'));
  return '<section class="hero"><div class="hero-copy"><div class="eyebrow">YOUR PERSONAL RECIPE UNIVERSE</div><h1>' + title + '</h1>' +
    '<p class="lead">Discover food from different cultures, collect your favourite meals, and find inspiration in the ingredients you already own.</p>' +
    '<form id="search-form" class="search-bar" role="search"><span class="search-icon" aria-hidden="true">⌕</span><input id="recipe-search" name="query" aria-label="Search recipe names" placeholder="Search biryani, pasta, curry..." value="' + escapeHtml(searchTerm) + '" required><button class="btn" type="submit">Find recipes ↗</button></form>' +
    '</div><div class="hero-visual">' + heroPhoto + (spotlight ? '<div class="photo-tag"><span class="spark">✳ ON THE MENU</span><b>' + escapeHtml(spotlight.strMeal) + '</b><span>Photograph: TheMealDB contributors</span></div>' : '') + '</div></section>' +
    '<div class="feature-strip">' +
    '<button type="button" class="feature-card" data-nav="pantry"><span class="feature-icon" aria-hidden="true">🥕</span><div><b>My kitchen</b><span>' + store.pantry.length + ' ingredients in stock</span></div></button>' +
    '<button type="button" class="feature-card" data-nav="library"><span class="feature-icon" aria-hidden="true">♡</span><div><b>My cookbook</b><span>' + countSaved + ' saved or cooked recipes</span></div></button>' +
    '<button type="button" class="feature-card" data-action="suggest"><span class="feature-icon" aria-hidden="true">✦</span><div><b>What can I make?</b><span>Find recipes using my ingredients</span></div></button></div>' +
    (nextToTry.length ? '<section class="section"><div class="section-head"><div><div class="eyebrow">PICKED BY YOU</div><h2>Next on your menu</h2><p>Saved dishes to try, prioritising confirmed available amounts, then ingredient overlap.</p></div><button class="btn ghost small" type="button" data-nav="library">See all →</button></div>' + cards(nextToTry) + '</section>' : '') +
    '<section class="section"><div class="section-head"><div><div class="eyebrow">DISCOVER</div><h2>' + escapeHtml(label) + '</h2><p>' + (discoveryMode === 'pantry' ? 'Sorted by ingredient-name overlap; exact amounts are checked where measurements are clear.' : 'Explore dishes, stories and ideas from TheMealDB.') + '</p></div>' +
    '<span class="source-line">' + (loading ? 'LOADING' : activeMeals.length + ' RECIPES') + '</span></div>' +
    '<div class="browse-filters"><div class="filter-heading">Browse by cuisine <span>Provider region labels</span></div><div class="chips" aria-label="Browse recipes by cuisine">' + chips + '</div>' +
    '<div class="filter-heading">Browse by meal type <span>Provider categories, not verified diet or allergy information</span></div><div class="chips" aria-label="Browse recipes by meal category">' + courseChips + '</div>' +
    '<div class="filter-heading">Explore A–Z <span>All available recipes starting with a letter</span></div><div class="chips" aria-label="Browse recipes alphabetically">' + letterChips + '</div>' +
    '<button type="button" class="btn secondary small" data-action="surprise">✦ Surprise me with a recipe</button></div>' + kitchenPicker + kitchenReadinessChips + (discoveryMode === 'pantry' ? '<p class="note" style="margin-bottom:22px">* Match percentages compare names only. Amount checks use compatible units and exclude expired entries. Food safety, allergies and substitutions are not verified.</p>' : '') +
    currentResults + '</section>';
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
    '<div class="field wide"><p class="panel-note">Your own recipes stay in this browser for now. Personal photo storage will come later; third-party photographs are not copied without permission.</p></div>' +
    '<div class="field wide"><button class="btn" type="submit">' + (meal ? 'Save recipe changes' : '+ Add to my usual dishes') + '</button></div></form></section>';
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
    '<section class="panel" style="margin-top:28px"><div class="section-head"><div><h3>Your data, your choice</h3><p>Keep a backup of your recipes, labels, cooking history, pantry and meal plans.</p></div></div>' +
    '<div class="dialog-actions"><button type="button" class="btn secondary small" data-action="export-data">↓ Export backup</button>' +
    '<label class="btn secondary small" for="backup-file">↑ Import backup</label><input type="file" id="backup-file" accept=".json,application/json" class="visually-hidden"></div>' +
    '<p class="panel-note" style="margin-top:13px">Backups include your personal information. Keep them private. Import replaces everything saved in this browser; nothing is uploaded to a server.</p></section>';
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
    '<section class="section"><div class="section-head"><div><h3>On your shelves</h3><p>' + rows.length + ' recorded batches</p></div></div>' + inventory + '</section></div>' +
    '<aside><div class="panel"><h3>Kitchen at a glance</h3><div class="stat-block"><span class="stat-number">' + rows.length + '</span><span class="stat-label">ingredients recorded</span></div><div class="stat-block"><span class="stat-number">' + expiring + '</span><span class="stat-label">past or within 3 days of their recorded date</span></div>' +
    '<button type="button" class="btn" data-action="suggest" style="width:100%;margin:14px 0">✦ Find recipes with my food</button>' +
    '<p class="panel-note">Keep purchases with different dates as separate batches using ＋. Names are matched first; amounts are added only when compatible. Recorded best-before dates are not proof that food is safe or unsafe.</p></div>' + dueSoon + '</aside></div>';
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
    const meta = row.manual ? 'Your own item · not automatically added to the kitchen' :
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
    '<form id="shopping-extra-form" class="shopping-add-form"><label for="shopping-extra-input">Add another item</label>' +
    '<div class="shopping-add-inline"><input id="shopping-extra-input" type="text" name="item" maxlength="100" placeholder="e.g. Dish soap, bananas…" required>' +
    '<button type="submit" class="btn secondary small">+ Add</button></div></form>' +
    (checklist.toBuy.length ? '<button class="btn secondary" type="button" data-action="copy-shopping" style="width:100%;margin:18px 0">Copy remaining items ↗</button>' : '') +
    '<p class="panel-note">Ticking an item only tracks your shopping progress. It does not automatically add it to your pantry. Your selections stay in this browser and are included in JSON backups. If a recipe or its required quantity changes, an earlier checkmark is no longer treated as current.</p></aside></div>';
}


function worldPage() {
  const countries=countryDirectory(worldAreas);
  const cell=worldIndex ? catalogueCell(worldIndex,worldCountry,worldCategory) : null;
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
    ' None have been independently selected as “best” or authenticated as traditional dishes.</p></div>'+
    '<div class="world-count">'+number+' <span>/ '+CATALOGUE_TARGET+'</span></div></section>' : '';
  const caution=assessed && incomplete ?
    '<p class="world-warning" role="status">Incomplete provider scan: requests for '+
    escapeHtml(worldPartial.join(', ').toUpperCase())+
    ' failed. Counts may be lower than the provider’s actual catalogue.</p>' : '';
  const sourceQuery=worldResearchQuery.trim().toLocaleLowerCase();
  const matchedResearch=researchLeadResults(worldResearchEntries,sourceQuery,worldResearchEvidence,
    {tag:worldResearchTag,status:worldResearchStatus,reviews:store.editorialReviews});
  const researchPages=Math.max(1,Math.ceil(matchedResearch.length/24));
  const researchPage=Math.max(0,Math.min(worldResearchPage,researchPages-1));
  const reviewedStats=researchReviewSummary(store.editorialReviews);
  const editSource=worldResearchEntries.find(x=>x.id===worldResearchReviewId);
  const selectedResearch=editSource&&(store.editorialReviews?.[editSource.id]||{});
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
    '<div class="world-actions"><button type="submit" class="btn">Save research notes</button>'+
    (store.editorialReviews?.[editSource.id] ?
      '<button type="button" class="btn secondary" data-action="world-review-delete" data-id="'+escapeHtml(editSource.id)+'">Discard notes</button>' : '')+
    '</div></form>' : '';
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
      '</select></div></form>'+
      '<p class="panel-note" role="status">'+matchedResearch.length+' linked source records'+
      (sourceQuery?' match your search':'')+'. Page '+(researchPage+1)+' of '+researchPages+' · up to 24 per page'+
      '. Country and course assignments require human verification.</p>'+
      '<ul class="world-research-list">'+matchedResearch.slice(researchPage*24,(researchPage+1)*24).map(x=>
        '<li><a href="'+externalUrl(x.url)+'" target="_blank" rel="noopener noreferrer">'+
        escapeHtml(x.title)+' ↗</a><span>Wikibooks · course/origin unreviewed</span>'+
        (store.editorialReviews?.[x.id] ? '<span class="research-status">Your research: '+
          escapeHtml(store.editorialReviews[x.id].status.replaceAll('-',' '))+
          (store.editorialReviews[x.id].country ? ' · '+escapeHtml(store.editorialReviews[x.id].country) : '')+
          '</span>' : '')+
        (worldResearchEvidence.has(x.sourcePageId)&&worldResearchEvidence.get(x.sourcePageId).length ?
          '<span class="research-tags">Source tags (unverified): '+
          escapeHtml(worldResearchEvidence.get(x.sourcePageId).slice(0,3).join(' · '))+'</span>' : '')+
        '<button type="button" class="btn secondary small" data-action="world-research-review" data-id="'+
        escapeHtml(x.id)+'">Research this recipe</button></li>').join('')+'</ul>'+reviewEditor+
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
    '</section>'+caution+scannedStats+summary+recipes+
    (assessed?'<p class="panel-note">Provider records found: '+worldIndex.stats.scanned+
    '. Unclassified: '+worldIndex.stats.unclassified+
    ' · Ambiguous regional labels held back: '+worldIndex.stats.ambiguous+
    '. Empty combinations and unavailable source content require further research and rights review.</p>':'')+
    researchList;
}

function render() {
  updateNav();
  appRoot.innerHTML = view === 'discover' ? discoverPage() : view === 'world' ? worldPage() : view === 'library' ? libraryPage() : view === 'pantry' ? pantryPage() : planPage();
  if (selectedMeal) renderDialog();
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
      '<div class="field wide dialog-actions"><button type="submit" class="btn">Save cooking experience ✓</button>' +
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
      return '<li class="' + (enough ? '' : 'missing') + '"><span>' + marker + escapeHtml(x.name) + '</span><span>' + escapeHtml(amount + x.label) + '</span></li>';
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
      '<p class="panel-note" style="margin-top:12px">* Estimates only. Check freshness, units and food safety before cooking.</p>' + servingControls + tagEditor + '<div class="dialog-columns"><section><h3>Ingredients</h3><p class="panel-note" style="margin-bottom:14px">' + (ingredientItems.length ? measuredScore.have.length + ' of ' + ingredientItems.length + ' ingredient names in your kitchen. ' + (measuredScore.isQuantityConfirmed ? 'All listed amounts appear sufficient.*' : 'See amounts and stock checks below.*') + '' : 'Ingredients pending') + '</p>' + ingredientHtml +
      '</section><section><h3>How to make it</h3>' + (parts.length ? '<ol class="instruction-list">' + parts.map(t => '<li>' + escapeHtml(t) + '</li>').join('') + '</ol>' : '<p class="panel-note">Instructions unavailable.</p>') +
      (parts.length ? '<div class="dialog-actions" style="margin-top:20px"><button type="button" class="btn" data-action="start-cooking">' + (store.cookingSessions?.[meal.idMeal] ? 'Resume guided cooking →' : 'Start guided cooking →') + '</button>' +
      (store.cookingSessions?.[meal.idMeal] ? '<button type="button" class="btn secondary" data-action="restart-cooking">Start from the beginning</button>' : '') + '</div>' : '') +
      '</section></div>' + journalHtml + '<div style="margin-top:27px" class="note">' + (meal.strPersonal ? 'This is your own saved recipe. Check cooking temperatures, allergens and food safety before eating.' : 'Community-contributed recipe and photography via TheMealDB. Regional categories are source labels, not certification of one definitive traditional method. Check allergens, temperatures and food safety independently.') + '</div></div>';
  }
  const source = externalUrl(meal.strSource);
  const video = externalUrl(meal.strYoutube);
  const sourceLink = source ? '<a href="' + source + '" target="_blank" rel="noopener noreferrer" class="btn secondary small">Original source ↗</a>' : '';
  const videoLink = video && !meal.strPersonal ? '<a href="' + video + '" target="_blank" rel="noopener noreferrer" class="btn secondary small">Watch source video ↗</a>' : '';
  overlayRoot.innerHTML = '<div class="overlay" data-action="overlay" role="presentation"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">' +
    '<button class="dialog-close" data-action="close" type="button" aria-label="Close recipe">×</button>' +
    '<div class="dialog-hero">' + (externalUrl(meal.strMealThumb,true) ? '<img data-recipe-photo class="dialog-photo" src="' + externalUrl(meal.strMealThumb,true) + '" alt="' + escapeHtml(meal.strMeal) + '">' : '<div class="hero-placeholder">🍲</div>') +
    '<div class="dialog-intro"><div class="eyebrow">' + escapeHtml(meal.strArea || 'World cuisine') + ' · ' + escapeHtml(meal.strCategory || 'Home cooking') + '</div><h2 id="dialog-title">' + escapeHtml(meal.strMeal) + '</h2>' +
    '<p class="lead">Cook it your way. Save it, plan it, or work through the steps one at a time.</p><div class="dialog-actions">' + sourceLink + videoLink +
    (meal.strPersonal ? '' : '<a class="btn secondary small" href="https://www.themealdb.com/" target="_blank" rel="noopener noreferrer">Recipe data: TheMealDB ↗</a>') +
    '</div><p class="panel-note">' + (meal.strPersonal ? (externalUrl(meal.strSource) ? 'Your personal adaptation · Original publisher linked. No third-party photo copied.' : 'Personal recipe written by you.') : 'Community-provided data and photography via TheMealDB. Cuisine, category and regional authenticity have not been independently verified.') + '</p></div></div>' + contents + '</section></div>';
  document.body.style.overflow = 'hidden';
  syncCookingTimer();
  if (focusedAction) {
    const nextFocus = [...overlayRoot.querySelectorAll('[data-action]')].find(node =>
      node.dataset.action === focusedAction && node.dataset.id === focusedId);
    nextFocus?.focus();
  }
}
function closeDialog() {
  if (!selectedMeal) return;
  clearInterval(cookingTimerTicker); cookingTimerTicker = null;
  selectedMeal = null;
  stepIndex = -1;
  showCookingLog = false;
  detailTargetServings = null;
  overlayRoot.innerHTML = '';
  document.body.style.overflow = '';
  if (dialogReturnFocus?.isConnected) dialogReturnFocus.focus();
  else document.querySelector('.site-nav .active')?.focus();
  dialogReturnFocus = null;
}
async function openMeal(id) {
  const possible = findMeal(id);
  if (!possible) { notice('Recipe not found.'); return; }
  dialogReturnFocus = document.activeElement;
  try {
    selectedMeal = ingredientsOf(possible).length && possible.strInstructions ? possible : await mealDetails(id);
    if (store.saved[id]) { store.saved[id].meal = selectedMeal; save(); }
    stepIndex = -1;
    showCookingLog = false;
    detailTargetServings = validServings(store.saved[id]?.baseServings);
    renderDialog();
    overlayRoot.querySelector('.dialog-close')?.focus();
  } catch {
    notice('Could not open this recipe. Please try again.');
  }
}
async function markRecipe(id, field) {
  let meal = findMeal(id);
  if (!meal) return;
  if (!ingredientsOf(meal).length || !meal.strInstructions) {
    try { meal = await mealDetails(id); } catch { notice('Recipe details could not load. Try again.'); return; }
  }
  const entry = savedEntry(id);
  entry.meal = meal;
  if (field === 'cookedCount') entry.cookedCount = (Number(entry.cookedCount) || 0) + 1;
  else entry[field] = !entry[field];
  if (flags(entry)) store.saved[id] = entry;
  else { delete store.saved[id]; for (const day of Object.keys(store.plan)) if (store.plan[day] === id) delete store.plan[day]; }
  if (selectedMeal?.idMeal === id) selectedMeal = meal;
  const stored = save();
  render();
  if (stored) notice(field === 'cookedCount' ? 'Added to your cooking history!' : 'Your cookbook is updated.');
}

document.addEventListener('click', async event => {
  const nav = event.target.closest('[data-nav]');
  if (nav) { changeView(nav.dataset.nav); return; }
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;
  if (action === 'overlay') { if (event.target === button) closeDialog(); return; }
  if (action === 'close') { closeDialog(); return; }
  if (action === 'world-research-load') { worldResearchPage=0; await loadWorldResearch(); return; }
  if (action === 'world-research-prev' || action === 'world-research-next') {
    const q=worldResearchQuery.toLocaleLowerCase();
    const count=worldResearchEntries.filter(x=>!q || x.title.toLocaleLowerCase().includes(q)).length;
    const last=Math.max(0,Math.ceil(count/24)-1);
    worldResearchPage=Math.max(0,Math.min(last,worldResearchPage+(action==='world-research-next'?1:-1)));
    render();return;
  }
  if (action === 'world-scan') { await collectWorldRecipes(); return; }
  if (action === 'world-cancel') { worldScanController?.abort(); return; }
  if (action === 'world-export') { downloadWorldIndex(); return; }
  if (action === 'world-retry-options') { await loadWorldOptions(); return; }
  if (action === 'open') { await openMeal(id); return; }
  if (['wanted','usual','favourite'].includes(action)) { await markRecipe(id,action); return; }
  if (action === 'cook-done') { if (!selectedMeal || selectedMeal.idMeal !== id) return; stepIndex = -1; showCookingLog = true; renderDialog(); overlayRoot.querySelector('#cooking-rating')?.focus(); return; }
  if (action === 'cancel-cook-log') { showCookingLog = false; renderDialog(); return; }
  if (action === 'area') { await discover(button.dataset.area === 'All' ? 'featured' : 'area',button.dataset.area); return; }
  if (action === 'course') { await discover(button.dataset.course === 'All' ? 'featured' : 'category',button.dataset.course); return; }
  if (action === 'featured') { await discover(); return; }
  if (action === 'letter') { await discover('letter',button.dataset.letter); return; }
  if (action === 'surprise') {
    button.disabled = true;
    try {
      const meal = await randomMeal();
      dialogReturnFocus = button;
      selectedMeal = meal;
      stepIndex = -1;
      showCookingLog = false;
      detailTargetServings = validServings(store.saved[meal.idMeal]?.baseServings);
      renderDialog();
      overlayRoot.querySelector('.dialog-close')?.focus();
    } catch { notice('Could not load a surprise recipe. Try again.'); }
    finally { if (button.isConnected) button.disabled = false; }
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
  if (action === 'retry') { await discover(discoveryMode, discoveryMode === 'search' ? searchTerm : discoveryMode === 'area' ? area : discoveryMode === 'category' ? category : browseLetter); return; }
  if (action === 'collection') { libraryTab = button.dataset.value; render(); return; }
  if (action === 'tag-filter') { libraryTag = button.dataset.tag || ''; render(); return; }
  if (action === 'clear-library-filters') { libraryTag = ''; librarySearch = ''; libraryTab = 'all'; librarySort = 'name'; render(); return; }
  if (action === 'remove-tag') {
    const meal = store.saved[id]?.meal;
    if (!meal) return;
    const next = removeTag(store.saved[id], button.dataset.tag);
    if (flags(next)) store.saved[id] = next;
    else {
      delete store.saved[id];
      for (const day of Object.keys(store.plan)) if (store.plan[day] === id) delete store.plan[day];
    }
    const stored = save(); render(); if (stored) notice('Label removed.'); return;
  }
  if (action === 'new-recipe') { showRecipeForm = true; editingRecipeId = null; libraryTab = 'all'; render(); document.getElementById('personal-title')?.focus(); return; }
  if (action === 'cancel-recipe') { showRecipeForm = false; editingRecipeId = null; render(); return; }
  if (action === 'edit-recipe') {
    if (!store.saved[id]?.meal?.strPersonal) return;
    closeDialog(); view = 'library'; libraryTab = 'all'; showRecipeForm = true; editingRecipeId = id;
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

document.addEventListener('input', event => {
  if (event.target.id !== 'bulk-input') return;
  bulkDraft = event.target.value;
  if (bulkPreview) {
    bulkPreview = null;
    // Do not leave an outdated confirmation button active after the input changed.
    document.querySelector('.bulk-preview')?.remove();
  }
});

document.addEventListener('submit', event => {
  if(event.target.id==='world-research-form'){
    event.preventDefault();
    worldResearchQuery=String(new FormData(event.target).get('query')||'').trim().slice(0,100);
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
      store.saved[id] = addTag({ ...savedEntry(id), meal:selectedMeal },raw);
      const stored = save(); render();
      overlayRoot.querySelector('#recipe-tag-input')?.focus();
      if (stored) notice('Label saved on this recipe.');
    } catch (error) { notice(error.message || 'Could not save label.'); }
    return;
  }
  if (event.target.id === 'search-form') {
    event.preventDefault();
    const value = String(new FormData(event.target).get('query') || '').trim();
    if (value) discover('search',value);
    else discover();
  }
  if (event.target.id === 'cooking-log-form') {
    event.preventDefault();
    if (!selectedMeal) return;
    const id = selectedMeal.idMeal;
    const input = Object.fromEntries(new FormData(event.target).entries());
    try {
      const current = { ...savedEntry(id), meal:selectedMeal };
      const nextSaved = {...store.saved,[id]:recordCooking(current,input)};
      const nextSessions = {...store.cookingSessions};
      delete nextSessions[id];
      if (!persistStore({...store,saved:nextSaved,cookingSessions:nextSessions})) {
        notice('Unable to save cooking experience. Your in-progress steps are unchanged.'); return;
      }
      store.saved=nextSaved;
      store.cookingSessions=nextSessions;
      showCookingLog=false; stepIndex=-1;
      render(); notice('Added to your cooking journal.');
    } catch (error) { notice(error.message || 'Could not save cooking notes.'); }
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
      const restored = parseBackup(await file.text());
      const yes = window.confirm('Import this backup? Your current Tasteit recipes, kitchen and plans in this browser will be replaced.');
      if (!yes) return;
      if (!persistStore(restored)) throw new Error('The backup could not be saved in this browser. Your previous data is unchanged.');
      store.pantry = restored.pantry;
      store.saved = restored.saved;
      store.plan = restored.plan;
      store.planServings = restored.planServings || {};
      store.cookingSessions = restored.cookingSessions || {};
      store.shoppingChecked = restored.shoppingChecked || {};
      store.shoppingExtras = restored.shoppingExtras || [];
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
  if (!(node instanceof HTMLImageElement) || !node.matches('[data-recipe-photo]')) return;
  const placeholder = document.createElement('div');
  placeholder.className = node.classList.contains('dialog-photo')
    ? 'image-unavailable dialog-photo-unavailable' : 'card-picture-fallback image-unavailable';
  placeholder.setAttribute('role','img');
  placeholder.setAttribute('aria-label','Photograph unavailable for ' + (node.alt || 'this recipe'));
  placeholder.textContent = '🍲';
  node.replaceWith(placeholder);
}, true);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && selectedMeal) { closeDialog(); return; }
  if (selectedMeal && stepIndex >= 0 && ['ArrowLeft','ArrowRight'].includes(event.key) &&
      !event.altKey && !event.ctrlKey && !event.metaKey &&
      !event.target.closest('input,textarea,select,[contenteditable="true"]')) {
    event.preventDefault();
    const next = moveCookingStep(currentCookingSession(),stepIndex+(event.key==='ArrowRight'?1:-1),instructions(selectedMeal).length);
    if (!updateCookingSession(next)) return;
    stepIndex=next.step; renderDialog(); overlayRoot.querySelector('.cook-step')?.focus(); return;
  }
  if (event.key !== 'Tab' || !selectedMeal) return;
  const elements = [...overlayRoot.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled)')].filter(x => x.getClientRects().length > 0);
  if (!elements.length) return;
  const first = elements[0], last = elements[elements.length - 1];
  if (!overlayRoot.contains(document.activeElement)) {
    event.preventDefault(); first.focus(); return;
  }
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

window.addEventListener('storage', event => {
  if (event.key !== 'tasteit.local.v1') return;
  const fresh = loadStore();
  store.pantry = fresh.pantry;
  store.saved = fresh.saved;
  store.plan = fresh.plan;
  store.planServings = fresh.planServings;
  store.cookingSessions = fresh.cookingSessions;
  store.shoppingChecked = fresh.shoppingChecked;
  store.shoppingExtras = fresh.shoppingExtras;
  render();
});

render();
discover();
availableAreas().then(areas => {
  if (!areas.length) return;
  cuisines = ['All', ...areas];
  if (view === 'discover') render();
}).catch(() => { /* Keep fallback cuisines when the area endpoint is unavailable. */ });
availableCategories().then(values => {
  if (!values.length) return;
  categories = ['All', ...values];
  if (view === 'discover') render();
}).catch(() => { /* Keep fallback meal categories when the endpoint is unavailable. */ });
