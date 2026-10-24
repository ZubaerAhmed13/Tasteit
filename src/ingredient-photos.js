import {safeHttps} from './selected-sources.js';
const norm=value=>String(value||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9äöüß]+/g,' ').trim();
const preparations=['powder','paste','stock','broth','juice','fat','cream','ground','dried','flakes','sauce','vinegar','cooked','uncooked'];
function usable(photo) {
 const image=safeHttps(photo?.url),file=safeHttps(photo?.filePage),licence=safeHttps(photo?.licenceUrl);
 return photo?.verified===true&&typeof photo.creator==='string'&&photo.creator.trim()&&
  ['upload.wikimedia.org','thumb.wikimedia.org'].includes(image?.hostname)&&file?.hostname==='commons.wikimedia.org'&&file.pathname.startsWith('/wiki/File:')&&
  ((licence?.hostname==='creativecommons.org'&&/^\/(licenses\/by(?:-sa)?\/|publicdomain\/(?:zero|mark)\/)/.test(licence.pathname))||(photo.licence==='Public domain'&&licence?.href===file?.href))&&
  Array.isArray(photo.aliases)&&photo.aliases.length>0;
}
export function ingredientPhoto(input,registry=[]) {
 let text=String(input||'').toLowerCase().replaceAll('&amp;','&').replaceAll('&',' and ');
 const preparation=norm(text);
 if(/\b(or|oder|sub|substitute|instead)\b/.test(preparation))return null;
 // Parentheses contain the publisher's notes; alternatives in the primary name stay explicit.
 for(let i=0;i<4;i++)text=text.replace(/\([^()]*\)/g,' ');
 text=norm(text).replace(/\b(?:boneless and skinless|skinless and boneless)\b/g,'boneless skinless');
 if(/\b(or|and|oder|und)\b/.test(text))return null;
 const matches=[];
 for(const photo of registry)if(usable(photo))for(const alias of photo.aliases) {
  const word=norm(alias);if(!word||!(' '+text+' ').includes(' '+word+' '))continue;
  matches.push({photo,length:word.length,word});
 }
 matches.sort((a,b)=>b.length-a.length);
 if(!matches.length)return null;
 const best=matches[0];
 // Distinct foods in one primary ingredient line require an explicit combined reference.
 if(matches.some(x=>x.photo.id!==best.photo.id&&!best.word.includes(x.word)&&!x.word.includes(best.word)))return null;
 if(preparations.some(p=>(' '+text+' ').includes(' '+p+' ')&&!(' '+best.word+' ').includes(' '+p+' ')))return null;
 if(/\bfried\b/.test(preparation)&&!best.word.includes('fried'))return null;
 if(best.photo.form==='ground'&&/\b(grated|root|fresh|whole|peppercorns?)\b/.test(preparation))return null;
 return best.photo;
}
