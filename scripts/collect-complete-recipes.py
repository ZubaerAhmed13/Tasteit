"""Bounded, revision-pinned Wikibooks Cookbook text collector (standard library)."""
import argparse, threading, urllib.error, concurrent.futures, datetime, hashlib, html, json, pathlib, re, urllib.parse, urllib.request
from html.parser import HTMLParser

class Node:
 def __init__(self,tag='',attrs=(),parent=None):self.tag=tag;self.attrs=dict(attrs);self.parent=parent;self.children=[]
 def walk(self):
  for child in self.children:
   if isinstance(child,Node):yield child;yield from child.walk()
 def text(self):
  if self.tag in ('script','style','math') or 'mw-editsection' in self.attrs.get('class',''):return ''
  return ''.join(((' ' if child.tag in ('li','br','p') else '')+child.text()) if isinstance(child,Node) else child for child in self.children)
class Document(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.root=Node();self.stack=[self.root]
 def handle_starttag(self,tag,attrs):
  n=Node(tag,attrs,self.stack[-1]);self.stack[-1].children.append(n)
  if tag not in ('br','hr','img','input','meta','link','wbr','source','area','col','embed','param'):self.stack.append(n)
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==tag:self.stack=self.stack[:i];return
 def handle_data(self,data):self.stack[-1].children.append(data)
def clean(s):return re.sub(r'\s+',' ',s).strip()
def primary_amount(line):
 # Drop a secondary conversion only after an explicit primary measure.
 # Package weights, required amounts and preparation sizes are recipe content.
 number=r'[0-9¼½¾⅓⅔⅛⅜⅝⅞]'
 unit=r'(?:g|kg|mg|ml|cl|dl|l|liters?|litres?|cups?|oz|ounces?|lbs?|pounds?|fl\s*oz|tsp|tbsp|tablespoons?|teaspoons?|inches?|cm|mm|pints?|quarts?|gallons?)'
 def conversion(m):
  primary=re.search(number+r'[0-9¼½¾⅓⅔⅛⅜⅝⅞. /–-]*\s*'+unit+r'\s*$',line[:m.start()],re.I)
  words=re.sub(unit+r'\b|\b(?:US|UK|about|approximately|approx|or|a|bit|over|to)\b','',m[1],flags=re.I)
  only_amounts=re.fullmatch(r'[0-9¼½¾⅓⅔⅛⅜⅝⅞\s.,/~–-]+',words)
  return '' if primary and only_amounts else m[0]
 return clean(re.sub(r'\s*\(([^()]*)\)',conversion,line))
def extract_sections(content):
 d=Document();d.feed(content);body=next((n for n in d.root.walk() if 'mw-parser-output' in n.attrs.get('class','').split()),d.root);nodes=list(body.walk());headings=[(i,n,int(n.tag[1])) for i,n in enumerate(nodes) if re.fullmatch('h[2-4]',n.tag)]
 def sections(pattern):
  result=[]
  for i,n,level in headings:
   if not re.fullmatch(pattern,clean(n.text()),re.I):continue
   end=next((j for j,_,l in headings if j>i and l<=level),len(nodes));result.append(nodes[i+1:end])
  return result
 ingredients=sections('Ingredients?');methods=sections('Procedure|Preparation|Directions|Method|Instructions')
 if len(ingredients)!=1 or len(methods)!=1:raise ValueError('Missing or ambiguous ingredients/procedure sections')
 def items(section):
  allowed=set(section);result=[]
  for n in section:
   if n.tag!='li':continue
   p=n.parent;nested=False
   while p in allowed:
    if p.tag=='li':nested=True;break
    p=p.parent
   if not nested:
    line=clean(n.text())
    if line:result.append(line)
  return result
 if any(n.tag in ('h3','h4','table') for section in ingredients+methods for n in section):raise ValueError('Multi-component or alternative-method page requires separate editorial work')
 ing=items(ingredients[0]);steps=[];notes=[]
 if any(re.search(r'\b(?:full\s+)?(?:order|batch|recipe)s?\s+of\b',line,re.I) for line in ing):raise ValueError('Ingredient depends on another recipe batch')
 intro_end=next(i for i,n,_ in headings if re.fullmatch('Ingredients?',clean(n.text()),re.I))
 for n in nodes[:intro_end]:
  if n.tag!='p' or not clean(n.text()) or clean(n.text()).startswith('Cookbook |'):continue
  parent=n.parent;navigation=False
  while parent and parent!=body:
   if parent.tag in ('table','nav') or re.search('navbox|infobox|noprint|metadata',parent.attrs.get('class','')):navigation=True;break
   parent=parent.parent
  if not navigation:notes.append(clean(n.text()))
 for n in methods[0]:
  if n.tag not in ('li','p'):continue
  parent=n.parent;inside=False
  while parent in set(methods[0]):
   if parent.tag=='li':inside=True;break
   parent=parent.parent
  if not inside and clean(n.text()):steps.append(clean(n.text()))
 for s in sections('Notes?(?:,? tips)?(?:,? and variations)?|Notes? and tips|Tips(?:,? and variations)?|Variations|Serving(?: suggestions)?'):
  note_items=items(s)
  if note_items:notes.extend(note_items)
  else:notes.extend(clean(n.text()) for n in s if n.tag=='p' and clean(n.text()))
 if not ing or not steps or len(ing)>100 or len(steps)>150 or len(notes)>50 or any(len(x)>350 for x in ing) or any(len(x)>3000 for x in steps+notes):raise ValueError('Incomplete or excessive recipe text')
 if any(n.tag=='math' for s in ingredients+methods for n in s):raise ValueError('Unsupported recipe math')
 if any(re.search(r'(?:follow|see|use) (?:the )?(?:recipe|instructions) (?:for|at|above|below)|as (?:described|directed) (?:in|at)|see.*(?:recipe|subrecipe)',x,re.I) for x in steps):raise ValueError('Method depends on another recipe')
 return ing,steps,notes

FAVOURITES=['Whole Wheat Pancakes','French Toast','Basic Scrambled Eggs','Basic Omelet','Banana Bread I','Blueberry Pancakes','Scottish Porridge','Upma','Hummus','Guacamole','Guacamole (Chile-Free)','Tomato Soup','Lentil Soup','Vegetable Soup','Greek Salad','Tabouli','Falafel','Chapati','Fried Rice','Chicken Curry','Chicken Curry (Mediterranean-inspired)','Chicken Biryani','Dal','Spaghetti Bolognese','Macaroni and Cheese','Pizza','Chocolate Chip Cookies II','Brownies','Chocolate Cake','Rice Pudding','Apple Crumble','Scones','Garlic Bread','Potato Salad','Mashed Potatoes','Roasted Potatoes','Vegetable Curry','Chili Con Carne','Ratatouille','Pasta Salad','Oatmeal Cookies','Fruit Salad','Cheese Omelette','Spanish Omelet','Almond Pancakes','Banana Nutmeg Pancakes','Chicken Fried Rice','Shakshuka II','Minestrone','Carrot Soup','Peanut Butter Cookies','Shortbread']
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--limit',type=int,default=50);parser.add_argument('--cached-only',action='store_true');parser.add_argument('--cache',default='.superpowers/sdd/2026-10-28-complete-recipes/sources');args=parser.parse_args()
 if args.limit<1 or args.limit>50:raise ValueError('Bounded release limit1–50')
 root=pathlib.Path('.');cache=pathlib.Path(args.cache);cache.mkdir(parents=True,exist_ok=True)
 queue=json.loads((root/'data/wikibooks-research-queue.json').read_text())['recipes'];category_snapshot=json.loads((root/'data/wikibooks-category-evidence.json').read_text());categories={r['sourcePageId']:r['categoryLabels'] for r in category_snapshot['recipes']}
 eligible=[r for r in queue if not any(re.search('incomplete|disambiguation|foodista|obsolete|stub|needs? (?:revision|review)',c,re.I) for c in categories.get(r['sourcePageId'],[]))]
 candidates=[]
 for name in FAVOURITES:
  matches=[r for r in eligible if r['title'].casefold()==name.casefold()];matches=matches or [r for r in eligible if r['title'].casefold().startswith(name.casefold()+' (')]
  if matches:candidates.append(matches[0])
 for course in ['Breakfast recipes','Main course recipes','Dessert recipes','Appetizer recipes','Salad recipes','Soup recipes']:
  candidates.extend(r for r in eligible if course in categories.get(r['sourcePageId'],[]) and 'Easy recipes' in categories.get(r['sourcePageId'],[]) and len(r['title'])<65)
 candidates=list({r['sourcePageId']:r for r in candidates}.values());candidates=candidates if args.cached_only else candidates[:180]
 checked=datetime.datetime.now(datetime.timezone.utc).isoformat();accepted=[];attempts=[]
 # Single publisher, one request in flight; stop on rate/access restrictions.
 blocked=threading.Event()
 def cached_source(row):
  f=cache/(str(row['sourcePageId'])+'.json')
  if f.exists():return json.loads(f.read_text())
  if args.cached_only:raise ValueError('Source not cached')
  if blocked.is_set():raise ValueError('Source access restricted; no further requests')
  url='https://en.wikibooks.org/w/api.php?'+urllib.parse.urlencode(dict(action='parse',pageid=row['sourcePageId'],prop='text|revid|categories|displaytitle',format='json'))
  request=urllib.request.Request(url,headers={'User-Agent':'Tasteit/1.0 (licensed Cookbook text; revision attribution retained)'})
  try:
   with urllib.request.urlopen(request,timeout=30) as response:raw=json.load(response)
  except urllib.error.HTTPError as error:
   if error.code in (403,429):blocked.set()
   raise
  temp=f.with_suffix('.tmp');temp.write_text(json.dumps(raw,ensure_ascii=False));temp.replace(f);return raw
 executor=concurrent.futures.ThreadPoolExecutor(max_workers=1)
 futures={r['sourcePageId']:executor.submit(cached_source,r) for r in candidates}
 for row in candidates:
  page_id=row['sourcePageId'];file=cache/(str(page_id)+'.json')
  try:
   raw=futures[page_id].result()
   p=raw['parse'];fresh_cats=[x['*'].replace('_',' ') for x in p['categories']];cats=fresh_cats or categories.get(page_id,[])
   if any(re.search('incomplete|disambiguation|foodista|stub',x,re.I) for x in cats):raise ValueError('Source is not a complete main recipe')
   if page_id in (21781, 21794, 33413, 86404, 32973, 217149, 29475, 62605, 200040, 178934, 200854, 94105, 22934):raise ValueError('Editorial exclusion: inconsistent measurement or alternative methods')
   ing,steps,notes=extract_sections(p['text']['*']);ing=[primary_amount(x) for x in ing];title=p['title'];canonical='https://en.wikibooks.org/wiki/'+urllib.parse.quote(title.replace(' ','_'),safe=':()');revision=p['revid']
   course=next((label for cat,label in [('Breakfast recipes','Breakfast'),('Main course recipes','Main'),('Dessert recipes','Dessert'),('Appetizer recipes','Appetiser'),('Salad recipes','Salad'),('Soup recipes','Soup'),('Side dish recipes','Side')] if cat in cats),'Other')
   record=dict(id='wikibooks-'+str(page_id),source='wikibooks',url=canonical,title=title.removeprefix('Cookbook:'),author='Wikibooks contributors',cuisine='',category=course,categoryEvidenceAt=checked if fresh_cats else category_snapshot['collectedAt'],ingredients=ing,rating=None,photoUrl=None,checkedAt=checked,method=dict(steps=steps,notes=notes,pageId=page_id,revision=revision,revisionUrl='https://en.wikibooks.org/w/index.php?'+urllib.parse.urlencode(dict(title=title,oldid=revision)),historyUrl='https://en.wikibooks.org/w/index.php?'+urllib.parse.urlencode(dict(title=title,action='history')),license='CC-BY-SA-4.0',licenseUrl='https://creativecommons.org/licenses/by-sa/4.0/',attribution='Wikibooks contributors',changes='Links and formatting converted to plain text. Source primary quantities retained; secondary parenthetical unit conversions omitted where present. Procedure wording retained; introductory recipe context retained as notes.'))
   accepted.append(record);attempts.append(dict(id=page_id,status='accepted',revision=revision,sourceHash=hashlib.sha256(p['text']['*'].encode()).hexdigest()));print('Accepted',len(accepted),record['title'],len(ing),len(steps),flush=True)
  except Exception as e:attempts.append(dict(id=page_id,status='excluded',reason=str(e)));print('Excluded',row['title'],str(e),flush=True)
  (cache/'attempts.json').write_text(json.dumps(attempts,indent=2))
  if len(accepted)>=args.limit:break
 executor.shutdown(wait=True,cancel_futures=True)
 if len(accepted)!=args.limit:raise ValueError('Insufficient complete recipes; do not publish partial collection')
 (root/'data/complete-recipes.json').write_text(json.dumps(dict(version=1,source='wikibooks',checkedAt=checked,licenseInfo='https://en.wikibooks.org/wiki/Wikibooks:Copyrights',recipes=accepted),ensure_ascii=False,indent=2)+'\n')
 print('Collected',len(accepted),'complete CC BY-SA4.0 recipe texts; no ratings/photos invented.')
if __name__=='__main__':main()
