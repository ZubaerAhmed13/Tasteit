// The same, rights-reviewed ingredient thumbnail is enlarged in TasteIt.
// Never navigate to an image host. Original file and licence credits remain on
// photo-credits.html; do not display unreviewed substitute photography.
const safePhotoUrl=raw=>{
 try {const url=new URL(raw);return url.protocol==='https:'&&
 ['upload.wikimedia.org','thumb.wikimedia.org'].includes(url.hostname)&&
 url.pathname.startsWith('/wikipedia/commons/')?url.href:null;}
 catch{return null;}
};
export function installIngredientLightbox(root=document){
 let dialog=null,returnFocus=null;
 function ensureDialog(){
  if(dialog)return dialog;
  dialog=document.createElement('dialog');
  dialog.className='ingredient-photo-viewer';
  dialog.setAttribute('aria-labelledby','ingredient-photo-viewer-title');
  dialog.innerHTML='<div class="ingredient-photo-viewer-header"><h2 id="ingredient-photo-viewer-title"></h2><button type="button" data-photo-close aria-label="Close ingredient picture">×</button></div><img alt="">';
  document.body.appendChild(dialog);
  const close=()=>{
   if(typeof dialog.close==='function')dialog.close();
   else {dialog.removeAttribute('open');returnFocus?.focus?.({preventScroll:true});}
  };
  dialog.querySelector('[data-photo-close]').addEventListener('click',close);
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
  dialog.addEventListener('close',()=>{returnFocus?.isConnected&&returnFocus.focus({preventScroll:true});});
  return dialog;
 }
 root.addEventListener('click',event=>{
  const target=event.target?.closest?.('.ingredient-photo-link[data-photo-url]');
  if(!target?.dataset?.photoUrl)return;
  event.preventDefault();
  const url=safePhotoUrl(target.dataset.photoUrl);
  if(!url)return;
  const label=String(target.dataset.photoLabel||'Ingredient').slice(0,120);
  const viewer=ensureDialog();
  returnFocus=target;
  viewer.querySelector('h2').textContent=label;
  const image=viewer.querySelector('img');image.src=url;image.alt=label;
  if(!viewer.open){
   if(typeof viewer.showModal==='function')viewer.showModal();
   else {viewer.setAttribute('open','');viewer.querySelector('[data-photo-close]').focus();}
  }
 });
}
