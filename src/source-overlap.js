// Cross-provider title comparison is ONLY a research signal.
// Exact normalised names can refer to different national preparations;
// alternate word ordering is even less definitive. Never auto-merge.
const token=x=>String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/&/g,' and ').replace(/[’']/g,'').toLowerCase()
  .replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const words=x=>token(x).split(' ').filter(Boolean);
const bagKey=x=>words(x).sort().join(' ');
export function recipeNameKey(name) {
  return token(name);
}
export function recipeTitleIndex(catalogue) {
  const exact=new Map(),reordered=new Map(),seen=new Set();
  const cells=Array.isArray(catalogue?.cells)?catalogue.cells:[];
  for(const cell of cells) {
    for(const item of Array.isArray(cell?.recipes)?cell.recipes:[]) {
      const id=String(item?.id||'');
      const name=String(item?.name||'').trim();
      const country=String(cell.country||''),category=String(cell.category||'');
      const key=recipeNameKey(name);
      if(!/^\d{1,20}$/.test(id)||!key||seen.has(id))continue;
      seen.add(id);
      const record={id,name,country,category,
        detailEndpoint:'https://www.themealdb.com/api/json/v1/1/lookup.php?i='+encodeURIComponent(id)};
      if(!exact.has(key))exact.set(key,[]);
      exact.get(key).push(record);
      if(words(name).length>=3){
        const reorderedKey=bagKey(name);
        if(!reordered.has(reorderedKey))reordered.set(reorderedKey,[]);
        reordered.get(reorderedKey).push(record);
      }
    }
  }
  return {exact,reordered,indexed:seen.size};
}
export function possibleSourceMatches(title,index,{limit=4}={}) {
  const key=recipeNameKey(title);
  if(!key || !index || !index.exact || !index.reordered)return [];
  const matches=[];
  const found=new Set();
  for(const match of index.exact.get(key)||[]) {
    if(found.has(match.id))continue;
    found.add(match.id);
    matches.push({...match,matchType:'same-normalised-title'});
  }
  if(words(title).length>=3){
    for(const match of index.reordered.get(bagKey(title))||[]) {
      if(found.has(match.id))continue;
      found.add(match.id);
      matches.push({...match,matchType:'same-words-reordered'});
    }
  }
  return matches.sort((a,b)=>{
    const ap=a.matchType==='same-normalised-title'?0:1;
    const bp=b.matchType==='same-normalised-title'?0:1;
    return ap-bp || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  }).slice(0,Math.max(0,Math.min(20,Math.floor(limit)||4)));
}
export function sourceOverlapReport(catalogue,leads) {
  const index=recipeTitleIndex(catalogue);
  const rows=[];
  for(const lead of Array.isArray(leads)?leads:[]){
    if(typeof lead?.id!=='string'||typeof lead.title!=='string'||
      !/^wikibooks:\d+$/.test(lead.id))continue;
    const matches=possibleSourceMatches(lead.title,index,{limit:20});
    if(matches.length) rows.push({
      wikibooksId:lead.id,
      wikibooksTitle:lead.title,
      wikibooksUrl:typeof lead.url==='string'?lead.url:'',
      providerMatches:matches,
      reviewStatus:'possible-overlap-not-confirmed'
    });
  }
  return {
    version:1,
    policy:'research-only-never-auto-deduplicate',
    providerRecords:index.indexed,
    wikibooksLeads:Array.isArray(leads)?leads.length:0,
    possibleOverlapLeads:rows.length,
    confirmedDuplicates:0,
    rows
  };
}
export function sourceOverlapCsv(report){
  const safe=value=>{
    let v=String(value??'');
    if(/^\s*[=+\-@]/.test(v))v="'"+v;
    return '"'+v.replace(/"/g,'""')+'"';
  };
  const header=['Wikibooks ID','Wikibooks title','Wikibooks page','TheMealDB ID',
    'Provider title','Provider country label','Provider category','Match clue',
    'Duplicate confirmed'];
  const records=report.rows.flatMap(row=>row.providerMatches.map(item=>[
    row.wikibooksId,row.wikibooksTitle,row.wikibooksUrl,item.id,item.name,item.country,
    item.category,item.matchType,'NO'
  ]));
  return [header,...records].map(row=>row.map(safe).join(',')).join('\n')+'\n';
}
