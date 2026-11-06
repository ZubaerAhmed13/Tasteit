import { normalizeIngredient } from './model.js';

// Recipe shopping requirements are derived from the planner. Their checkboxes
// are user-facing shopping progress, never an instruction to alter stock.
export function shoppingKey(item) {
  return 'recipe:' + normalizeIngredient(item?.name);
}
export function shoppingFingerprint(item) {
  return JSON.stringify({
    status:String(item?.status || ''),
    label:String(item?.label || ''),
    meals:[...new Set(Array.isArray(item?.meals)?item.meals:[])].map(String).sort()
  });
}
export function validShoppingState(checked, extras) {
  if (checked !== undefined && (!checked || typeof checked!=='object' || Array.isArray(checked) ||
    Object.keys(checked).length>1000 || !Object.entries(checked).every(([key,value]) =>
      key.length>7 && key.length<=180 && key.startsWith('recipe:') &&
      typeof value==='string' && value.length<=3000))) return false;
  if (extras !== undefined && (!Array.isArray(extras) || extras.length>100 ||
    !extras.every(x=>x && typeof x==='object' && !Array.isArray(x) &&
      typeof x.id==='string' && /^manual-[a-zA-Z0-9-]{1,80}$/.test(x.id) &&
      typeof x.name==='string' && x.name.trim().length>=1 && x.name.length<=100 &&
      typeof x.checked==='boolean'))) return false;
  return true;
}
export function addShoppingExtra(extras,name,id) {
  const clean=String(name??'').trim().replace(/\s+/g,' ');
  if(!clean || clean.length>100) throw new Error('Enter an item name of 1–100 characters.');
  if(/[\u0000-\u001f\u007f]/.test(clean)) throw new Error('Item name contains invalid characters.');
  if(!/^manual-[a-zA-Z0-9-]{1,80}$/.test(String(id))) throw new Error('Invalid shopping item identifier.');
  if(extras.length>=100) throw new Error('You can add up to 100 personal shopping items.');
  if(extras.some(x=>normalizeIngredient(x.name)===normalizeIngredient(clean)))
    throw new Error('This extra item is already on your list.');
  return [...extras,{id,name:clean,checked:false}];
}
export function removeShoppingExtra(extras,id) { return extras.filter(x=>x.id!==id); }
export function toggleShoppingExtra(extras,id) {
  return extras.map(x=>x.id===id?{...x,checked:!x.checked}:x);
}
export function toggleRecipeChecked(checked,item) {
  const key=shoppingKey(item);
  const next={...checked};
  if(next[key]===shoppingFingerprint(item)) delete next[key];
  else next[key]=shoppingFingerprint(item);
  return next;
}
export function shoppingChecklist(derived,extras=[],checked={}) {
  const recipes=derived.map(item=>({
    key:shoppingKey(item),manual:false,item,
    checked:checked[shoppingKey(item)]===shoppingFingerprint(item)
  }));
  const manual=extras.map(item=>({
    key:item.id,manual:true,item,checked:item.checked
  }));
  const rows=[...recipes,...manual];
  return {
    toBuy:rows.filter(x=>!x.checked),
    completed:rows.filter(x=>x.checked),
    total:rows.length,
    completedCount:rows.filter(x=>x.checked).length
  };
}
export function shoppingPlainText(checklist,{includeCompleted=false}={}) {
  const rows=includeCompleted?[...checklist.toBuy,...checklist.completed]:checklist.toBuy;
  return rows.map(row=>(row.checked?'☑ ':'☐ ')+row.item.name+
    (row.manual?' (personal item)':' — '+row.item.label)).join('\n');
}
