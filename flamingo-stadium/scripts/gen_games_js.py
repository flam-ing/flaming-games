# Generates games.js (hub card data) from optional metadata + the game files themselves.
import json,re,os,sys
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER=[('splash',"Magikarp's Splash",1),('says','Clefairy Says',1),('run','Run Rattata Run',1),('snore','Snore War',1),('dynamo','Thundering Dynamo',1),('dig','Dig! Dig! Dig!',1),('hoop',"Ekans' Hoop Hurl",1),('harden','Rock Harden',1),('sushi','Sushi-Go-Round',1),
 ('golbat','Gutsy Golbat',2),('clearcut','Clear Cut Challenge',2),('furret',"Furret's Frolic",2),('delibird',"Delibird's Delivery",2),('eggs','Egg Emergency',2),('togepi','Tumbling Togepi',2),('pichu',"Pichu's Power Plant",2),('stampede','Streaming Stampede',2),('rollout','Rampage Rollout',2),('barrier','Barrier Ball',2),('topsy','Topsy-Turvy',2),('eevee','Eager Eevee',2)]
meta={}
for p in sys.argv[1:]:
    try: meta.update(json.load(open(p)))
    except Exception as e: print('skip',p,e)
out=[]
for id,orig,series in ORDER:
    f=os.path.join(ROOT,'games',id+'.html')
    if not os.path.exists(f): continue
    s=open(f,encoding='utf-8').read()
    m=meta.get(id,{})
    title=m.get('koreanTitle') or (re.search(r"title:\s*'([^']+)'",s) or re.search(r'title:\s*"([^"]+)"',s) or [None,''])[1]
    howto=re.search(r"howto:\s*\[(.*?)\]",s,re.S)
    lines=re.findall(r"'([^']+)'|\"([^\"]+)\"",howto.group(1)) if howto else []
    lines=[a or b for a,b in lines]
    blurb=m.get('blurb') or (lines[0] if lines else '')
    bar=re.search(r'<span>조작:\s*([^<]+)</span>',s)
    controls=m.get('controls') or (bar.group(1).strip() if bar else '')
    out.append(dict(id=id,orig=orig,series=series,title=title,blurb=blurb,controls=controls,render3d=id in {"splash", "run", "topsy"}))
open(os.path.join(ROOT,'games.js'),'w',encoding='utf-8').write('window.GAMES_DATA='+json.dumps(out,ensure_ascii=False,indent=1)+';\n')
print(len(out),'games written')
