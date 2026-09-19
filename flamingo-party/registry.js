import * as partyE from './games/party_e.js';
import * as generation8b from './games/generation8b.js';
import * as later5 from './games/later5.js';
import * as classics7 from './games/classics7.js';
import * as generation8a from './games/generation8a.js';
import * as handheld7 from './games/handheld7.js';
import * as handheld6 from './games/handheld6.js';
import * as classics6 from './games/classics6.js';
import * as later4 from './games/later4.js';
import * as generation4d from './games/generation4d.js';
import * as generation4c from './games/generation4c.js';
import * as handheld5 from './games/handheld5.js';
import * as generation4b from './games/generation4b.js';
import * as later3 from './games/later3.js';
import * as classics5 from './games/classics5.js';
import * as handheld4 from './games/handheld4.js';
import * as remastered from './games/remastered.js';
import * as classics4 from './games/classics4.js';
import * as dungeon from './games/dungeon.js';
import * as jamboree2 from './games/jamboree2.js';
import * as handheld3 from './games/handheld3.js';
import * as generation4 from './games/generation4.js';
import * as generation5 from './games/generation5.js';
import * as featured from './games/featured.js';
import * as modern from './games/modern.js';
import * as modern2 from './games/modern2.js';
import * as modern3 from './games/modern3.js';
import * as later from './games/later.js';
import * as classics from './games/classics.js';
import * as later2 from './games/later2.js';
import * as handheld from './games/handheld.js';
import * as jamboree from './games/jamboree.js';
import * as classics2 from './games/classics2.js';
import * as modern4 from './games/modern4.js';
import * as classics3 from './games/classics3.js';
import * as handheld2 from './games/handheld2.js';
const modernTitles=['super-mario-party','jamboree'];
const packs=[
 {pack:partyE},
 {pack:generation8b},
 {pack:later5},
 {pack:classics7},
 {pack:generation8a},
 {pack:handheld7},
 {pack:handheld6},
 {pack:classics6},
 {pack:later4},
 {pack:generation4d},
 {pack:generation4c},
 {pack:handheld5},
 {pack:generation4b},
 {pack:later3},
 {pack:classics5},
 {pack:handheld4},
 {pack:remastered},
 {pack:classics4},
 {pack:dungeon},
 {pack:jamboree2},{pack:handheld3},
 {pack:generation4},{pack:generation5},
 {pack:featured,titles:{Booksquirm:['mp4','top-100','superstars'],Slaparazzi:['super-mario-party'],'Sizzling Stakes':['super-mario-party']}},
 {pack:modern4},{pack:jamboree},{pack:modern,defaults:modernTitles},{pack:modern2,defaults:modernTitles},{pack:modern3,defaults:modernTitles},
 {pack:later,defaults:['mp6','mp7','mp8','mp9','mp10']},{pack:later2},{pack:handheld},{pack:handheld2},{pack:classics},{pack:classics2},{pack:classics3}
];
export const normalize=name=>String(name).toLowerCase().replace(/[^a-z0-9]/g,'');
const definitions=new Map();
for(const {pack,titles,defaults}of packs)for(const [name,factory]of Object.entries(pack.games)){const key=normalize(name);if(!definitions.has(key))definitions.set(key,[]);definitions.get(key).push({factory,note:pack.notes?.[name],titles:pack.supportedTitles?.[name]||titles?.[name]||defaults||[]});}
export function definition(meta){return definitions.get(normalize(meta.originalName))?.find(d=>d.titles.includes(meta.titleId));}
export function getGame(meta){return definition(meta)?.factory;}
export function getNotes(meta){return definition(meta)?.note;}
export const games=Object.assign({},...packs.map(p=>p.pack.games));
