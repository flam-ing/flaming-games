import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {games} from '../registry.js';

const root=new URL('../',import.meta.url),hash=data=>createHash('sha256').update(data).digest('hex');
const paths=['index.html','style.css','app.js','registry.js','core.js','draw.js','icon.svg','poster.svg','games/sports.js','games/tap.js','games/puzzle.js'];
const assets=Object.fromEntries(paths.map(path=>[path,hash(fs.readFileSync(new URL(path,root)))]));
const manifest={release:'flamingo-pocket-36-'+hash(JSON.stringify(assets)).slice(0,16),games:games.length,categories:Object.fromEntries(['sports','tap','puzzle'].map(k=>[k,games.filter(g=>g.category===k).length])),assets};
const target=process.argv[2];
if(!target){fs.writeFileSync(new URL('release.json',root),JSON.stringify(manifest,null,2)+'\n');console.log(manifest.release);}
else{
 const base=target.endsWith('/')?target:target+'/',fetchFile=async path=>{const response=await fetch(new URL(path,base),{cache:'no-store'});assert.ok(response.ok,path+' HTTP '+response.status);return Buffer.from(await response.arrayBuffer());};
 const remote=JSON.parse(await fetchFile('release.json'));assert.deepEqual(remote,manifest,'Live release does not match this checkout');
 await Promise.all(paths.map(async path=>assert.equal(hash(await fetchFile(path)),assets[path],path+' live content mismatch')));
 console.log(JSON.stringify({url:base,release:remote.release,games:remote.games,verifiedAssets:paths.length}));
}
