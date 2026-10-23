import {normalizeIngredient,usablePantryItem,shoppingList,nextSevenDates} from './model.js';
import {shoppingChecklist,shoppingFingerprint} from './shopping.js';
import {parseMeasure,pantryMeasure} from './quantities.js';
import {scaledIngredients} from './servings.js';

export const STOCK_UNITS=['pcs','g','kg','ml','l','tsp','tbsp','cups','packs'];
export const STOCK_LOCATIONS=['Pantry','Fridge','Freezer','Other'];
function validDate(value) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return false;
  const date=new Date(value+'T12:00:00');
  return Number.isFinite(date.getTime()) && date.getFullYear()===Number(value.slice(0,4)) &&
    date.getMonth()+1===Number(value.slice(5,7)) && date.getDate()===Number(value.slice(8,10));
}
const positive=value=>String(value??'').trim()!=='' && Number.isFinite(Number(value)) && Number(value)>0 && Number(value)<=1_000_000;
export function validKitchenState(stocked,leftovers) {
  if(stocked!==undefined && (!stocked || typeof stocked!=='object' || Array.isArray(stocked) ||
    Object.keys(stocked).length>2000 || !Object.entries(stocked).every(([key,value])=>
      /^(recipe:.{1,150}|manual-[A-Za-z0-9-]{1,80})$/.test(key) && typeof value==='string' && value.length<=3000)))return false;
  if(leftovers!==undefined && (!Array.isArray(leftovers) || leftovers.length>500 ||
    new Set(leftovers.map(x=>x?.id)).size!==leftovers.length || !leftovers.every(x=>x &&
      /^leftover-[A-Za-z0-9-]{1,100}$/.test(x.id) && typeof x.name==='string' && x.name.trim() && x.name.length<=200 &&
      typeof x.mealId==='string' && x.mealId.length<=159 && Number.isInteger(x.portions) && x.portions>=0 && x.portions<=100 &&
      validDate(x.preparedAt) && (x.reminderDate==='' || validDate(x.reminderDate) && x.reminderDate>=x.preparedAt) &&
      ['Fridge','Freezer'].includes(x.location))))return false;
  return true;
}
export function purchaseFingerprint(row) {
  return row.manual?JSON.stringify({name:row.item.name}):shoppingFingerprint(row.item);
}
export function purchaseReview(checklist,stocked={}) {
  return checklist.completed.filter(row=>stocked[row.key]!==purchaseFingerprint(row));
}
export function receivePurchases(store,review,selections,receiptId,now=new Date()) {
  if(!/^[A-Za-z0-9-]{1,100}$/.test(receiptId))throw new Error('Invalid purchase receipt.');
  if(!selections.length)throw new Error('Select at least one food purchase to add.');
  if(new Set(selections.map(x=>x.key)).size!==selections.length)throw new Error('Duplicate purchase selection.');
  const days=new Set(nextSevenDates(now).map(x=>x.key));
  const week=Object.fromEntries(Object.entries(store.plan).filter(([day])=>days.has(day)));
  const checklist=shoppingChecklist(shoppingList(week,store.saved,store.pantry,store.planServings,now),store.shoppingExtras,store.shoppingChecked);
  const eligible=purchaseReview(checklist,store.shoppingStocked);
  const stocked={...store.shoppingStocked};
  const batches=selections.map((input,index)=>{
    const original=review.find(row=>row.key===input.key);
    const current=eligible.find(row=>row.key===input.key);
    if(!original || !current || purchaseFingerprint(original)!==purchaseFingerprint(current))
      throw new Error('Shopping requirements changed or this purchase was already added. Reopen the review.');
    if(!positive(input.quantity))throw new Error('Enter the actual purchase amount, greater than zero.');
    if(!STOCK_UNITS.includes(input.unit))throw new Error('Choose a supported unit.');
    if(!STOCK_LOCATIONS.includes(input.location))throw new Error('Choose a storage location.');
    if(input.expiry && !validDate(input.expiry))throw new Error('Check the recorded date.');
    const id='purchase-'+receiptId+'-'+index;
    if(store.pantry.some(x=>x.id===id))throw new Error('This purchase receipt was already added.');
    stocked[input.key]=purchaseFingerprint(current);
    return {id,name:current.item.name,quantity:String(Number(input.quantity)),unit:input.unit,
      location:input.location,expiry:input.expiry||''};
  });
  if(!validKitchenState(stocked,undefined))throw new Error('Too many purchase records to save safely.');
  return {...store,pantry:[...store.pantry,...batches],shoppingStocked:stocked};
}

