import {safeHttps} from './selected-sources.js';
import {ingredientPhotoCredits} from './ingredient-photos.js';
// Complete photo attribution is presented only on this page, never below the picture.
const container=document.getElementById('photo-credits-list');
const status=document.getElementById('photo-credits-status');
function link(url,label) {
 const anchor=document.createElement('a');anchor.href=url;anchor.textContent=label;
 anchor.target='_blank';anchor.rel='noopener noreferrer';return anchor;
}
function valid(photo) {
 const media=safeHttps(photo?.url),page=safeHttps(photo?.filePage),licence=safeHttps(photo?.licenceUrl);
 return photo?.verified===true&&typeof photo.label==='string'&&photo.label.trim()&&
  typeof photo.creator==='string'&&photo.creator.trim()&&typeof photo.licence==='string'&&
  ['upload.wikimedia.org','thumb.wikimedia.org'].includes(media?.hostname)&&
  page?.hostname==='commons.wikimedia.org'&&page.pathname.startsWith('/wiki/File:')&&
  licence&&ingredientPhotoCredits(photo)!==null;
}
async function renderCredits() {
 try {
  const response=await fetch('./data/ingredient-photos.json',{cache:'no-store'});
  if(!response.ok)throw Error('Photo credits could not load.');
  const data=await response.json();
  if(!Array.isArray(data?.photos))throw Error('Invalid photo information.');
  const records=data.photos.filter(valid).sort((a,b)=>a.label.localeCompare(b.label));
  if(!records.length)throw Error('No verified photo records available.');
  const list=document.createElement('ol');list.className='photo-credits-list';
  for(const photo of records) {
   const item=document.createElement('li');
   const name=document.createElement('strong');name.textContent=photo.label;
   item.append(name,document.createTextNode(' — '),link(photo.filePage,photo.creator),
    document.createTextNode(' · '),link(photo.licenceUrl,photo.licence));
   for(const extra of ingredientPhotoCredits(photo))item.append(document.createTextNode(' · '),link(extra.url,extra.label));
   if(photo.changes){const changes=document.createElement('span');changes.className='photo-credit-changes';changes.textContent=' · '+photo.changes;item.append(changes);}
   list.append(item);
  }
  container.replaceChildren(list);status.textContent=records.length+' verified ingredient-photo references';
 } catch {
  status.textContent='Photo credits are not available right now.';
  const button=document.createElement('button');button.type='button';button.className='btn secondary';
  button.textContent='Try again';button.addEventListener('click',()=>{container.replaceChildren();void renderCredits();});
  container.replaceChildren(button);
 }
}
void renderCredits();
