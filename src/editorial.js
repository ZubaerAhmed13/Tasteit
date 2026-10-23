// Manual research notes are PRIVATE browser records until the user exports them.
// A shortlist is never equal to a licensed, tasted or editorially approved recipe.
export const EDITORIAL_STATUSES=Object.freeze([
  'researching','needs-evidence','shortlisted','rejected'
]);
const safeText=(value,max)=>String(value||'').trim().slice(0,max);
const validUrl=(value)=>{
  if(!value)return true;
  try {
    const u=new URL(value);
    return u.protocol==='https:' && !u.username && !u.password &&
      u.hostname.includes('.') && u.toString().length<=500;
  }catch{return false;}
};
const isPlainRecord=x=>x!==null && typeof x==='object'&&!Array.isArray(x);
const VALID_ID=/^wikibooks:[0-9]{1,12}$/;
function checkReviewFields(r){
  return isPlainRecord(r) &&
    ['researching','needs-evidence','shortlisted','rejected'].includes(r.status) &&
    typeof r.country==='string' && r.country.length<=100 &&
    typeof r.category==='string' && r.category.length<=100 &&
    typeof r.notes==='string' && r.notes.length<=1000 &&
    typeof r.evidenceUrl==='string' && r.evidenceUrl.length<=500 &&
    validUrl(r.evidenceUrl) &&
    typeof r.reviewedAt==='string' && /^\d{4}-\d{2}-\d{2}T/.test(r.reviewedAt) &&
    (r.status!=='shortlisted'||(
      r.country && r.category && r.notes.trim().length>=20 && r.evidenceUrl
    ));
}
export function validEditorialReviews(data){
  return data===undefined ||
    (isPlainRecord(data) && Object.keys(data).length<=1500 &&
    Object.entries(data).every(([id,entry])=>
      VALID_ID.test(id) && checkReviewFields(entry)));
}
export function editorialReview(input,{id,countries,categories,now=new Date()}){
  if(!VALID_ID.test(String(id)))throw new Error('Select a valid Wikibooks recipe.');
  const country=safeText(input.country,100);
  const category=safeText(input.category,100);
  const status=String(input.status||'researching');
  const evidenceUrl=safeText(input.evidenceUrl,500);
  const notes=safeText(input.notes,1000);
  if(!Array.isArray(countries)||!Array.isArray(categories)||
    (country && !countries.includes(country))||
    (category && !categories.includes(category)))
    throw new Error('Choose a country and category from the source directory.');
  if(!EDITORIAL_STATUSES.includes(status))throw new Error('Invalid research status.');
  if(!validUrl(evidenceUrl))throw new Error('Use a valid HTTPS evidence link.');
  if(status==='shortlisted' && (!country || !category ||
    !evidenceUrl || notes.length<20))
    throw new Error('Shortlisting requires country, category, an HTTPS evidence link and at least 20 characters of research notes.');
  if(status==='shortlisted' && new URL(evidenceUrl).hostname==='en.wikibooks.org')
    throw new Error('A shortlist needs a supporting source beyond the original Wikibooks page.');
  const review={country,category,status,evidenceUrl,notes,reviewedAt:now.toISOString()};
  if(!checkReviewFields(review))throw new Error('Review contains invalid information.');
  return review;
}
export function savedEditorialReview(state,id,review){
  if(!VALID_ID.test(String(id)))throw new Error('Invalid research source ID.');
  const updated={...(state||{})};
  if(!review)delete updated[id];
  else updated[id]=review;
  if(!validEditorialReviews(updated))throw new Error('Research review limit exceeded or review invalid.');
  return updated;
}
export function researchReviewSummary(reviews,country='',category=''){
  const rows=Object.values(reviews||{}).filter(x=>
    (!country||x.country===country) && (!category||x.category===category));
  return {
    reviewed:rows.length,
    researching:rows.filter(x=>x.status==='researching').length,
    needsEvidence:rows.filter(x=>x.status==='needs-evidence').length,
    shortlisted:rows.filter(x=>x.status==='shortlisted').length,
    rejected:rows.filter(x=>x.status==='rejected').length,
    verifiedBest:0 // This workflow NEVER grants "best" or image/text licences.
  };
}
export function researchLeadResults(entries,query,evidence=new Map(),filters={}){
  const token=String(query||'').normalize('NFKC').toLocaleLowerCase().trim();
  const tag=String(filters.tag||'').normalize('NFKC').toLocaleLowerCase().trim();
  const status=String(filters.status||'');
  const reviews=filters.reviews||{};
  return (Array.isArray(entries)?entries:[]).filter(entry=>{
    if(!entry||typeof entry.title!=='string')return false;
    const labels=evidence.get(entry.sourcePageId)||[];
    if(token && !entry.title.toLocaleLowerCase().includes(token) &&
      !labels.some(x=>String(x).toLocaleLowerCase().includes(token)))return false;
    if(tag && !labels.some(x=>String(x).toLocaleLowerCase().includes(tag)))return false;
    if(status && status!=='all' && (reviews[entry.id]?.status||'unreviewed')!==status)return false;
    return true;
  });
}
export function exportEditorialReviewCsv(reviews,entries=[]){
  const pages=new Map(entries.map(x=>[x.id,x]));
  const safe=value=>{
    const str=String(value??'');
    const neutral=/^[\s]*[=+\-@\t\r]/.test(str)?"'"+str:str;
    return '"'+neutral.replace(/"/g,'""')+'"';
  };
  return [
    ['Source ID','Recipe','Country (research)','Category (research)','Research status',
      'Evidence link','Notes','Reviewed at','Source URL','Top-30 approval'],
    ...Object.entries(reviews||{}).sort(([a],[b])=>a.localeCompare(b))
      .map(([id,r])=>[id,pages.get(id)?.title||'',r.country,r.category,r.status,
        r.evidenceUrl,r.notes,r.reviewedAt,pages.get(id)?.url||'','NOT APPROVED'])
  ].map(row=>row.map(safe).join(',')).join('\n')+'\n';
}
