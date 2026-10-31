const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function recipeRatingMarkup(record) {
 if(!record)return '';
 const r=record.rating,count=!r?'':r.count===null?'Vote count not collected':r.count.toLocaleString()+' '+(r.countType==='ratings'?'rating votes':'reviews');
 return '<p class="source-rating" aria-label="Publisher rating"><strong>'+esc(r?r.value+' / '+r.best:'Rating not collected')+'</strong> <span>'+esc(count)+'</span></p>';
}
