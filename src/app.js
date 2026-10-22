import { loadStore, persistStore, normalizeIngredient, ingredientsOf, analyseMeal, shoppingList, nextSevenDates, usablePantryItem, exportBackup, parseBackup, createPersonalMeal, recordCooking } from './model.js';
import { featured, searchMeals, cuisineMeals, mealDetails, pantryCandidates, availableAreas } from './api.js';
import { addTag, removeTag, tagsOf, collectionTags, filterCookbook } from './organise.js';

const appRoot = document.getElementById('app');
const overlayRoot = document.getElementById('overlay-root');
const toastRoot = document.getElementById('toast');
const store = loadStore();

let cuisines = ['All', 'Italian', 'Indian', 'Japanese', 'Mexican', 'Moroccan', 'Thai', 'Turkish', 'Chinese', 'British', 'American', 'Greek', 'French', 'Vietnamese'];
let view = 'discover';
let activeMeals = [];
let loading = true;
let problem = '';
let area = 'All';
let searchTerm = '';
let discoveryMode = 'featured';
let libraryTab = 'all';
let libraryTag = '';
let librarySearch = '';
let librarySort = 'name';
let selectedMeal = null;
let stepIndex = -1;
let showCookingLog = false;
let editingId = null;
let showRecipeForm = false;
let editingRecipeId = null;
let requestNumber = 0;
let controller = null;
let toastTimer = null;
let dialogReturnFocus = null;

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
  return activeMeals.find(x => x.idMeal === id) || store.saved[id]?.meal || (selectedMeal?.idMeal === id ? selectedMeal : null);
}
function savedEntry(id) {
  return store.saved[id] || { meal: findMeal(id), wanted: false, usual: false, favourite: false, cookedCount: 0 };
}
function flags(entry) {
  return Boolean(entry && (entry.wanted || entry.usual || entry.favourite || entry.cookedCount > 0 || tagsOf(entry).length));
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
  window.scrollTo({ top: 0, behavior: 'instant' });
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
  updateNav();
  render();
  try {
    let meals;
    if (mode === 'search') meals = await searchMeals(value, controller.signal);
    else if (mode === 'area') meals = await cuisineMeals(value, controller.signal);
    else if (mode === 'pantry') {
      meals = await pantryCandidates(store.pantry.filter(item => usablePantryItem(item)), controller.signal);
      meals.sort((a, b) => analyseMeal(b, store.pantry).percent - analyseMeal(a, store.pantry).percent);
    } else meals = await featured(controller.signal);
    if (thisRequest !== requestNumber) return;
    activeMeals = meals;
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
  return url ? '<img src="' + url + '" alt="' + escapeHtml(meal.strMeal) + '" loading="lazy" referrerpolicy="no-referrer">' : '<div class="card-picture-fallback" aria-hidden="true">🍲</div>';
}
function card(meal) {
  const id = escapeHtml(meal.idMeal);
  const entry = savedEntry(meal.idMeal);
  const analysis = ingredientsOf(meal).length && store.pantry.length ? analyseMeal(meal, store.pantry) : null;
  const region = meal.strArea || 'World kitchen';
  const category = meal.strCategory || 'Recipe';
  const isSaved = Boolean(entry.wanted);
  const isPersonal = Boolean(meal.strPersonal);
  return '<article class="recipe-card">' +
    '<button type="button" class="recipe-photo" data-action="open" data-id="' + id + '" aria-label="View recipe for ' + escapeHtml(meal.strMeal) + '">' +
    photo(meal) + (analysis ? '<span class="mini-pill">' + (analysis.isQuantityConfirmed ? 'Amounts confirmed*' : analysis.percent + '% names on hand*') + '</span>' : '<span class="mini-pill">' + escapeHtml(region) + '</span>') + '</button>' +
    '<div class="recipe-body"><button type="button" class="recipe-title" data-action="open" data-id="' + id + '">' + escapeHtml(meal.strMeal) + '</button>' +
    '<div class="recipe-meta"><span>' + escapeHtml(region) + '</span><span>·</span><span>' + escapeHtml(category) + '</span></div>' +
    '<div class="card-bottom"><span class="source-line">' + (isPersonal ? 'YOUR RECIPE' : 'PHOTO · THEMEALDB') + '</span>' +
    '<button type="button" class="quick-save' + (isSaved ? ' saved' : '') + '" data-action="wanted" data-id="' + id + '" aria-pressed="' + isSaved + '">' + (isSaved ? '✓ Want to try' : '+ Want to try') + '</button></div></div></article>';
}
function cards(meals) {
  return '<div class="recipe-grid">' + meals.map(card).join('') + '</div>';
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
  const label = discoveryMode === 'pantry' ? 'Ideas from your kitchen' : discoveryMode === 'area' ? area + ' recipes' : discoveryMode === 'search' ? 'Search results' : 'Discover something delicious';
  const title = discoveryMode === 'pantry' ? 'Cook with what you <strong>have.</strong>' : 'A whole world of <strong>good food.</strong>';
  const countSaved = Object.values(store.saved).filter(flags).length;
  const nextToTry = Object.values(store.saved).filter(entry => entry.wanted && entry.meal)
    .sort((a,b) => Number(analyseMeal(b.meal,store.pantry).isQuantityConfirmed) - Number(analyseMeal(a.meal,store.pantry).isQuantityConfirmed) || analyseMeal(b.meal,store.pantry).percent - analyseMeal(a.meal,store.pantry).percent)
    .slice(0,4).map(entry => entry.meal);
  const chips = cuisines.map(c => '<button type="button" class="chip' + (area === c && discoveryMode !== 'search' && discoveryMode !== 'pantry' ? ' selected' : '') +
    '" data-action="area" data-area="' + escapeHtml(c) + '" aria-pressed="' + (area === c && discoveryMode !== 'search' && discoveryMode !== 'pantry') + '">' + escapeHtml(c) + '</button>').join('');
  const currentResults = loading ? loadingBox() : problem ? '<div class="alert">' + escapeHtml(problem) + '<button class="btn small" type="button" data-action="retry">Try again</button></div>' :
    activeMeals.length ? cards(activeMeals) : empty('🔎', 'No recipes found', 'Try a different dish name, cuisine or kitchen ingredient.', '<button class="btn" type="button" data-action="featured">Explore popular dishes</button>');
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
    '<div class="chips" aria-label="Browse recipes by cuisine">' + chips + '</div>' + (discoveryMode === 'pantry' ? '<p class="note" style="margin-bottom:22px">* Match percentages compare names only. Amount checks use compatible units and exclude expired entries. Food safety, allergies and substitutions are not verified.</p>' : '') +
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
  const end = new Date(value + 'T00:00:00');
  if (Number.isNaN(end.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((end - today) / 86400000);
  if (days < 0) return '<span class="expiry-expired">Expired ' + Math.abs(days) + 'd ago</span>';
  if (days === 0) return '<span class="expiry-warning">Expires today</span>';
  if (days <= 3) return '<span class="expiry-warning">Expires in ' + days + 'd</span>';
  return 'Expires ' + escapeHtml(value);
}
function pantryPage() {
  const edit = store.pantry.find(x => x.id === editingId);
  const rows = [...store.pantry].sort((a, b) => a.name.localeCompare(b.name));
  const form = '<form id="pantry-form" class="pantry-form">' +
    '<div class="field wide"><label for="ingredient-name">Ingredient name *</label><input name="name" id="ingredient-name" placeholder="e.g. tomatoes, chicken breast, rice..." maxlength="80" value="' + escapeHtml(edit?.name || '') + '" required></div>' +
    '<div class="field"><label for="ingredient-quantity">Amount</label><input name="quantity" id="ingredient-quantity" type="number" min="0" step="any" placeholder="500" value="' + escapeHtml(edit?.quantity || '') + '"></div>' +
    '<div class="field"><label for="ingredient-unit">Unit</label><select name="unit" id="ingredient-unit">' +
    ['pcs','g','kg','ml','l','tsp','tbsp','cups','packs'].map(x => '<option value="' + x + '"' + ((edit?.unit || 'pcs') === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
    '<div class="field"><label for="ingredient-location">Stored in</label><select name="location" id="ingredient-location">' +
    ['Pantry','Fridge','Freezer','Other'].map(x => '<option' + ((edit?.location || 'Pantry') === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
    '<div class="field"><label for="ingredient-expiry">Best before (optional)</label><input id="ingredient-expiry" name="expiry" type="date" value="' + escapeHtml(edit?.expiry || '') + '"></div>' +
    '<div class="field buttons"><button class="btn" type="submit">' + (edit ? 'Save changes' : '+ Add ingredient') + '</button>' + (edit ? '<button type="button" class="btn secondary" data-action="cancel-edit">Cancel</button>' : '') + '</div></form>';
  const inventory = rows.length ? '<div class="inventory-list">' + rows.map(x => {
    const meta = [x.quantity ? x.quantity + ' ' + (x.unit || '') : 'Amount not set', x.location || 'Pantry'].join(' · ');
    return '<div class="inventory-row"><div><div class="inventory-name">' + escapeHtml(x.name) + '</div><div class="inventory-meta">' + escapeHtml(meta) + (x.expiry ? ' · ' + expiryText(x.expiry) : '') + '</div></div>' +
      '<div class="row-actions"><button class="icon-button" type="button" data-action="edit-pantry" data-id="' + escapeHtml(x.id) + '" aria-label="Edit ' + escapeHtml(x.name) + '">✎</button>' +
      '<button class="icon-button" type="button" data-action="remove-pantry" data-id="' + escapeHtml(x.id) + '" aria-label="Remove ' + escapeHtml(x.name) + '">×</button></div></div>';
  }).join('') + '</div>' : empty('🥬','Your kitchen is empty','Add the ingredients in your fridge, freezer or cupboards to get relevant cooking ideas.');
  const expiring = rows.filter(x => x.expiry && expiryText(x.expiry).includes('expiry-')).length;
  return '<div class="page-top"><div class="eyebrow">KNOW WHAT YOU HAVE</div><h1>Your kitchen, <em>organised.</em></h1><p class="lead">Keep a simple inventory and find recipes that match what is already at home.</p></div>' +
    '<div class="page-grid"><div><div class="panel"><h3>' + (edit ? 'Edit an ingredient' : 'Add to your kitchen') + '</h3>' + form + '</div>' +
    '<section class="section"><div class="section-head"><div><h3>On your shelves</h3><p>' + rows.length + ' different ingredients</p></div></div>' + inventory + '</section></div>' +
    '<aside><div class="panel"><h3>Kitchen at a glance</h3><div class="stat-block"><span class="stat-number">' + rows.length + '</span><span class="stat-label">ingredients recorded</span></div><div class="stat-block"><span class="stat-number">' + expiring + '</span><span class="stat-label">expired or expiring within 3 days</span></div>' +
    '<button type="button" class="btn" data-action="suggest" style="width:100%;margin:14px 0">✦ Find recipes with my food</button>' +
    '<p class="panel-note">Ingredient names are matched first. When both recipe amounts and pantry units are clear, shortages are calculated. Ambiguous units or amounts are flagged for checking.</p></div></aside></div>';
}

function planPage() {
  const dates = nextSevenDates();
  const saved = Object.entries(store.saved).filter(([,entry]) => flags(entry) && entry.meal);
  const options = saved.map(([id, entry]) => '<option value="' + escapeHtml(id) + '">' + escapeHtml(entry.meal.strMeal) + '</option>');
  const rows = dates.map(day => '<div class="day-row"><div class="day-name">' + day.label + '<span class="day-date">' + day.date + '</span></div><select class="plan-select" data-plan-day="' + day.key + '" aria-label="Recipe for ' + day.label + ' ' + day.date + '">' +
    '<option value="">Choose a recipe...</option>' + options.map((option, i) => option.replace('<option value=', '<option' + (saved[i][0] === store.plan[day.key] ? ' selected' : '') + ' value=')).join('') +
    '</select></div>').join('');
  const week = Object.fromEntries(dates.map(x => [x.key, store.plan[x.key]]).filter(([,id]) => id));
  const shopping = shoppingList(week, store.saved, store.pantry);
  const list = shopping.length ? shopping.map(x => '<div class="shopping-row"><div><div class="shopping-name">' + escapeHtml(x.name) + '</div><div class="shopping-meta">For ' + escapeHtml(x.meals.join(', ')) + '</div></div><span class="shopping-amount">' + escapeHtml(x.label) + '</span></div>').join('') :
    '<p class="panel-note">Choose recipes for the week. Missing, insufficient and uncertain quantities will show up here.</p>';
  return '<div class="page-top"><div class="eyebrow">PLAN AHEAD, WORRY LESS</div><h1>What’s cooking <em>this week?</em></h1><p class="lead">Choose from recipes you have saved and see which ingredients you still need to buy.</p></div>' +
    (!saved.length ? '<div class="note" style="margin-bottom:23px">First save some recipes in My recipes. They will appear as options in your meal plan.</div>' : '') +
    '<div class="page-grid"><section class="panel"><h3>Next seven days</h3><div class="list-sections">' + rows + '</div></section>' +
    '<aside class="panel"><div class="section-head"><div><h3>Shopping list</h3><p>Items to buy or check</p></div></div><div>' + list + '</div>' +
    (shopping.length ? '<button class="btn secondary" type="button" data-action="copy-shopping" style="width:100%;margin:18px 0">Copy shopping list ↗</button>' : '') +
    '<p class="panel-note">Where units are compatible, amounts are added across planned days and compared with stock. Check unclear measurements and substitutions manually.</p></aside></div>';
}

function render() {
  updateNav();
  appRoot.innerHTML = view === 'discover' ? discoverPage() : view === 'library' ? libraryPage() : view === 'pantry' ? pantryPage() : planPage();
  if (selectedMeal) renderDialog();
}

function instructions(meal) {
  return String(meal?.strInstructions || '').split(/\r?\n+/).flatMap(text => text.split(/(?<=[.!?])\s+(?=[A-Z])/u)).map(s => s.trim()).filter(Boolean);
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
  const score = analyseMeal(meal, store.pantry);
  const parts = instructions(meal);
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
    contents = '<div class="dialog-content"><div class="eyebrow">COOKING MODE</div><h3>Step ' + (stepIndex + 1) + ' of ' + total + '</h3>' +
      '<div class="progress-bar"><span style="width:' + (100 * (stepIndex + 1) / Math.max(1,total)) + '%"></span></div>' +
      '<p class="cook-step">' + escapeHtml(parts[stepIndex] || '') + '</p>' +
      '<div class="dialog-actions"><button type="button" class="btn secondary" data-action="step-back"' + (stepIndex === 0 ? ' disabled' : '') + '>← Previous</button>' +
      (stepIndex < total - 1 ? '<button type="button" class="btn" data-action="step-next">Next step →</button>' : '<button type="button" class="btn" data-action="cook-done" data-id="' + escapeHtml(meal.idMeal) + '">Finish cooking ✓</button>') +
      '<button type="button" class="btn ghost" data-action="exit-cooking">View full recipe</button></div></div>';
  } else {
    const ingredientHtml = ingredientItems.length ? '<ul class="ingredient-list">' + score.availability.map(x => {
      const enough = x.status === 'enough';
      const marker = enough ? '✓ ' : x.status === 'review' ? '? ' : '○ ';
      const amount = x.measure ? x.measure + ' · ' : '';
      return '<li class="' + (enough ? '' : 'missing') + '"><span>' + marker + escapeHtml(x.name) + '</span><span>' + escapeHtml(amount + x.label) + '</span></li>';
    }).join('') + '</ul>' : '<p class="panel-note">Ingredient details unavailable for this recipe.</p>';
    const history = (Array.isArray(savedEntry(meal.idMeal).cookingHistory) ? savedEntry(meal.idMeal).cookingHistory : []).slice(0, 3);
    const journalHtml = history.length ? '<section class="cooking-journal"><h3>My cooking notes</h3>' +
      history.map(log => '<div class="cooking-log"><strong>' + escapeHtml(new Date(log.date).toLocaleDateString('en',{year:'numeric',month:'short',day:'numeric'})) +
      (log.rating ? ' · ' + log.rating + '/5 ★' : '') + '</strong>' +
      (log.note ? '<p>' + escapeHtml(log.note) + '</p>' : '<p>Cooked without a note.</p>') + '</div>').join('') + '</section>' : '';
    contents = '<div class="dialog-content"><div class="dialog-actions">' + actionButton('wanted',meal,'＋','Want to try') +
      actionButton('usual',meal,'↻','My usual dishes') + actionButton('favourite',meal,'♡','Favourite') +
      '<button type="button" class="btn secondary small" data-action="cook-done" data-id="' + escapeHtml(meal.idMeal) + '">✓ I cooked this' + (savedEntry(meal.idMeal).cookedCount ? ' (' + savedEntry(meal.idMeal).cookedCount + ')' : '') + '</button></div>' +
      (meal.strPersonal ? '<button class="btn secondary small" type="button" data-action="edit-recipe" data-id="' + escapeHtml(meal.idMeal) + '" style="margin-top:9px">✎ Edit my recipe</button>' : '') +
      '<p class="panel-note" style="margin-top:12px">* Estimates only. Check freshness, units and food safety before cooking.</p><div class="dialog-columns"><section><h3>Ingredients</h3><p class="panel-note" style="margin-bottom:14px">' + (ingredientItems.length ? score.have.length + ' of ' + ingredientItems.length + ' ingredient names in your kitchen. ' + (score.isQuantityConfirmed ? 'All listed amounts appear sufficient.*' : 'See amounts and stock checks below.*') + '' : 'Ingredients pending') + '</p>' + ingredientHtml +
      '</section><section><h3>How to make it</h3>' + (parts.length ? '<ol class="instruction-list">' + parts.map(t => '<li>' + escapeHtml(t) + '</li>').join('') + '</ol>' : '<p class="panel-note">Instructions unavailable.</p>') +
      (parts.length ? '<button type="button" class="btn" data-action="start-cooking" style="margin-top:20px">Start guided cooking →</button>' : '') +
      '</section></div>' + journalHtml + '<div style="margin-top:27px" class="note">' + (meal.strPersonal ? 'This is your own saved recipe. Check cooking temperatures, allergens and food safety before eating.' : 'Community-contributed recipe and photography via TheMealDB. Regional categories are source labels, not certification of one definitive traditional method. Check allergens, temperatures and food safety independently.') + '</div></div>';
  }
  const source = externalUrl(meal.strSource);
  const sourceLink = source ? '<a href="' + source + '" target="_blank" rel="noopener noreferrer" class="btn secondary small">Original source ↗</a>' : '';
  overlayRoot.innerHTML = '<div class="overlay" data-action="overlay" role="presentation"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">' +
    '<button class="dialog-close" data-action="close" type="button" aria-label="Close recipe">×</button>' +
    '<div class="dialog-hero">' + (externalUrl(meal.strMealThumb,true) ? '<img class="dialog-photo" src="' + externalUrl(meal.strMealThumb,true) + '" alt="' + escapeHtml(meal.strMeal) + '">' : '<div class="hero-placeholder">🍲</div>') +
    '<div class="dialog-intro"><div class="eyebrow">' + escapeHtml(meal.strArea || 'World cuisine') + ' · ' + escapeHtml(meal.strCategory || 'Home cooking') + '</div><h2 id="dialog-title">' + escapeHtml(meal.strMeal) + '</h2>' +
    '<p class="lead">Cook it your way. Save it, plan it, or work through the steps one at a time.</p><div class="dialog-actions">' + sourceLink +
    (meal.strPersonal ? '' : '<a class="btn secondary small" href="https://www.themealdb.com/" target="_blank" rel="noopener noreferrer">Recipe data: TheMealDB ↗</a>') + '</div></div></div>' + contents + '</section></div>';
  document.body.style.overflow = 'hidden';
  if (focusedAction) {
    const nextFocus = [...overlayRoot.querySelectorAll('[data-action]')].find(node =>
      node.dataset.action === focusedAction && node.dataset.id === focusedId);
    nextFocus?.focus();
  }
}
function closeDialog() {
  if (!selectedMeal) return;
  selectedMeal = null;
  stepIndex = -1;
  showCookingLog = false;
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
  if (action === 'open') { await openMeal(id); return; }
  if (['wanted','usual','favourite'].includes(action)) { await markRecipe(id,action); return; }
  if (action === 'cook-done') { if (!selectedMeal || selectedMeal.idMeal !== id) return; stepIndex = -1; showCookingLog = true; renderDialog(); overlayRoot.querySelector('#cooking-rating')?.focus(); return; }
  if (action === 'cancel-cook-log') { showCookingLog = false; renderDialog(); return; }
  if (action === 'area') { await discover(button.dataset.area === 'All' ? 'featured' : 'area',button.dataset.area); return; }
  if (action === 'featured') { await discover(); return; }
  if (action === 'suggest') {
    if (!store.pantry.some(i => usablePantryItem(i))) { changeView('pantry'); notice('Add an available, unexpired ingredient to your kitchen first.'); return; }
    await discover('pantry'); return;
  }
  if (action === 'retry') { await discover(discoveryMode, discoveryMode === 'search' ? searchTerm : area); return; }
  if (action === 'collection') { libraryTab = button.dataset.value; render(); return; }
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
  if (action === 'edit-pantry') { editingId = id; render(); document.getElementById('ingredient-name')?.focus(); return; }
  if (action === 'cancel-edit') { editingId = null; render(); return; }
  if (action === 'remove-pantry') { store.pantry = store.pantry.filter(x => x.id !== id); if (editingId === id) editingId = null; const stored = save(); render(); if (stored) notice('Ingredient removed.'); return; }
  if (action === 'start-cooking') { stepIndex = 0; renderDialog(); overlayRoot.querySelector('.dialog-close')?.focus(); return; }
  if (action === 'step-back') { stepIndex = Math.max(0,stepIndex - 1); renderDialog(); return; }
  if (action === 'step-next') { stepIndex = Math.min(instructions(selectedMeal).length - 1,stepIndex + 1); renderDialog(); return; }
  if (action === 'exit-cooking') { stepIndex = -1; renderDialog(); return; }
  if (action === 'copy-shopping') {
    const dates = nextSevenDates().map(x => x.key);
    const week = Object.fromEntries(dates.map(day => [day,store.plan[day]]).filter(([,v]) => v));
    const text = shoppingList(week,store.saved,store.pantry).map(x => '☐ ' + x.name + ' — ' + x.label).join('\n');
    try { await navigator.clipboard.writeText(text); notice('Shopping list copied.'); }
    catch { notice('Clipboard is unavailable. Select and copy the shopping list manually.'); }
  }
});

document.addEventListener('submit', event => {
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
      store.saved[id] = recordCooking(current, input);
      showCookingLog = false; stepIndex = -1;
      const stored = save(); render();
      if (stored) notice('Added to your cooking journal.');
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
      store.saved[id] = { ...previous, meal, usual:true };
      showRecipeForm = false; editingRecipeId = null; libraryTab = 'all';
      const stored = save(); render(); if (stored) notice('Your personal recipe has been saved.');
    } catch (error) { notice(error.message); }
    return;
  }
  if (event.target.id === 'pantry-form') {
    event.preventDefault();
    const form = new FormData(event.target);
    const name = String(form.get('name') || '').trim();
    if (!name) return;
    const duplicate = store.pantry.some(x => normalizeIngredient(x.name) === normalizeIngredient(name) && x.id !== editingId);
    if (duplicate) { notice('This ingredient already exists. Edit the existing item instead.'); return; }
    const current = store.pantry.find(x => x.id === editingId);
    const item = {
      id: current?.id || globalThis.crypto?.randomUUID?.() || String(Date.now()) + '-' + String(Math.random()).slice(2),
      name, quantity: String(form.get('quantity') || '').trim(), unit: String(form.get('unit') || 'pcs'),
      location: String(form.get('location') || 'Pantry'), expiry: String(form.get('expiry') || '')
    };
    if (editingId) store.pantry = store.pantry.map(x => x.id === editingId ? item : x);
    else store.pantry.push(item);
    editingId = null;
    const stored = save(); render(); if (stored) notice('Kitchen inventory updated.');
  }
});

document.addEventListener('change', async event => {
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
      showRecipeForm = false; editingRecipeId = null;
      render(); notice('Your Tasteit backup has been restored.');
    } catch (error) { notice(error.message || 'Import failed.'); }
    finally { event.target.value = ''; }
    return;
  }
  const select = event.target.closest('[data-plan-day]');
  if (!select) return;
  const day = select.dataset.planDay;
  const id = select.value;
  if (id && store.saved[id]?.meal) store.plan[day] = id;
  else delete store.plan[day];
  const stored = save(); render(); if (stored) notice('Meal plan updated.');
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && selectedMeal) { closeDialog(); return; }
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
  render();
});

render();
discover();
availableAreas().then(areas => {
  if (!areas.length) return;
  cuisines = ['All', ...areas];
  if (view === 'discover') render();
}).catch(() => { /* Keep fallback cuisines when the area endpoint is unavailable. */ });
