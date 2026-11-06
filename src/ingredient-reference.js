import {cachedIngredientPhoto} from './ingredient-photos.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Ingredient thumbnails intentionally have no visible caption. See photo-credits.html for attribution.
export function ingredientReference(line,registry=[]) {
 const photo=cachedIngredientPhoto(line,registry);
 if(!photo)return '<span class="ingredient-photo-missing">No photo</span>';
 return '<figure class="ingredient-reference"><button type="button" class="ingredient-photo-link" data-photo-url="'+esc(photo.url)+'" data-photo-label="'+esc(photo.label)+'" aria-label="Enlarge '+esc(photo.label)+' photo inside TasteIt"><img src="'+esc(photo.url)+'" alt="'+esc(photo.label)+'" loading="lazy" decoding="async" width="96" height="96" referrerpolicy="no-referrer"></button></figure>';
}
