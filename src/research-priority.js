// Rank *research leads*, never certify cuisine, cultural origin, suitability,
// reuse rights or "best recipe" status from Wikimedia category membership.
const canonical=x=>String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[’'"]/g,'').replace(/[^a-zA-Z0-9]+/g,' ').trim().toLowerCase()
  .replace(/\s+/g,' ');
const rejectAmbiguous=areas=>{
  const owner=new Map();
  for(const row of Array.isArray(areas)?areas:[]){
    const area=canonical(row.strArea);
    const country=canonical(row.strCountry);
    if(!area || !country)continue;
    if(!owner.has(area))owner.set(area,new Set());
    owner.get(area).add(country);
  }
  return owner;
};
export const TRIAGE_MODES=Object.freeze(['all','country','country-category']);
export function countryAliases(country,areas=[]) {
  const chosen=canonical(country);
  if(!chosen)return [];
  const owners=rejectAmbiguous(areas);
  const aliases=new Set([chosen]);
  for(const row of areas){
    if(canonical(row.strCountry)!==chosen)continue;
    const label=canonical(row.strArea);
    if(label && owners.get(label)?.size===1)aliases.add(label);
  }
  return [...aliases];
}
export function sourceTagCountryHints(labels,country,areas=[]) {
  const words=countryAliases(country,areas);
  return (Array.isArray(labels)?labels:[]).filter(label=>{
    const tag=canonical(label);
    return words.some(word=>
      tag===word+' recipes' ||
      tag===word+' recipe' ||
      tag===word+' cuisine' ||
      tag===word+' dishes' ||
      tag===word+' food' ||
      tag==='recipes from '+word ||
      tag==='cooking of '+word);
  });
}
export function sourceTagCategoryHints(labels,category) {
  const name=canonical(category);
  if(!name)return [];
  const forms=new Set([
    name+' recipes',name+' recipe',name+' dishes',name+' dish',
    name+' foods',name+' food',name,
    // A few direct category noun plurals, only when the whole source tag matches.
    ...(name==='dessert'?['desserts']:[]),
    ...(name==='seafood'?['fish and seafood recipes']:[]),
    ...(name==='vegetarian'?['vegetarian dishes']:[]),
    ...(name==='breakfast'?['breakfast dishes']:[])
  ]);
  return (Array.isArray(labels)?labels:[]).filter(x=>forms.has(canonical(x)));
}
export function buildResearchPriority(entries,evidence,options={}) {
  const {country='',category='',areas=[],mode='all',reviews={}}=options;
  if(!TRIAGE_MODES.includes(mode))throw new Error('Unsupported research priority mode.');
  const result=[];
  for(const entry of Array.isArray(entries)?entries:[]){
    if(!entry || typeof entry.title!=='string' || typeof entry.id!=='string')continue;
    const labels=evidence?.get(entry.sourcePageId)||[];
    const countryTags=sourceTagCountryHints(labels,country,areas);
    const categoryTags=sourceTagCategoryHints(labels,category);
    if(mode!=='all' && !countryTags.length)continue;
    if(mode==='country-category'&&!categoryTags.length)continue;
    const status=reviews[entry.id]?.status||'unreviewed';
    const priority=(countryTags.length?2:0)+(categoryTags.length?1:0);
    result.push({
      entry,
      countryTags,categoryTags,priority,
      status,
      hintStatus:'unverified-source-tags'
    });
  }
  // Only hint quality & outstanding research work influence queue order;
  // none of these attributes rank food quality or national authenticity.
  return result.sort((a,b)=>{
    const workA=a.status==='unreviewed'?0:a.status==='researching'?1:
      a.status==='needs-evidence'?2:a.status==='shortlisted'?3:4;
    const workB=b.status==='unreviewed'?0:b.status==='researching'?1:
      b.status==='needs-evidence'?2:b.status==='shortlisted'?3:4;
    return b.priority-a.priority || workA-workB ||
      a.entry.title.localeCompare(b.entry.title) ||
      a.entry.id.localeCompare(b.entry.id);
  });
}
export function researchQueueCounts(entries,evidence,options={}) {
  const all=buildResearchPriority(entries,evidence,{...options,mode:'all'});
  return {
    total:all.length,
    countryHints:all.filter(x=>x.countryTags.length>0).length,
    jointHints:all.filter(x=>x.countryTags.length>0 && x.categoryTags.length>0).length,
    unreviewed:all.filter(x=>x.status==='unreviewed').length,
    shortlisted:all.filter(x=>x.status==='shortlisted').length,
    // A hint count is never a count of sourced country/category recipes.
    verifiedBest:0
  };
}
