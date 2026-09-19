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
import * as handheld2 from './games/handheld2.js';
const modernTitles=['super-mario-party','jamboree'];
const packs=[
 {pack:featured,titles:{Booksquirm:['mp4'],Slaparazzi:['super-mario-party'],'Sizzling Stakes':['super-mario-party']}},
 {pack:modern4},{pack:jamboree},{pack:modern,defaults:modernTitles},{pack:modern2,defaults:modernTitles},{pack:modern3,defaults:modernTitles},
 {pack:later,defaults:['mp6','mp7','mp8','mp9','mp10']},{pack:later2},{pack:handheld},{pack:handheld2},{pack:classics},{pack:classics2}
];
export const normalize=name=>String(name).toLowerCase().replace(/[^a-z0-9]/g,'');
const definitions=new Map();
for(const {pack,titles,defaults}of packs)for(const [name,factory]of Object.entries(pack.games)){const key=normalize(name);if(!definitions.has(key))definitions.set(key,[]);definitions.get(key).push({factory,note:pack.notes?.[name],titles:pack.supportedTitles?.[name]||titles?.[name]||defaults||[]});}
export function definition(meta){return definitions.get(normalize(meta.originalName))?.find(d=>d.titles.includes(meta.titleId));}
export function getGame(meta){return definition(meta)?.factory;}
export function getNotes(meta){return definition(meta)?.note;}
export const games=Object.assign({},...packs.map(p=>p.pack.games));
