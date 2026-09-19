import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Session} from '../core.js';
import {getGame} from '../registry.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../catalog.json',import.meta.url),'utf8'));
const selected=catalog.titles.flatMap(t=>t.selected.map(g=>({...g,titleId:t.id})));
const results=[];let issues=0;
for(const meta of selected.filter(getGame))for(const seed of [17,93]){
 let draws=0;const failures=[];const draw=(id,type,props)=>{draws++;for(const [key,value]of Object.entries(props))if(typeof value==='number'&&!Number.isFinite(value))throw new Error(`Invalid draw ${id}.${key}=${value}`);};
 try{const s=new Session(getGame(meta),meta,{humans:0,seed,draw});assert(s.limit>0&&(s.limit<=900||s.limit===Infinity),'reasonable duration');const max=Math.ceil((Number.isFinite(s.limit)?s.limit+2:600)*60);for(let frame=0;frame<max&&!s.ended;frame++){s.step(1/60);if(frame%60===0)for(const p of s.players)for(const k of ['x','y','z','score'])assert(Number.isFinite(p[k]),`${p.i}.${k} finite`);}assert(s.ended,'must naturally finish');assert(draws>0,'must render game scene');assert(s.result.winners.every(i=>Number.isInteger(i)&&i>=0&&i<4),'valid winners');assert(s.time>=.2,'no immediate game over');assert(s.time<=s.limit+.04,'respects timer');results.push({game:meta.originalName,title:meta.titleId,seed,time:+s.time.toFixed(3),winners:s.result.winners,score:s.result.scores,draws});}catch(e){issues++;results.push({game:meta.originalName,title:meta.titleId,seed,error:e.stack});console.error(meta.titleId,meta.originalName,seed,e.message);}
}
const out={tested:results.length,issues,results};fs.mkdirSync(new URL('./out/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./out/simulation.json',import.meta.url),JSON.stringify(out,null,2));console.log(JSON.stringify({tested:results.length,issues},null,2));if(issues)process.exitCode=1;
