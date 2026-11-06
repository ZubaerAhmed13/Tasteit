import {cachedIngredientPhoto} from './ingredient-photos.js';

// Save only pictures already approved for an ingredient's actual food/form.
export function recipeIngredientPhotoUrls(ingredients=[],registry=[]) {
 const urls=new Set();
 for(const ingredient of ingredients) {
  const photo=cachedIngredientPhoto(ingredient,registry);
  if(photo?.url)urls.add(photo.url);
  if(urls.size>=40)break;
 }
 return [...urls];
}
export async function saveRecipeIngredientPhotos(ingredients,registry,{worker=globalThis.navigator?.serviceWorker?.controller,Channel=globalThis.MessageChannel,timeoutMs=20000}={}) {
 const urls=recipeIngredientPhotoUrls(ingredients,registry);
 if(!urls.length)return {requested:0,saved:0,failed:0};
 if(!worker||typeof Channel!=='function')throw new Error('Offline photos are not ready. Reopen TasteIt after offline access is prepared.');
 return new Promise((resolve,reject)=>{
  const channel=new Channel();let finished=false;
  const done=(error,value)=>{if(finished)return;finished=true;clearTimeout(timer);channel.port1.close();if(error)reject(error);else resolve(value);};
  const timer=setTimeout(()=>done(new Error('Offline photo saving timed out. Try again while connected.')),timeoutMs);
  channel.port1.onmessage=event=>{
   const data=event.data;
   if(!data?.ok||!Number.isSafeInteger(data.saved)||!Number.isSafeInteger(data.failed)||data.saved+data.failed!==urls.length) {
    done(new Error('Offline photos were not prepared. Please try again.'));return;
   }
   done(null,{requested:urls.length,saved:data.saved,failed:data.failed});
  };
  try {worker.postMessage({type:'TASTEIT_CACHE_RECIPE_PHOTOS',urls},[channel.port2]);}
  catch {done(new Error('The browser could not start offline photo saving.'));}
 });
}
