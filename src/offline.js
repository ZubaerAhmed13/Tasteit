import {ingredientsOf} from './model.js';
import {normaliseFilters} from './navigation.js';
export function offlineRecipes(saved,input={}) {
  const f=normaliseFilters(input),norm=x=>String(x||'').toLowerCase();
  return Object.values(saved).map(x=>x?.meal).filter(meal=>meal && ingredientsOf(meal).length && meal.strInstructions &&
    (!f.query||norm(meal.strMeal).includes(norm(f.query))) && (!f.area||norm(meal.strArea)===norm(f.area)) &&
    (!f.category||norm(meal.strCategory)===norm(f.category)) && (!f.letter||norm(meal.strMeal).startsWith(norm(f.letter))));
}
export async function installOffline(onState=()=>{}) {
  if(!globalThis.navigator?.serviceWorker || globalThis.isSecureContext===false){onState({status:'unsupported'});return null;}
  try {
    onState({status:'preparing'});
    const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    const announce=()=>onState({status:registration.waiting?'update':registration.active?'ready':'preparing',registration});
    registration.addEventListener('updatefound',()=>{
      registration.installing?.addEventListener('statechange',announce);
    });
    navigator.serviceWorker.addEventListener('controllerchange',announce);
    navigator.serviceWorker.ready.then(announce).catch(()=>{});
    announce();return registration;
  } catch {onState({status:'unavailable'});return null;}
}
