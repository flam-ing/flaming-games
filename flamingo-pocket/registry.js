import {games as sports} from './games/sports.js';
import {games as tap} from './games/tap.js';
import {games as puzzle} from './games/puzzle.js';
export const games=[...sports,...tap,...puzzle];
export const categories={sports:{label:'운동회',en:'FIELD DAY',description:'각도, 리듬, 한 끗의 타이밍. 분홍 선수의 최고 기록에 도전하세요.',color:'#c7d8b6'},tap:{label:'한 버튼',en:'ONE MORE TAP',description:'누르고, 기다리고, 놓고. 손끝 하나로 만드는 짧고 긴장되는 한 판.',color:'#efc4b5'},puzzle:{label:'광고 속 퍼즐',en:'THINK & PLAY',description:'핀 뽑기부터 주차 탈출까지. 고른 퍼즐을 바로 풀어보세요.',color:'#bdd5df'}};
if(new Set(games.map(g=>g.id)).size!==games.length)throw new Error('Duplicate game IDs');