// Suggestions are editable, unchecked proposals. Only exact normalised names and
// compatible measures are allocated; earlier dated batches are suggested first.
export function consumptionReview(meal,pantry,base,target,now=new Date()) {
  const required=new Map();
  for(const item of scaledIngredients(meal,base,target)) {
    const key=normalizeIngredient(item.name),measure=parseMeasure(item.machineMeasure);
    const previous=required.get(key);
    if(!measure || previous?.unknown || previous && previous.unit!==measure.unit)required.set(key,{unknown:true});
    else required.set(key,{quantity:(previous?.quantity||0)+measure.quantity,unit:measure.unit});
  }
  const lots=pantry.filter(item=>required.has(normalizeIngredient(item.name)) && usablePantryItem(item,now) && pantryMeasure(item))
    .sort((a,b)=>(a.expiry||'9999').localeCompare(b.expiry||'9999'));
  return lots.map(item=>{
    const stock=pantryMeasure(item),need=required.get(normalizeIngredient(item.name));
    const factor=parseMeasure('1 '+(item.unit||'pcs'))?.quantity;
    let suggested='';
    if(!need.unknown && need.unit===stock.unit && factor) {
      const take=Math.min(stock.quantity,need.quantity);
      suggested=take>0?String(Number((take/factor).toFixed(8))):'';
      need.quantity-=take;
    }
    return {id:item.id,name:item.name,unit:item.unit||'pcs',quantity:String(stock.quantity/factor),location:item.location||'Pantry',expiry:item.expiry||'',
      expectedQuantity:String(item.quantity),expectedUnit:String(item.unit||'pcs'),suggested};
  });
}
export function applyConsumption(pantry,deductions) {
  if(new Set(deductions.map(x=>x.id)).size!==deductions.length)throw new Error('Duplicate stock deduction.');
  const changes=new Map(deductions.map(input=>{
    const matches=pantry.filter(x=>x.id===input.id),item=matches[0];
    if(matches.length!==1 || String(item.quantity)!==input.expectedQuantity ||
      String(item.unit||'pcs')!==input.expectedUnit || item.name!==input.name ||
      String(item.expiry||'')!==input.expiry || (item.location||'Pantry')!==input.location)throw new Error('Kitchen stock changed. Reopen the cooking review.');
    if(!positive(input.used))throw new Error('Enter a used amount greater than zero.');
    const stock=pantryMeasure(item),factor=parseMeasure('1 '+input.unit);
    if(!stock || !factor || factor.unit!==stock.unit || input.unit!==input.expectedUnit)throw new Error('Check the stock units.');
    const used=Number(input.used)*factor.quantity;
    if(used-stock.quantity>0.00000001)throw new Error('Used amount exceeds available stock.');
    const quantity=String(Number((Math.max(0,stock.quantity-used)/factor.quantity).toFixed(8)));
    return [item.id,{...item,quantity}];
  }));
  return pantry.map(item=>changes.get(item.id)||item);
}
export function addLeftover(records,input) {
  const row={id:String(input.id),mealId:String(input.mealId||''),name:String(input.name||'').trim(),
    portions:Number(input.portions),preparedAt:String(input.preparedAt||''),
    reminderDate:String(input.reminderDate||''),location:String(input.location||'')};
  if(!Number.isInteger(row.portions) || row.portions<1 || row.portions>100)throw new Error('Enter 1–100 leftover portions.');
  if(!validDate(row.preparedAt) || row.reminderDate && (!validDate(row.reminderDate) || row.reminderDate<row.preparedAt))throw new Error('Check the leftover dates.');
  const next=[...records.filter(x=>x.portions>0),row];
  if(!validKitchenState(undefined,next))throw new Error('Invalid leftover record, duplicate ID or storage location.');
  return next;
}
