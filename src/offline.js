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
    let sequence=0;
    const status=worker=>new Promise(resolve=>{
      if(!worker)return resolve(false);
      const channel=new MessageChannel(),timeout=setTimeout(()=>{channel.port1.close();resolve(false);},3000);
      channel.port1.onmessage=event=>{clearTimeout(timeout);channel.port1.close();resolve(event.data?.ready===true);};
      worker.postMessage('TASTEIT_OFFLINE_STATUS',[channel.port2]);
    });
    const announce=async()=>{
      const current=++sequence,worker=registration.waiting||navigator.serviceWorker.controller||registration.active;
      const ready=await status(worker);
      if(current===sequence)onState({status:ready?(registration.waiting?'update':'ready'):worker?'unavailable':'preparing',registration});
    };
    registration.addEventListener('updatefound',()=>{
      registration.installing?.addEventListener('statechange',()=>{void announce();});
    });
    navigator.serviceWorker.addEventListener('controllerchange',()=>{void announce();});
    navigator.serviceWorker.addEventListener('message',event=>{if(event.data==='TASTEIT_OFFLINE_CHANGED')void announce();});
    navigator.serviceWorker.ready.then(announce).catch(()=>{});
    announce();return registration;
  } catch {onState({status:'unavailable'});return null;}
}
