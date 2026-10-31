// Wikimedia source-media inspection: metadata research only, no image downloads,
// automated photo use, or assertions that machine metadata grants publication rights.
const wikiApi='https://en.wikibooks.org/w/api.php';
const commonsApi='https://commons.wikimedia.org/w/api.php';
const cap=(x,n=400)=>String(x||'').slice(0,n);
export function wikiFilePage(title){
  if(typeof title!=='string' || !/^File:[^\u0000-\u001f]{2,220}$/.test(title))
    throw new Error('Unrecognised Wikimedia file title.');
  return 'https://commons.wikimedia.org/wiki/'+encodeURIComponent(title.replaceAll(' ','_'));
}
function requestUrl(endpoint,params){
  const url=new URL(endpoint);
  for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value));
  url.searchParams.set('origin','*');
  url.searchParams.set('format','json');
  url.searchParams.set('formatversion','2');
  return url.href;
}
async function jsonFromSource(url,fetcher,signal){
  const response=await fetcher(url,{signal,headers:{Accept:'application/json'}});
  if(!response?.ok)throw new Error('The Wikimedia research service is unavailable.');
  const data=await response.json();
  if(!data || typeof data!=='object' || data.error)throw new Error('The Wikimedia research service returned an error.');
  return data;
}
export async function sourceImageTitles(pageId,{fetcher=fetch,signal}={}){
  if(!Number.isSafeInteger(Number(pageId)) || Number(pageId)<1 || Number(pageId)>999999999)
    throw new Error('Invalid Wikibooks source page identifier.');
  const url=requestUrl(wikiApi,{
    action:'query',prop:'images',pageids:String(pageId),imlimit:12
  });
  const data=await jsonFromSource(url,fetcher,signal);
  const pages=Array.isArray(data?.query?.pages)?data.query.pages:[];
  const titles=pages.flatMap(page=>Array.isArray(page.images)?page.images:[])
    .map(x=>x?.title).filter(x=>typeof x==='string' && /^File:/i.test(x))
    .slice(0,12).map(x=>x.slice(0,220));
  return [...new Set(titles)];
}
export async function commonsFileMetadata(title,{fetcher=fetch,signal}={}){
  const filePage=wikiFilePage(title);
  const url=requestUrl(commonsApi,{
    action:'query',prop:'imageinfo',titles:title,iiprop:'extmetadata|url',
    iiextmetadatafilter:'Artist|Credit|LicenseShortName|LicenseUrl|AttributionRequired|Copyrighted',
    iilimit:1
  });
  const data=await jsonFromSource(url,fetcher,signal);
  const page=Array.isArray(data?.query?.pages)?data.query.pages[0]:null;
  const info=page?.imageinfo?.[0];
  if(!info)return {title,filePage,foundOnCommons:false,
    artist:'',credit:'',license:'',licenseUrl:'',attributionRequired:'unknown'};
  const metadata=info.extmetadata||{};
  const value=name=>cap(metadata[name]?.value,500);
  const licenseUrl=value('LicenseUrl');
  let secureLicence='';
  try{
    const parsed=new URL(licenseUrl);
    if(parsed.protocol==='https:' && !parsed.username && !parsed.password)
      secureLicence=parsed.toString();
  }catch{}
  return {
    title,filePage,foundOnCommons:true,
    // These values can contain HTML. Treat them strictly as untrusted text
    // and escape them before showing in the page.
    artist:value('Artist'),credit:value('Credit'),
    license:value('LicenseShortName'),
    licenseUrl:secureLicence,
    attributionRequired:value('AttributionRequired')||'unknown'
  };
}
