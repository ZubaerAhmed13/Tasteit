import {safeHttps} from './selected-sources.js';
const norm=value=>String(value||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9äöüß]+/g,' ').trim();
const preparations=['powder','paste','stock','broth','juice','fat','cream','ground','dried','flakes','sauce','vinegar','cooked','uncooked','candied','peel'];
const singleFoodDescription=value=>norm(value).replace(/\b(?:boneless and skinless|skinless and boneless)\b/g,'boneless skinless').replace(/\bchilled and cubed\b/g,'chilled cubed');
const specificMilks=['oat milk','almond milk','soy milk','soya milk','coconut milk','rice milk','cashew milk','goat milk','condensed milk','evaporated milk'];
const detailWords=new Set('finely freshly lightly roughly thinly thickly coarsely chopped minced sliced slices diced grated peeled seeded boneless skinless skinned roasted shredded julienned crushed pressed rinsed washed drained softened melted chilled cubed cut and into in small half halves quarters crosswise inch inches long piece pieces strips matchsticks thin thick beaten mashed deseeded optional full bodied for frying garnish serving dusting gehauft rote gelbe plain all purpose just thawed broken bite sized'.split(' '));
export function ingredientPhotoCredits(photo) {
 if(photo?.creditLinks===undefined)return [];
 if(!Array.isArray(photo.creditLinks)||!photo.creditLinks.length||photo.creditLinks.length>4)return null;
 const links=[];
 for(const item of photo.creditLinks) {
  const url=safeHttps(item?.url);
  if(!url||typeof item?.label!=='string'||!item.label.trim()||item.label.length>120)return null;
  links.push({label:item.label.trim(),url:url.href});
 }
 return links;
}
function usable(photo) {
 const image=safeHttps(photo?.url),file=safeHttps(photo?.filePage),licence=safeHttps(photo?.licenceUrl);
 return photo?.verified===true&&typeof photo.creator==='string'&&photo.creator.trim()&&
  ['upload.wikimedia.org','thumb.wikimedia.org'].includes(image?.hostname)&&file?.hostname==='commons.wikimedia.org'&&file.pathname.startsWith('/wiki/File:')&&
  ((licence?.hostname==='creativecommons.org'&&/^\/(licenses\/by(?:-sa)?\/|publicdomain\/(?:zero|mark)\/)/.test(licence.pathname))||(photo.licence==='Public domain'&&licence?.href===file?.href))&&
  Array.isArray(photo.aliases)&&photo.aliases.length>0&&ingredientPhotoCredits(photo)!==null&&
  (photo.exclusions===undefined||Array.isArray(photo.exclusions)&&photo.exclusions.length<=50&&photo.exclusions.every(term=>typeof term==='string'&&term.length<=80&&norm(term)));
}
export function ingredientPhoto(input,registry=[]) {
 let text=String(input||'').toLowerCase().replaceAll('&amp;','&').replaceAll('&',' and ');
 text=text.replace(/\bor to taste\b/g,'to taste');
 const preparation=norm(text);
 if(/\b(or|oder|sub|substitute|instead)\b/.test(preparation))return null;
 // Parentheses contain the publisher's notes; alternatives in the primary name stay explicit.
 for(let i=0;i<4;i++)text=text.replace(/\([^()]*\)/g,' ');
 text=text.replace(/\bcloves?\s+(?:of\s+)?garlic\b/g,'garlic').replace(/\bgarlic\s+cloves?\b/g,'garlic');
 const aliasSegments=text.split(',').map(norm).filter(Boolean);
 text=singleFoodDescription(text);
 const mixedConnector=/\b(or|and|oder|und)\b/.test(text);
 const matches=[];
 for(const photo of registry)if(usable(photo))for(const alias of photo.aliases) {
  const word=norm(alias);if(!word||!aliasSegments.some(segment=>(' '+segment+' ').includes(' '+word+' ')))continue;
  matches.push({photo,length:word.length,word,excluded:photo.exclusions?.some(term=>(' '+preparation+' ').includes(' '+norm(term)+' '))});
 }
 matches.sort((a,b)=>b.length-a.length);
 if(!matches.length)return null;
 const best=matches[0];
 if(best.excluded)return null;
 if(/\b(roasted|toasted)\b/.test(preparation)&&!['roasted','toasted'].includes(best.photo.form))return null;
 if(specificMilks.some(name=>(' '+text+' ').includes(' '+name+' ')&&!(' '+best.word+' ').includes(' '+name+' ')))return null;
 if((/\b(?:canned|tinned)\b/.test(preparation)||/\bcans?\b/.test(text))&&best.photo.form!=='canned')return null;
 // A later comma clause must describe the same food, even if a second food has no photo.
 if(aliasSegments.length>1) {
  const primary=' '+aliasSegments[0]+' ';
  if(!primary.includes(' '+best.word+' ')&&!/^\d[\d\s]*(?:(?:g|kg|mg|ml|l|el|tl|tsp|tbsp|cups?|bottles?)\s*)?(?:dry)?$/.test(aliasSegments[0]))return null;
  if(aliasSegments.slice(1).some(segment=>segment.replace(best.word,'').trim().split(/\s+/).filter(Boolean).some(word=>!detailWords.has(word)&&!/^\d+(?:g|kg|mg|ml|l|cm|mm)?$/.test(word))))return null;
 }
 if(mixedConnector&&/\b(or|and|oder|und)\b/.test(singleFoodDescription(aliasSegments[0]))&&!(best.photo.form==='roasted'&&/\broasted and shredded\b/.test(text)&&!/\b(or|and|oder|und)\b/.test(text.replace(/\broasted and shredded\b/g,'roasted shredded'))))return null;
 // Distinct foods in one primary ingredient line require an explicit combined reference.
 if(matches.some(x=>x.photo.id!==best.photo.id&&!best.word.includes(x.word)&&!x.word.includes(best.word)))return null;
 if(preparations.some(p=>(' '+text+' ').includes(' '+p+' ')&&!(' '+best.word+' ').includes(' '+p+' ')))return null;
 if(/\bfried\b/.test(preparation)&&!best.word.includes('fried'))return null;
 if(best.photo.form==='ground'&&/\b(grated|root|fresh|whole|peppercorns?|sliced|cubed|chopped|minced|peeled)\b/.test(preparation))return null;
 return best.photo;
}
