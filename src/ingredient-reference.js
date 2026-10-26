import {ingredientPhoto,ingredientPhotoCredits} from './ingredient-photos.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,label)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>';
export function ingredientReference(line,registry=[]) {
 const photo=ingredientPhoto(line,registry);
 if(!photo)return '<span class="ingredient-photo-missing">Photo not verified</span>';
 const credits=ingredientPhotoCredits(photo).map(credit=>' · '+link(credit.url,credit.label)).join('');
 return '<figure class="ingredient-reference"><a class="ingredient-photo-link" href="'+esc(photo.url)+'" target="_blank" rel="noopener noreferrer" aria-label="View larger '+esc(photo.label)+' photograph"><img src="'+esc(photo.url)+'" alt="'+esc(photo.label)+' — ingredient reference photograph" loading="lazy" width="80" height="80" referrerpolicy="no-referrer"></a><figcaption>'+link(photo.filePage,photo.label+' · '+photo.creator)+' · '+link(photo.licenceUrl,photo.licence)+credits+'</figcaption></figure>';
}
