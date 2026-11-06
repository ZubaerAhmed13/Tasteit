"""Static audit: Commons thumbnail URL must be derived from its credited file title.

This checks path integrity and attribution linkage without making HTTP requests.
It cannot by itself prove external hosting availability or the photo subject.
"""
import hashlib, json, pathlib, sys, urllib.parse

root=pathlib.Path(__file__).resolve().parent.parent
photos=json.loads((root/'data/ingredient-photos.json').read_text(encoding='utf-8'))['photos']
issues=[]
for photo in photos:
    image=urllib.parse.urlparse(photo.get('url',''))
    credit=urllib.parse.urlparse(photo.get('filePage',''))
    prefix='/wikipedia/commons/thumb/'
    if (image.scheme!='https' or image.netloc!='thumb.wikimedia.org'
            or credit.scheme!='https' or credit.netloc!='commons.wikimedia.org'
            or not credit.path.startswith('/wiki/File:') or not image.path.startswith(prefix)):
        issues.append((photo.get('id','?'),'unsupported file/thumbnail host or path'))
        continue
    pieces=image.path[len(prefix):].split('/')
    if len(pieces)!=4:
        issues.append((photo['id'],'thumbnail URL has unexpected number of segments'))
        continue
    initial,second,filename,thumbnail=pieces
    filename=urllib.parse.unquote(filename).replace(' ','_')
    source=urllib.parse.unquote(credit.path.split('/wiki/File:',1)[1]).replace(' ','_')
    thumb_filename=urllib.parse.unquote(thumbnail)
    expected=hashlib.md5(filename.encode('utf-8')).hexdigest()
    if filename!=source:
        issues.append((photo['id'],f'photo URL and original file name differ: {filename} / {source}'))
    if initial!=expected[:1] or second!=expected[:2]:
        issues.append((photo['id'],f'thumbnail hash mismatch: have {initial}/{second}, expected {expected[0]}/{expected[:2]}'))
    if thumb_filename!='250px-'+filename:
        issues.append((photo['id'],f'thumbnail rendition name differs: {thumb_filename}'))
    if not photo.get('verified') or not photo.get('creator') or not photo.get('licenceUrl'):
        issues.append((photo['id'],'original file attribution/licensing incomplete'))

print(f'Commons photo path audit: {len(photos)} records; {len(issues)} inconsistencies')
for item,issue in issues:print(f'  {item}: {issue}')
if '--strict' in sys.argv and issues:sys.exit(1)
