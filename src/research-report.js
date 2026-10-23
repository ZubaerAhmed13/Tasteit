// Audit-ready research leads beside the *separate* sourced-recipe shortfall.
// The counts below are source-tag hints only, never independently verified
// country origins, rankings, or permission to reuse photography/text.
import { sourceTagCountryHints, sourceTagCategoryHints } from './research-priority.js';
const indexKey=(country,category)=>JSON.stringify([country,category]);
export function worldResearchGapReport(snapshot,links,evidence) {
  if(!snapshot || !Array.isArray(snapshot.countries) ||
    !Array.isArray(snapshot.categories) || !Array.isArray(snapshot.cells) ||
    !Array.isArray(links) || !(evidence instanceof Map))
    throw new Error('The collected world recipe sources are incomplete.');
  const areas=snapshot.countries.flatMap(row=>
    (row.areas||[]).map(strArea=>({strArea,strCountry:row.country})));
  const sourced=new Map(snapshot.cells.map(cell=>
    [indexKey(cell.country,cell.category),Math.max(0,Number(cell.count)||0)]));
  const rows=[];
  for(const {country} of snapshot.countries){
    const countryLeads=links.filter(link=>
      sourceTagCountryHints(evidence.get(link.sourcePageId)||[],country,areas).length>0);
    for(const category of snapshot.categories){
      const documented=sourced.get(indexKey(country,category))||0;
      const taggedBoth=countryLeads.filter(link=>
        sourceTagCategoryHints(evidence.get(link.sourcePageId)||[],category).length>0);
      rows.push({
        country,category,
        sourcedRecipes:documented,
        target:30,
        sourcedShortfall:Math.max(0,30-documented),
        wikibooksCountryTagLeads:countryLeads.length,
        wikibooksJointTagLeads:taggedBoth.length,
        sampleLeadIds:taggedBoth.slice(0,12).map(link=>link.id),
        reviewStatus:'source-tag-hints-only'
      });
    }
  }
  const total=rows.length;
  return {
    version:1,
    source:'TheMealDB candidate coverage + Wikibooks original category-tag hints',
    status:'unreviewed-research-leads-not-verified-best-recipes',
    totalPairs:total,
    verifiedBest:0,
    sourceRecords:snapshot.stats?.scanned||0,
    wikibooksResearchPages:links.length,
    pairsWithJointHints:rows.filter(x=>x.wikibooksJointTagLeads>0).length,
    pairsWithCountryHints:rows.filter(x=>x.wikibooksCountryTagLeads>0).length,
    rows
  };
}
export function worldResearchGapCsv(report) {
  const columns=[
    'Country','Recipe category','TheMealDB sourced count','Target',
    'Sourced shortfall','Wikibooks matching country tags (UNVERIFIED)',
    'Wikibooks matching country and category tags (UNVERIFIED)',
    'Review status','Research lead IDs to inspect'
  ];
  const safe=value=>{
    let str=String(value??'');
    if(/^\s*[=+@\-]/.test(str))str="'"+str;
    return '"'+str.replace(/"/g,'""')+'"';
  };
  return [columns,...report.rows.map(x=>[
    x.country,x.category,x.sourcedRecipes,x.target,x.sourcedShortfall,
    x.wikibooksCountryTagLeads,x.wikibooksJointTagLeads,
    x.reviewStatus,x.sampleLeadIds.join(' ')
  ])].map(row=>row.map(safe).join(',')).join('\n')+'\n';
}
