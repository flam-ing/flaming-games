import { C, clamp, circle, rect, line, text, bird, bg, button, hit, distance } from '../draw.js';

// Original compact puzzles: handcrafted layouts and deliberately disclosed browser rules.
const COLORS=[C.pink,C.blue,C.gold,C.mint,C.rose];
const blank=()=>({x:0,y:0,a:false,b:false,pointer:{x:0,y:0,down:false,valid:false}});
const clone=v=>JSON.parse(JSON.stringify(v));
const tap=(x,y,down=true)=>({...blank(),pointer:{x,y,down,valid:true}});
function pulseBot(){let held=false;return(x,y)=>{held=!held;return tap(x,y,held);};}
function frame(ctx,title,sub){bg(ctx,{sky:'#f3f2e7',ground:'#dedec6',groundY:530});text(ctx,title,450,49,29);text(ctx,sub,450,83,17,C.teal);}
function nav(s,input,dt,n,cols=1){s.nav=Math.max(0,(s.nav||0)-dt);const x=Math.sign(input.x||0),y=Math.sign(input.y||0);if(!x&&!y)s.nav=0;else if(s.nav<=0){s.focus=((s.focus||0)+x+y*cols+n)%n;s.nav=.18;}}
function choice(s,input,boxes){if(input.pointer?.pressed){const p=input.pointer;return boxes.findIndex(b=>hit(p,b.x,b.y,b.w,b.h));}return input.ap?s.focus:-1;}
function focusBox(ctx,s,i,b){if(s.focus===i){ctx.setLineDash([5,4]);rect(ctx,b.x-4,b.y-4,b.w+8,b.h+8,'transparent',10,C.teal);ctx.setLineDash([]);}}
function stageGame(env,design){let level=0,score=0,resets=0,moves=0,done=false,wait=0,failed='',notice='';let s=design.init(0);const click=pulseBot();
 const api={env,get level(){return level;},get score(){return score;},get failed(){return failed;},get waiting(){return wait>0;},move(msg=''){moves++;notice=msg;env.sound('tap');},say(msg){notice=msg;},fail(msg){if(!failed){failed=msg;env.sound('bad');}},clear(){if(!wait&&!failed){score+=Math.max(100,300-moves*3);wait=1;env.sound('good');}},click};
 function reset(){s=design.init(level);failed='';notice='다시 시작했어요';moves=0;resets++;wait=0;env.sound('tap');}
 return {update(dt,input){if(done)return; if(!wait&&(input.bp||input.pointer?.pressed&&hit(input.pointer,734,538,142,44))){reset();return;}if(wait){wait-=dt;if(wait<=0){wait=0;level++;if(level===3){done=true;env.finish({score:Math.max(0,score-resets*10),outcome:'clear',message:'직접 설계한 3단계를 모두 해결했어요!'});}else{s=design.init(level);moves=0;notice='';}}return;}if(failed)return;design.update(s,dt,input,api);},draw(ctx){design.draw(ctx,s,api);button(ctx,'B 다시',734,538,142,44,{});text(ctx,`${level+1} / 3 · ${moves}회`,93,562,18);if(wait)text(ctx,'해결! 다음 단계로…',450,513,23,C.teal);else if(failed){rect(ctx,145,467,610,53,C.white,16);text(ctx,`${failed} · B로 다시`,450,499,19,C.red);}else if(notice)text(ctx,notice,450,513,18,C.teal);},hud(){return{score:Math.max(0,score-resets*10),label:'단계',value:`${Math.min(level+1,3)} / 3`,hint:failed?`${failed} · B 다시`:notice||design.hint,progress:level/3};},bot(){if(wait||done)return blank();if(failed)return{...blank(),b:true};return design.bot(s,api);},snapshot(){return{level,score,moves,resets,failed,wait,done,state:design.snapshot?design.snapshot(s):s};}};
}
function entry(id,name,kicker,description,controls,objective,inspiration,sourceUrl,adaptation,create,medal=[400,650,800]){return{id:`puzzle-${id}`,name,category:'puzzle',kicker,description,controls,objective,inspiration,sourceUrl,adaptation,color:C.teal,medal,create};}

function pins(env){return stageGame(env,{
 hint:'물을 먼저 흘려 용암을 굳힌 뒤, 둥지로 이어진 핀을 빼세요.',
 init(l){return{focus:0,nav:0,pins:Array([3,4,5][l]).fill(false),cold:[false,false],water:[true,true],t:0};},
 update(s,dt,i,a){s.t+=dt;const l=a.level,boxes=this.boxes(l);nav(s,i,dt,boxes.length);const k=choice(s,i,boxes);if(k<0||s.pins[k])return;s.pins[k]=true;a.move();
  if(k===boxes.length-1){a.fail('둥지의 바닥이 열렸어요');return;}
  if(l===1){if(s.pins[0]&&s.pins[1]){s.cold[0]=true;s.water[0]=false;}if(k===2&&!s.cold[0]){a.fail('뜨거운 용암이 둥지로 흘렀어요');return;}if(s.pins[0]&&!s.pins[1])a.say('물이 중간 방에 모였어요. 아래 핀을 여세요.');else if(s.cold[0])a.say('중간 방의 물이 용암을 식혔어요.');if(s.pins.slice(0,3).every(Boolean))a.clear();return;}
  if(k===0||(l===2&&k===2)){const basin=k===0?0:1;s.cold[basin]=true;s.water[basin]=false;a.say('물과 용암이 만나 안전한 돌이 되었어요.');}
  else{const basin=k===1?0:1;if(!s.cold[basin])a.fail('뜨거운 용암이 둥지로 흘렀어요');else a.say('식은 돌이 안전하게 내려왔어요.');}
  if(!a.failed&&s.pins[0]&&s.pins[1]&&(l!==2||s.pins[2]&&s.pins[3]))a.clear();
 },
 boxes(l){if(l===2)return[{x:188,y:211,w:124,h:54},{x:188,y:346,w:124,h:54},{x:588,y:211,w:124,h:54},{x:588,y:346,w:124,h:54},{x:388,y:445,w:124,h:47}];if(l===1)return[{x:388,y:174,w:124,h:45},{x:388,y:273,w:124,h:45},{x:388,y:365,w:124,h:45},{x:388,y:457,w:124,h:40}];return[{x:388,y:211,w:124,h:54},{x:388,y:346,w:124,h:54},{x:388,y:445,w:124,h:47}];},
 draw(ctx,s,a){frame(ctx,'핀 하나의 온도','물 → 용암을 식히기 → 둥지로 보내기. 바닥 핀은 조심!');const l=a.level;
  if(l===1){rect(ctx,373,112,154,66,s.pins[0]?C.white:C.blue,10,C.ink);text(ctx,'물',450,150,21);rect(ctx,373,215,154,62,s.pins[0]&&!s.pins[1]?C.blue:C.white,10,C.ink);text(ctx,'중간 방',450,252,20);rect(ctx,373,314,154,57,s.cold[0]?C.mint:C.red,10,C.ink);text(ctx,s.cold[0]?'식은 돌':'용암',450,349,21);rect(ctx,373,408,154,73,C.white,10,C.ink);bird(ctx,450,464,43);}
  else{const dual=l===2;for(let basin=0;basin<(dual?2:1);basin++){const x=dual?250+basin*400:450;rect(ctx,x-77,117,154,108,C.white,12,C.ink);if(s.water[basin])rect(ctx,x-66,145,132,67,C.blue,7);text(ctx,'물',x,175,23);line(ctx,x,226,x,270,C.ink,9);rect(ctx,x-77,268,154,91,s.cold[basin]?C.mint:C.red,10,C.ink);text(ctx,s.cold[basin]?'식은 돌':'용암',x,318,23);line(ctx,x,360,450,426,C.ink,9);}rect(ctx,367,393,166,82,C.white,14,C.ink);bird(ctx,450,452,49);}
  this.boxes(l).forEach((b,k)=>{rect(ctx,b.x,b.y,b.w,b.h,s.pins[k]?C.mint:C.gold,12,C.ink);text(ctx,s.pins[k]?'열림':`${k+1} ━`,b.x+b.w/2,b.y+b.h/2,23,C.ink);focusBox(ctx,s,k,b);});
 },
 bot(s,a){const seq=a.level===2?[0,2,1,3]:a.level===1?[0,1,2]:[0,1],k=seq.find(j=>!s.pins[j]);const b=this.boxes(a.level)[k??0];return a.click(b.x+b.w/2,b.y+b.h/2);}
 });}

const PARK_LEVELS=[
 [{x:0,y:2,n:2,d:0},{x:2,y:1,n:2,d:1},{x:2,y:4,n:2,d:0},{x:4,y:0,n:2,d:1},{x:0,y:0,n:2,d:2}],
 [{x:0,y:1,n:2,d:0},{x:3,y:0,n:3,d:1},{x:3,y:4,n:2,d:0},{x:5,y:2,n:2,d:3},{x:0,y:5,n:3,d:2},{x:1,y:2,n:2,d:1}],
 [{x:0,y:2,n:2,d:0},{x:2,y:1,n:3,d:1},{x:2,y:4,n:2,d:0},{x:4,y:3,n:2,d:3},{x:4,y:1,n:2,d:0},{x:0,y:0,n:2,d:2},{x:0,y:4,n:2,d:1}]
];
const DIRS=[[1,0],[0,1],[-1,0],[0,-1]];
function cells(car){return Array.from({length:car.n},(_,j)=>[car.x+(car.d%2===0?j:0),car.y+(car.d%2?j:0)]);}
function canExit(cars,k){const c=cars[k],d=DIRS[c.d],all=new Set(cars.flatMap((q,j)=>j===k||q.gone?[]:cells(q).map(v=>v.join())));let x=c.x+(c.d===0?c.n-1:0),y=c.y+(c.d===1?c.n-1:0);while(true){x+=d[0];y+=d[1];if(x<0||x>=6||y<0||y>=6)return true;if(all.has([x,y].join()))return false;}}
function parking(env){return stageGame(env,{
 hint:'차의 화살표 방향이 비었을 때 내보내세요. 막히면 다른 차부터!',
 init(l){return{cars:clone(PARK_LEVELS[l]),focus:0,nav:0,bumps:0};},
 boxes(s){return s.cars.map(c=>({x:246+c.x*68,y:116+c.y*68,w:(c.d%2===0?c.n:1)*68-8,h:(c.d%2?c.n:1)*68-8}));},
 update(s,dt,i,a){nav(s,i,dt,s.cars.length);const k=choice(s,i,this.boxes(s));if(k<0||s.cars[k].gone)return;if(!canExit(s.cars,k)){s.bumps++;a.say('앞을 막은 차부터 빼 주세요.');a.env.sound('bad');return;}s.cars[k].gone=true;a.move('슝! 한 대가 빠져나갔어요.');if(s.cars.every(c=>c.gone))a.clear();},
 draw(ctx,s,a){frame(ctx,'홍학 주차 대소동','화살표를 누르면 그 방향으로 출차 · 방향키로 선택, A 출차');rect(ctx,234,104,426,426,'#d6dfd5',15,C.ink);for(let r=0;r<6;r++)for(let c=0;c<6;c++)rect(ctx,246+c*68,116+r*68,60,60,'#eef0df',7);this.boxes(s).forEach((b,k)=>{const car=s.cars[k];if(car.gone)return;rect(ctx,b.x,b.y,b.w,b.h,COLORS[k%5],12,C.ink);text(ctx,['→','↓','←','↑'][car.d],b.x+b.w/2,b.y+b.h/2+10,35);text(ctx,k+1,b.x+17,b.y+23,17);focusBox(ctx,s,k,b);});bird(ctx,770,436,74);},
 bot(s,a){const k=s.cars.findIndex((c,j)=>!c.gone&&canExit(s.cars,j));if(k<0)return blank();const b=this.boxes(s)[k];return a.click(b.x+b.w/2,b.y+b.h/2);}
 });}

const WATER_LEVELS=[[[0,1,0],[1,0,1],[],[]],[[0,1,2],[2,0,1],[1,2,0],[],[]],[[0,1,2,0],[1,2,0,1],[2,0,1,2],[],[]]];
function pour(v,a,b,cap){if(a===b||!v[a].length||v[b].length===cap)return false;const color=v[a].at(-1);if(v[b].length&&v[b].at(-1)!==color)return false;let amount=0;for(let k=v[a].length-1;k>=0&&v[a][k]===color;k--)amount++;amount=Math.min(amount,cap-v[b].length);while(amount--)v[b].push(v[a].pop());return true;}
function sorted(v,cap){return v.every(t=>!t.length||t.length===cap&&t.every(c=>c===t[0]));}
function solveWater(v,cap){const start=JSON.stringify(v),q=[[v,[]]],seen=new Set([start]);for(let at=0;at<q.length&&at<100000;at++){const [cur,path]=q[at];if(sorted(cur,cap))return path;for(let a=0;a<cur.length;a++)for(let b=0;b<cur.length;b++){const n=clone(cur);if(!pour(n,a,b,cap))continue;const key=JSON.stringify(n);if(!seen.has(key)){seen.add(key);q.push([n,[...path,[a,b]]]);}}}return[];}
function water(env){return stageGame(env,{
 hint:'같은 숫자의 물끼리만 부을 수 있어요. 빈 병을 작업 공간으로 쓰세요.',
 init(l){const tubes=clone(WATER_LEVELS[l]);return{tubes,cap:l===2?4:3,selected:-1,focus:0,nav:0,history:[],plan:solveWater(tubes,l===2?4:3),botStep:0};},
 boxes(s){return s.tubes.map((_,j)=>({x:450-s.tubes.length*59+j*118,y:156,w:88,h:279}));},
 update(s,dt,i,a){nav(s,i,dt,s.tubes.length);const k=choice(s,i,this.boxes(s));if(k<0)return;if(s.selected<0){if(s.tubes[k].length)s.selected=k;return;}const from=s.selected;s.selected=-1;if(from===k)return;const before=clone(s.tubes);if(pour(s.tubes,from,k,s.cap)){s.history.push(before);s.plan=null;a.move();if(sorted(s.tubes,s.cap))a.clear();}else{a.say('위 색이 같고 빈 공간이 있어야 해요.');a.env.sound('bad');}},
 draw(ctx,s,a){frame(ctx,'핑크 주스 실험실','병 선택 → 받을 병 선택 · 같은 숫자만 붓기 · B 처음부터');bird(ctx,80,465,46);this.boxes(s).forEach((b,j)=>{rect(ctx,b.x-3,b.y-4,b.w+6,b.h+8,C.white,15,s.selected===j?C.rose:C.ink);s.tubes[j].forEach((v,k)=>{const h=(b.h-15)/s.cap;rect(ctx,b.x+6,b.y+b.h-8-(k+1)*h,b.w-12,h-2,COLORS[v],5);text(ctx,v+1,b.x+b.w/2,b.y+b.h-8-k*h-h/2+8,25);});text(ctx,j+1,b.x+b.w/2,b.y+b.h+35,20);focusBox(ctx,s,j,b);});},
 bot(s,a){if(!s.plan)s.plan=solveWater(s.tubes,s.cap);const move=s.plan[0];if(!move)return blank();const k=s.selected<0?move[0]:move[1],b=this.boxes(s)[k];return a.click(b.x+b.w/2,b.y+b.h/2);},
 snapshot(s){return{tubes:s.tubes,selected:s.selected,cap:s.cap};}
 });}

function screws(env){return stageGame(env,{
 hint:'노출된 나사 → 빈 구멍. 판의 나사를 모두 옮기면 아래 판이 드러나요.',
 init(l){const count=l===2?4:3,order=l===1?[1,0,2]:Array.from({length:count},(_,j)=>j);return{count,plates:order.map((p,j)=>({own:[p*2,p*2+1],covers:order.slice(j+1).flatMap(v=>[v*2,v*2+1]),gone:false})),occupied:Array(count*2).fill(true).concat([false,false]),selected:-1,focus:0,nav:0};},
 xy(k){return{x:330+(k%2)*240,y:160+Math.floor(k/2)*72};},
 covered(s,k){return s.plates.some(p=>!p.gone&&p.covers.includes(k));},
 update(s,dt,i,a){nav(s,i,dt,s.occupied.length,2);const boxes=s.occupied.map((_,k)=>{const p=this.xy(k);return{x:p.x-40,y:p.y-40,w:80,h:80};});const k=choice(s,i,boxes);if(k<0)return;if(this.covered(s,k)){a.say('겹친 판을 먼저 떼어내야 해요.');return;}if(s.selected<0){if(s.occupied[k])s.selected=k;return;}if(s.selected===k){s.selected=-1;return;}if(s.occupied[k]){s.selected=k;return;}s.occupied[k]=true;s.occupied[s.selected]=false;s.selected=-1;a.move();for(const p of s.plates)if(!p.gone&&p.own.every(n=>!s.occupied[n])){p.gone=true;a.env.sound('good');}if(s.plates.every(p=>p.gone))a.clear();},
 draw(ctx,s,a){frame(ctx,'나사 빼는 홍반장','나사를 빈 구멍으로 옮기기 · 겹친 판 뒤의 구멍은 사용 불가');rect(ctx,202,109,496,391,'#c9b595',24,C.ink);
  for(let k=0;k<s.occupied.length;k++){const p=this.xy(k);circle(ctx,p.x,p.y,25,'#7e715e');}
  for(let n=s.plates.length-1;n>=0;n--){const plate=s.plates[n];if(plate.gone)continue;const points=[...plate.own,...plate.covers].map(k=>this.xy(k)),lo=Math.min(...points.map(p=>p.y)),hi=Math.max(...points.map(p=>p.y));rect(ctx,280-n*6,lo-30,340+n*12,hi-lo+60,COLORS[n%5],13,C.ink);for(const k of plate.covers){const q=this.xy(k);circle(ctx,q.x,q.y,25,COLORS[n%5],C.white);text(ctx,'겹침',q.x,q.y,13);}}
  for(let k=0;k<s.occupied.length;k++){const p=this.xy(k);if(s.occupied[k]&&!this.covered(s,k)){circle(ctx,p.x,p.y,22,C.white,s.selected===k?C.rose:C.ink,4);line(ctx,p.x-12,p.y,p.x+12,p.y,C.ink,4);}if(!this.covered(s,k))text(ctx,k+1,p.x+(k%2?51:-51),p.y,17);if(s.focus===k)circle(ctx,p.x,p.y,33,'transparent',C.teal,3);}bird(ctx,796,445,68);text(ctx,'빈 구멍 두 개를 번갈아 활용하세요',450,515,17,C.teal);
 },
 bot(s,a){let k;if(s.selected<0)k=s.occupied.findIndex((v,j)=>v&&!this.covered(s,j)&&s.plates.some(p=>!p.gone&&p.own.includes(j)));else k=s.occupied.findIndex((v,j)=>!v&&!this.covered(s,j)&&!s.plates.some(p=>!p.gone&&p.own.includes(j)));if(k<0)return blank();const p=this.xy(k);return a.click(p.x,p.y);}
 });}

function bridge(env){return stageGame(env,{
 hint:'왼쪽 출발점에서 오른쪽 깃발까지 선을 그리세요. 잉크 650, 급경사 주의!',
 init(l){return{path:[],drawing:false,running:false,travel:0,ink:0,cur:{x:220,y:390},inputMode:'keys',obstacles:l===0?[]:l===1?[{x:410,y:330,w:80,h:130}]:[{x:350,y:300,w:200,h:160}],botAt:0,focus:0,nav:0};},
 solution(l){return l===0?[[220,390],[680,390]]:l===1?[[220,390],[350,260],[550,260],[680,390]]:[[220,390],[350,250],[550,250],[680,390]];},
 update(s,dt,i,a){const p=i.pointer;if(p?.pressed)s.inputMode='pointer';if(i.ap||i.x||i.y)s.inputMode='keys';const usingPointer=s.inputMode==='pointer',pressed=usingPointer?p?.pressed:i.ap,down=usingPointer?p?.down:i.a,released=usingPointer?p?.released:i.ar;if(!s.running){if(usingPointer&&p?.valid)s.cur={x:clamp(p.x,170,730),y:clamp(p.y,150,450)};else{s.cur.x=clamp(s.cur.x+(i.x||0)*220*dt,170,730);s.cur.y=clamp(s.cur.y+(i.y||0)*220*dt,150,450);}if(pressed){if(distance(s.cur.x,s.cur.y,220,390)>40){a.say('왼쪽 원에서 그리기를 시작하세요.');return;}s.path=[{...s.cur}];s.ink=0;s.drawing=true;}if(down&&s.drawing){const q=s.path.at(-1);if(distance(q.x,q.y,s.cur.x,s.cur.y)>4){s.ink+=distance(q.x,q.y,s.cur.x,s.cur.y);s.path.push({...s.cur});if(s.ink>650){a.fail('잉크를 다 썼어요');s.drawing=false;}}}if(released&&s.drawing){s.drawing=false;if(distance(s.cur.x,s.cur.y,680,390)>40){a.fail('다리가 깃발까지 닿지 않았어요');return;}if(s.path.length<2)return;for(let j=1;j<s.path.length;j++){const q=s.path[j-1],r=s.path[j];if(r.x<q.x||Math.abs(r.y-q.y)>Math.max(12,(r.x-q.x)*1.8)){a.fail('후진하거나 너무 가파른 다리예요');return;}}s.running=true;s.travel=0;a.move('홍학이 다리를 건너는 중!');}}else{s.travel+=115*dt;let left=s.travel,pos=s.path[0];for(let j=1;j<s.path.length;j++){const q=s.path[j-1],r=s.path[j],len=distance(q.x,q.y,r.x,r.y);if(left<=len){const t=len?left/len:0;pos={x:q.x+(r.x-q.x)*t,y:q.y+(r.y-q.y)*t};break;}left-=len;pos=r;}s.car=pos;if(s.obstacles.some(o=>pos.x>o.x-17&&pos.x<o.x+o.w+17&&pos.y>o.y-15&&pos.y<o.y+o.h+20)){a.fail('바위에 부딪혔어요');return;}if(s.travel>=s.ink)a.clear();}},
 draw(ctx,s,a){frame(ctx,'한 줄 다리 공방',`출발 원 → 깃발까지 드래그 · 잉크 ${Math.max(0,650-Math.round(s.ink))} / 650`);rect(ctx,245,395,410,135,C.blue);rect(ctx,0,397,247,140,C.mint);rect(ctx,653,397,247,140,C.mint);s.obstacles.forEach(o=>rect(ctx,o.x,o.y,o.w,o.h,'#8b9290',18,C.ink));for(let j=1;j<s.path.length;j++)line(ctx,s.path[j-1].x,s.path[j-1].y,s.path[j].x,s.path[j].y,C.rose,13);circle(ctx,220,390,24,C.gold,C.ink);line(ctx,680,328,680,395,C.ink,4);rect(ctx,680,328,43,29,C.pink,4);const p=s.car||{x:200,y:390};bird(ctx,p.x,p.y,45);circle(ctx,s.cur.x,s.cur.y,9,'transparent',C.teal,2);},
 bot(s,a){if(s.running)return blank();const points=this.solution(a.level);const k=s.botAt++;if(k===0)return tap(points[0][0],points[0][1],false);if(k<=points.length)return tap(points[k-1][0],points[k-1][1],true);return tap(points.at(-1)[0],points.at(-1)[1],false);},
 snapshot(s){return{ink:s.ink,travel:s.travel,running:s.running,path:s.path,car:s.car||null};}
 });}

const PIPE_PATHS=[[0,1,2,6,5,4,8,9,10,11,15],[0,4,8,12,13,9,5,1,2,6,10,14,15],[0,4,5,1,2,3,7,6,10,9,8,12,13,14,15]];
const PDIR=[[0,-1],[1,0],[0,1],[-1,0]];
function turn(mask){return((mask<<1)&15)|(mask>>3);}
function direction(a,b){const ax=a%4,ay=Math.floor(a/4),bx=b%4,by=Math.floor(b/4);return PDIR.findIndex(([x,y])=>ax+x===bx&&ay+y===by);}
function pipes(env){return stageGame(env,{
 hint:'조각을 90도씩 돌려 왼쪽 수도에서 오른쪽 둥지까지 연결하세요.',
 init(l){const path=PIPE_PATHS[l],target=Array(16).fill(0);path.forEach((v,j)=>target[v]=(1<<(j?direction(v,path[j-1]):3))|(1<<(j<path.length-1?direction(v,path[j+1]):1)));const masks=target.map((v,j)=>{let r=v;for(let n=0;n<(j+l+1)%4;n++)r=turn(r);return r;});return{target,masks,path,focus:0,nav:0,lit:[]};},
 boxes(){return Array.from({length:16},(_,j)=>({x:278+(j%4)*86,y:123+Math.floor(j/4)*86,w:80,h:80}));},
 connected(s){let at=0,from=3,visited=new Set();s.lit=[];while(!visited.has(at)){visited.add(at);const m=s.masks[at];if(!(m&(1<<from)))return false;s.lit.push(at);const out=[0,1,2,3].find(d=>d!==from&&(m&(1<<d)));if(out===undefined)return false;if(at===15&&out===1)return true;const x=at%4+PDIR[out][0],y=Math.floor(at/4)+PDIR[out][1];if(x<0||x>3||y<0||y>3)return false;at=x+y*4;from=(out+2)%4;}return false;},
 update(s,dt,i,a){nav(s,i,dt,16,4);const k=choice(s,i,this.boxes());if(k<0||!s.masks[k])return;s.masks[k]=turn(s.masks[k]);a.move();if(this.connected(s))a.clear();},
 draw(ctx,s,a){frame(ctx,'둥지 수도국','조각을 눌러 회전 · 방향키 선택 / A 회전 · 물이 새지 않게!');line(ctx,215,163,278,163,C.blue,18);text(ctx,'물',200,170,24);line(ctx,616,421,697,421,C.blue,18);bird(ctx,731,447,55);this.boxes().forEach((b,k)=>{rect(ctx,b.x,b.y,b.w,b.h,s.masks[k]?C.white:'#d9dbcc',11,C.mint);const x=b.x+40,y=b.y+40;for(let d=0;d<4;d++)if(s.masks[k]&(1<<d))line(ctx,x,y,x+PDIR[d][0]*39,y+PDIR[d][1]*39,s.lit.includes(k)?C.blue:C.teal,18);if(s.masks[k])circle(ctx,x,y,12,s.lit.includes(k)?C.blue:C.teal);focusBox(ctx,s,k,b);});},
 bot(s,a){const k=s.masks.findIndex((v,j)=>v!==s.target[j]);if(k<0)return blank();const b=this.boxes()[k];return a.click(b.x+40,b.y+40);}
 });}

const GATES=[[['+',8],['*',2]],[['*',3],['+',4]],[['-',12],['+',5]],[['+',12],['*',2]],[['*',2],['-',10]],[['+',20],['*',2]],[['-',40],['+',15]],[['*',2],['+',25]],[['+',18],['-',30]],[['*',2],['+',30]]];
function applyGate(n,[op,v]){return Math.max(0,Math.min(9999,op==='+'?n+v:op==='-'?n-v:n*v));}
function gates(env){let x=450,t=0,index=0,n=1,score=0,done=false,lastPX=null,pointerMode=true,flash='좋은 계산문을 골라요';return{
 update(dt,i){if(done)return;t+=dt;if(i.pointer?.valid&&i.pointer.x!==lastPX)pointerMode=true;if(i.pointer?.valid)lastPX=i.pointer.x;if(i.x)pointerMode=false;x=clamp(pointerMode&&i.pointer?.valid?i.pointer.x:x+(i.x||0)*440*dt,275,625);if(t>=3){t-=3;const op=GATES[index][x<450?0:1];n=applyGate(n,op);score=n;flash=`${op[0]}${op[1]} → ${n}마리`;env.sound(n?'good':'bad');index++;if(!n||index===GATES.length){done=true;env.finish({score:n,outcome:n>=100?'clear':'fail',message:n>=100?`${n}마리로 100마리 목표를 넘겼어요!`:'무리가 작아 마지막 문을 열지 못했어요.'});}}},
 draw(ctx){frame(ctx,'불어나는 홍학 행렬','좌우로 이동해 계산문 선택 · 결승에 100마리 이상 모으세요');rect(ctx,228,104,444,422,'#dce7d9',18);line(ctx,450,104,450,526,C.white,5);const pair=GATES[Math.min(index,9)],gy=125+t*107;pair.forEach((op,k)=>{rect(ctx,250+k*205,gy,195,67,op[0]==='-'?C.red:C.mint,12,C.ink);text(ctx,`${op[0]==='*'?'×':op[0]}${op[1]}`,347+k*205,gy+45,34);});for(let j=0;j<Math.min(n,18);j++)bird(ctx,x+(j%6-2.5)*18,478+Math.floor(j/6)*13,23);bird(ctx,x,493,50);text(ctx,n,x,432,28,C.rose);text(ctx,flash,450,566,21);},
 hud(){return{score,label:'계산문',value:`${Math.min(index+1,10)} / 10`,hint:'좌우 이동 · 100마리 이상이면 성공',progress:index/10};},
 bot(){const pair=GATES[Math.min(index,9)],k=applyGate(n,pair[0])>=applyGate(n,pair[1])?0:1;return tap(k?555:345,490,false);},snapshot(){return{x,t,index,n,score,done};}
};}

const HERO_LEVELS=[{power:6,towers:[[4,11],[7,20],[8,50]]},{power:8,towers:[[6,16,45],[11,30],[5,20,70]]},{power:10,towers:[[9,31,85],[15,48],[7,24,130]]}];
function hero(env){return stageGame(env,{
 hint:'현재 힘보다 작은 숫자를 이기면 그 힘이 더해져요. 각 탑 아래층부터!',
 init(l){return{...clone(HERO_LEVELS[l]),at:[0,0,0],focus:0,nav:0,heroX:136};},
 boxes(){return[{x:252,y:154,w:140,h:312},{x:435,y:154,w:140,h:312},{x:618,y:154,w:140,h:312}];},
 update(s,dt,i,a){nav(s,i,dt,3);const k=choice(s,i,this.boxes());if(k<0)return;const enemy=s.towers[k][s.at[k]];if(enemy===undefined)return;a.move();s.heroX=322+k*183;if(s.power<=enemy){a.fail('상대의 숫자가 같거나 더 커요');return;}s.power+=enemy;s.at[k]++;a.say(`힘 ${s.power}! 다음 탑의 아래층을 골라요.`);if(s.at.every((n,j)=>n===s.towers[j].length))a.clear();},
 draw(ctx,s,a){frame(ctx,'숫자탑의 기사','상대보다 숫자가 커야 승리 · 승리하면 상대 숫자를 흡수!');text(ctx,`힘 ${s.power}`,126,205,26,C.rose);bird(ctx,126,304,82);this.boxes().forEach((b,j)=>{rect(ctx,b.x,b.y,b.w,b.h,'#d1c9b4',13,C.ink);s.towers[j].forEach((n,k)=>{const y=420-k*92;if(k<s.at[j]){text(ctx,'✓',b.x+70,y,31,C.teal);return;}rect(ctx,b.x+12,y-64,116,75,k===s.at[j]?C.gold:C.white,10);text(ctx,n,b.x+70,y-18,31);if(k===s.at[j])text(ctx,'도전',b.x+70,y+3,13);});focusBox(ctx,s,j,b);});},
 bot(s,a){const candidates=s.towers.map((q,j)=>({j,n:q[s.at[j]]})).filter(v=>v.n!==undefined&&v.n<s.power).sort((a,b)=>a.n-b.n);if(!candidates.length)return blank();const b=this.boxes()[candidates[0].j];return a.click(b.x+70,b.y+220);}
 });}

function merge(env){let fruits=[],next=0,x=450,t=0,cool=0,score=0,drops=0,done=false,overflow=0,lastPX=null,pointerMode=true;const radius=l=>18+l*8;const add=()=>{if(cool>0)return;fruits.push({x,y:153,vx:0,vy:0,l:next,age:0,id:drops++});next=[0,0,1,0,1,2][drops%6];cool=.55;env.sound('tap');};return{
 update(dt,i){if(done)return;t+=dt;cool=Math.max(0,cool-dt);if(i.pointer?.valid&&i.pointer.x!==lastPX)pointerMode=true;if(i.pointer?.valid)lastPX=i.pointer.x;if(i.x)pointerMode=false;x=clamp(pointerMode&&i.pointer?.valid?i.pointer.x:x+(i.x||0)*340*dt,276+radius(next),624-radius(next));if(i.ap||i.pointer?.released)add();for(const f of fruits){f.age+=dt;f.vy+=670*dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=Math.exp(-2*dt);const r=radius(f.l);if(f.x<270+r){f.x=270+r;f.vx=Math.abs(f.vx)*.3;}if(f.x>630-r){f.x=630-r;f.vx=-Math.abs(f.vx)*.3;}if(f.y>510-r){f.y=510-r;f.vy=-Math.abs(f.vy)*.08;}}
 for(let iter=0;iter<4;iter++)for(let a=0;a<fruits.length;a++)for(let b=a+1;b<fruits.length;b++){const f=fruits[a],g=fruits[b],dx=g.x-f.x,dy=g.y-f.y,d=Math.hypot(dx,dy),r=radius(f.l)+radius(g.l);if(d>=r)continue;if(f.l===g.l&&f.l<5&&f.age>.12&&g.age>.12){const l=f.l+1;fruits[a]={x:(f.x+g.x)/2,y:(f.y+g.y)/2,vx:(f.vx+g.vx)/2,vy:Math.min(0,(f.vy+g.vy)/2),l,age:0,id:f.id};fruits.splice(b,1);score+=2**l*10;env.sound('good');break;}const nx=d>0?dx/d:1,ny=d>0?dy/d:0,over=(r-d)/2;f.x-=nx*over;f.y-=ny*over;g.x+=nx*over;g.y+=ny*over;const rv=(g.vx-f.vx)*nx+(g.vy-f.vy)*ny;if(rv<0){f.vx+=rv*.5*nx;f.vy+=rv*.5*ny;g.vx-=rv*.5*nx;g.vy-=rv*.5*ny;}}
 if(fruits.some(f=>f.age>1.4&&f.y-radius(f.l)<165))overflow+=dt;else overflow=0;if(overflow>.8||t>=45){done=true;env.finish({score,outcome:'record',message:overflow>.8?'바구니가 가득 찼어요. 합친 과일 점수를 기록했어요.':'45초 동안 합친 과일 점수예요.'});}},
 draw(ctx){frame(ctx,'핑크 과일 바구니','같은 숫자끼리 닿으면 합체 · 좌우 / A 또는 드래그 후 놓기');rect(ctx,261,144,378,375,C.white,15,C.ink);ctx.setLineDash([8,8]);line(ctx,270,166,630,166,C.red,3);ctx.setLineDash([]);for(const f of fruits){circle(ctx,f.x,f.y,radius(f.l),COLORS[f.l%5],C.ink,2);line(ctx,f.x,f.y-radius(f.l),f.x+4,f.y-radius(f.l)-8,C.teal,3);circle(ctx,f.x+9,f.y-radius(f.l)-5,5,C.mint);text(ctx,2**f.l,f.x,f.y+7,21);}circle(ctx,x,119,radius(next),COLORS[next%5],C.ink);text(ctx,2**next,x,126,21);bird(ctx,173,474,75);text(ctx,'같은 과일을 노려요',737,324,17,C.teal);text(ctx,`다음: ${2**([0,0,1,0,1,2][(drops+1)%6])}`,450,561,20);},
 hud(){return{score,label:'남은 시간',value:`${Math.max(0,45-t).toFixed(1)}초`,hint:'넘치기 전에 같은 숫자의 과일끼리 합치세요.',progress:t/45};},
 bot(){const target=fruits.filter(f=>f.l===next&&f.age>.7).sort((a,b)=>a.y-b.y)[0];return{...tap(target?.x??450,120,false),a:cool<=0&&Math.floor(t*10)%2===0};},snapshot(){return{t,score,drops,next,overflow,fruits:fruits.map(({x,y,l})=>({x,y,l}))};}
};}

function rope(env){return stageGame(env,{
 hint:'줄을 눌러 자르면 간식은 그 순간의 속도로 날아가요. 둥지에 넣으세요.',
 init(l){return{theta:-.95,omega:0,cut:false,x:0,y:0,vx:0,vy:0,t:0,target:[595,285,650][l],focus:0,nav:0};},
 predict(s){const vx=180*Math.cos(s.theta)*s.omega,vy=-180*Math.sin(s.theta)*s.omega,x=450+180*Math.sin(s.theta),y=135+180*Math.cos(s.theta),flight=(-vy+Math.sqrt(vy*vy+1200*(477-y)))/600;return{x:x+vx*flight,time:flight};},
 update(s,dt,i,a){s.t+=dt;if(!s.cut){s.omega-=3.8*Math.sin(s.theta)*dt;s.theta+=s.omega*dt;s.x=450+180*Math.sin(s.theta);s.y=135+180*Math.cos(s.theta);const p=i.pointer;let onRope=false;if(p?.pressed){const dx=s.x-450,dy=s.y-135,len=dx*dx+dy*dy,u=clamp(((p.x-450)*dx+(p.y-135)*dy)/len,0,1);onRope=distance(p.x,p.y,450+u*dx,135+u*dy)<39;}if(i.ap||onRope){s.cut=true;s.vx=180*Math.cos(s.theta)*s.omega;s.vy=-180*Math.sin(s.theta)*s.omega;a.move('간식이 날아가요!');}}else{const old=s.y;s.vy+=600*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;if(old<477&&s.y>=477){if(Math.abs(s.x-s.target)<55)a.clear();else a.fail('간식이 둥지를 빗나갔어요');}else if(s.y>580||s.x<-100||s.x>1000)a.fail('간식이 둥지 밖으로 나갔어요');}},
 draw(ctx,s,a){frame(ctx,'한 입의 진자','줄 탭 또는 A로 자르기 · 움직이는 방향과 속도를 읽으세요');circle(ctx,450,135,16,C.gold,C.ink);if(!s.cut)line(ctx,450,135,s.x||305,s.y||240,C.ink,5);circle(ctx,s.x||305,s.y||240,22,C.gold,C.rose,3);text(ctx,'♥',s.x||305,(s.y||240)+8,20,C.rose);rect(ctx,s.target-62,480,124,32,C.mint,15,C.ink);bird(ctx,s.target,492,65);text(ctx,'간식 도착',s.target,550,18,C.teal);},
 bot(s,a){if(s.cut)return blank();const prediction=this.predict(s);return{...blank(),a:s.t>.2&&Math.abs(prediction.x-s.target)<17};},
 snapshot(s){return{theta:s.theta,omega:s.omega,x:s.x,y:s.y,vx:s.vx,vy:s.vy,cut:s.cut,target:s.target,t:s.t};}
 });}

const SLIDE_LEVELS=[
 [{x:0,y:2,n:2,h:true},{x:2,y:1,n:2,h:false},{x:3,y:2,n:2,h:false},{x:4,y:0,n:2,h:true},{x:0,y:4,n:3,h:true}],
 [{x:0,y:2,n:2,h:true},{x:2,y:0,n:3,h:false},{x:3,y:1,n:2,h:false},{x:4,y:1,n:3,h:false},{x:0,y:4,n:2,h:true}],
 [{x:0,y:2,n:2,h:true},{x:2,y:1,n:3,h:false},{x:3,y:1,n:2,h:false},{x:4,y:2,n:2,h:false},{x:0,y:5,n:3,h:true},{x:4,y:0,n:2,h:true}]
];
function slideCells(p){return Array.from({length:p.n},(_,i)=>[p.x+(p.h?i:0),p.y+(p.h?0:i)]);}
function slideMove(pieces,k,dir){const p=pieces[k],x=p.x+(p.h?dir:0),y=p.y+(p.h?0:dir),m={...p,x,y};if(x<0||y<0||x+(p.h?p.n:1)>6||y+(p.h?1:p.n)>6)return false;const occupied=new Set(pieces.flatMap((v,j)=>j===k?[]:slideCells(v).map(c=>c.join())));if(slideCells(m).some(c=>occupied.has(c.join())))return false;p.x=x;p.y=y;return true;}
function solveSlide(pieces){const key=v=>v.map(p=>p.h?p.x:p.y).join(),q=[[pieces,[]]],seen=new Set([key(pieces)]);for(let i=0;i<q.length&&i<100000;i++){const [p,path]=q[i];if(p[0].x===4)return path;for(let k=0;k<p.length;k++)for(const d of [-1,1]){const n=clone(p);if(!slideMove(n,k,d))continue;const id=key(n);if(!seen.has(id)){seen.add(id);q.push([n,[...path,[k,d]]]);}}}return[];}
function slide(env){return stageGame(env,{
 hint:'빨간 홍학 블록을 오른쪽 출구로! 블록을 선택하고 화살표로 한 칸씩 이동.',
 init(l){const pieces=clone(SLIDE_LEVELS[l]);return{pieces,selected:0,focus:0,nav:0,plan:solveSlide(pieces),drag:null};},
 boxes(s){return s.pieces.map(p=>({x:254+p.x*62,y:120+p.y*62,w:(p.h?p.n:1)*62-7,h:(p.h?1:p.n)*62-7}));},
 update(s,dt,i,a){s.nav=Math.max(0,s.nav-dt);let dir=0;const p=i.pointer;if(p?.pressed){if(hit(p,135,260,89,78))dir=-1;else if(hit(p,673,260,89,78))dir=1;else{const k=this.boxes(s).findIndex(b=>hit(p,b.x,b.y,b.w,b.h));if(k>=0){s.selected=k;s.drag={x:p.x,y:p.y};}}}if(p?.released&&s.drag){const delta=s.pieces[s.selected].h?p.x-s.drag.x:p.y-s.drag.y;if(Math.abs(delta)>25)dir=Math.sign(delta);s.drag=null;}if(i.ap)s.selected=(s.selected+1)%s.pieces.length;const axis=s.pieces[s.selected].h?i.x:i.y;if(!axis)s.nav=0;else if(s.nav<=0){dir=Math.sign(axis);s.nav=.17;}if(dir){if(slideMove(s.pieces,s.selected,dir)){s.plan=null;a.move();if(s.pieces[0].x===4)a.clear();}else a.say('다른 블록이나 벽이 막고 있어요.');}},
 draw(ctx,s,a){frame(ctx,'홍학 한 칸 탈출','블록 선택 후 양쪽 버튼 · A 다음 블록 / 방향키 이동 · 드래그도 가능');rect(ctx,243,109,391,391,'#d6d5c3',16,C.ink);for(let r=0;r<6;r++)for(let c=0;c<6;c++)rect(ctx,254+c*62,120+r*62,55,55,C.white,5);rect(ctx,626,240,54,61,C.gold,5);text(ctx,'출구',653,278,17);this.boxes(s).forEach((b,k)=>{rect(ctx,b.x,b.y,b.w,b.h,k===0?C.rose:COLORS[(k+1)%5],10,s.selected===k?C.ink:C.white);text(ctx,k===0?'홍학':k,b.x+b.w/2,b.y+b.h/2+8,24,k===0?C.white:C.ink);if(s.selected===k){ctx.setLineDash([4,3]);rect(ctx,b.x-3,b.y-3,b.w+6,b.h+6,'transparent',10,C.ink);ctx.setLineDash([]);}});button(ctx,s.pieces[s.selected].h?'←':'↑',135,260,89,78,{});button(ctx,s.pieces[s.selected].h?'→':'↓',673,260,89,78,{});},
 bot(s,a){if(!s.plan)s.plan=solveSlide(s.pieces);const m=s.plan[0];if(!m)return blank();if(s.selected!==m[0]){const b=this.boxes(s)[m[0]];return a.click(b.x+b.w/2,b.y+b.h/2);}return a.click(m[1]<0?179:718,299);},
 snapshot(s){return{pieces:s.pieces,selected:s.selected};}
 });}

function matches(board){const found=new Set();for(let r=0;r<5;r++)for(let c=0;c<5;c++){const k=r*5+c,v=board[k];if(v<0)continue;if(c<3&&board[k+1]===v&&board[k+2]===v){let x=c;while(x<5&&board[r*5+x]===v)found.add(r*5+x++);}if(r<3&&board[k+5]===v&&board[k+10]===v){let y=r;while(y<5&&board[y*5+c]===v)found.add((y++)*5+c);}}return [...found];}
function legalMatches(board){const out=[];for(let a=0;a<25;a++)for(const b of [a%5<4?a+1:-1,a<20?a+5:-1]){if(b<0)continue;const n=board.slice();[n[a],n[b]]=[n[b],n[a]];const m=matches(n);if(m.length)out.push({a,b,m});}return out;}
function match(env){let board=[],selected=-1,focus=0,navDelay=0,t=0,score=0,moves=0,done=false,flash='줄 세 개가 생기는 교환만 가능해요',anim=0;function makeBoard(){for(let attempt=0;attempt<100;attempt++){board=[];for(let j=0;j<25;j++){const choices=[0,1,2,3].filter(v=>!(j%5>1&&board[j-1]===v&&board[j-2]===v||j>9&&board[j-5]===v&&board[j-10]===v));board[j]=choices[Math.floor(env.random()*choices.length)];}if(legalMatches(board).length)return;}board=[0,1,0,2,3,2,0,3,1,2,1,2,0,3,1,0,3,1,2,0,3,1,2,0,3];}makeBoard();function refill(){for(let c=0;c<5;c++){const col=[];for(let r=4;r>=0;r--)if(board[r*5+c]>=0)col.push(board[r*5+c]);while(col.length<5)col.push(Math.floor(env.random()*4));for(let r=4;r>=0;r--)board[r*5+c]=col[4-r];}}function resolve(){let total=0;for(let chain=0;chain<30;chain++){const m=matches(board);if(!m.length)break;total+=m.length*(chain+1)*10;for(const k of m)board[k]=-1;refill();}score+=total;if(!legalMatches(board).length){board=[];makeBoard();flash='가능한 교환이 없어 판을 새로 섞었어요.';}return total;}const boxes=()=>Array.from({length:25},(_,j)=>({x:263+(j%5)*75,y:120+Math.floor(j/5)*75,w:67,h:67}));const click=pulseBot();return{
 update(dt,i){if(done)return;t+=dt;anim=Math.max(0,anim-dt);const n={focus,nav:navDelay};nav(n,i,dt,25,5);focus=n.focus;navDelay=n.nav;let k=choice(n,i,boxes());if(i.bp){selected=-1;flash='선택을 취소했어요.';}if(k>=0&&anim<=0){if(selected<0)selected=k;else{const from=selected;selected=-1;if(Math.abs(from%5-k%5)+Math.abs(Math.floor(from/5)-Math.floor(k/5))!==1){selected=k;}else{[board[from],board[k]]=[board[k],board[from]];if(!matches(board).length){[board[from],board[k]]=[board[k],board[from]];flash='세 개가 이어지지 않아 원위치!';env.sound('bad');}else{moves++;const gained=resolve();flash=`+${gained} · 연쇄 성공!`;anim=.35;env.sound('good');}}}}if(t>=45){done=true;env.finish({score,outcome:'record',message:`45초 동안 ${moves}번 교환해 ${score}점을 얻었어요.`});}},
 draw(ctx){frame(ctx,'새우 사탕 세 줄','이웃한 두 칸을 선택해 교환 · 같은 숫자 3개 이상을 가로·세로로!');boxes().forEach((b,k)=>{rect(ctx,b.x,b.y,b.w,b.h,COLORS[board[k]],13,selected===k?C.ink:C.white);text(ctx,board[k]+1,b.x+33,b.y+44,27);if(focus===k){ctx.setLineDash([4,3]);rect(ctx,b.x-3,b.y-3,b.w+6,b.h+6,'transparent',13,C.teal);ctx.setLineDash([]);}});bird(ctx,170,431,60);text(ctx,flash,450,557,19,anim?C.rose:C.teal);},
 hud(){return{score,label:'남은 시간',value:`${Math.max(0,45-t).toFixed(1)}초`,hint:'방향키 선택 / A 고르기 / B 선택 취소',progress:t/45};},bot(){const m=legalMatches(board).sort((a,b)=>b.m.length-a.m.length)[0];if(!m)return blank();const k=selected<0?m.a:m.b,b=boxes()[k];return click(b.x+33,b.y+33);},snapshot(){return{board,selected,score,t,moves};}
};}

export const games=[
 entry('pins','핀 하나의 온도','핀 뽑기 · 순서 논리','물과 용암이 든 방 사이의 핀을 열어 둥지를 지켜요.','핀 탭 · 방향키 선택 / A 뽑기 / B 다시','위험한 방을 식힌 뒤 둥지로 연결해 3단계 해결','Rescue Hero: Pull the Pin 계열의 핀 제거 퍼즐','https://apps.apple.com/us/app/rescue-hero-pull-the-pin/id1524625218','직접 만든 3개 방 배치와 즉시 혼합 규칙입니다. 원작의 유체 물리나 레벨을 복제하지 않았습니다.',pins),
 entry('parking','홍학 주차 대소동','출차 순서 · 공간 판단','서로 앞을 막은 홍학 자동차를 알맞은 순서로 빼내요.','차 탭 · 방향키 선택 / A 출차 / B 다시','주차장 3곳에서 모든 자동차 출차','Parking Jam 3D의 주차 순서 퍼즐','https://apps.apple.com/us/app/parking-jam-3d/id1498229533','직접 만든 6×6 배치입니다. 각 차는 표시된 화살표 방향으로만 출차합니다.',parking),
 entry('water','핑크 주스 실험실','색 정렬 · 빈 공간 관리','같은 색과 숫자의 주스를 한 병으로 모아 주세요.','보낼 병 → 받을 병 탭 · 방향키 / A / B 다시','빈 병 또는 한 색으로 가득 찬 병만 남기기, 3단계','Water Sort Puzzle의 액체 정렬','https://apps.apple.com/us/app/water-sort-puzzle/id1514542157','3개 직접 설계한 배열입니다. 맨 위의 연속된 같은 색을 빈 공간만큼 한 번에 붓습니다.',water),
 entry('screws','나사 빼는 홍반장','지지판 · 작업 순서','두 개의 빈 구멍을 활용해 겹쳐진 판의 나사를 옮겨요.','노출 나사 → 빈 구멍 탭 · 방향키 / A / B 다시','모든 판을 떨어뜨려 3단계 해결','Nuts And Bolts - Screw Puzzle의 지지판 해체','https://apps.apple.com/us/app/nuts-and-bolts-screw-puzzle/id6464008525','회전 물리 대신 나사 두 개가 모두 빠지면 판이 내려오는 2D 지지 규칙과 독자 배치를 사용합니다.',screws),
 entry('bridge','한 줄 다리 공방','그리기 · 경로 설계','한 줄의 다리를 그려 홍학이 바위 위로 건너게 해 주세요.','왼쪽 원부터 드래그 · 방향키 커서 / A 누른 채 그리기 / B 다시','잉크 650 안에서 바위를 피해 3개 다리 완성','Draw Bridge의 손으로 길 그리기','https://apps.apple.com/us/app/draw-bridge-build-a-bridge/id1615361348','독자적인 고정 선 다리입니다. 강체 물리 대신 연속 경로, 잉크 길이, 경사와 충돌을 검사합니다.',bridge),
 entry('pipes','둥지 수도국','회전 · 연결망','뒤틀린 수도관을 돌려 홍학 둥지에 물을 보내요.','관 탭 · 방향키 선택 / A 회전 / B 다시','수도에서 둥지까지 끊김 없이 연결, 3단계','Pipe Connect의 회전 배관 퍼즐','https://apps.apple.com/us/app/pipe-connect-plumbing-puzzle/id6786562457','직접 설계한 4×4 배관입니다. 타이머 없이 연결된 관의 방향과 누수를 검사합니다.',pipes,[400,650,780]),
 entry('gates','불어나는 홍학 행렬','숫자 게이트 · 러너','좌우 계산문을 골라 작은 홍학 무리를 크게 키워요.','좌우 이동 또는 포인터 이동','10개 문을 지나 100마리 이상 모으기','Count Masters의 숫자문 군중 러너','https://apps.apple.com/us/app/count-masters-crowd-runner-3d/id1568245971','독자적인 30초 코스입니다. 군중은 표시 숫자로 관리하며 문 10개의 덧셈·뺄셈·곱셈을 적용합니다.',gates,[100,350,650]),
 entry('hero','숫자탑의 기사','산수 · 공략 순서','작은 상대부터 이겨 힘을 흡수하고 세 개의 탑을 정복해요.','도전할 탑 탭 · 좌우 선택 / A 도전 / B 다시','현재 힘보다 작은 아래층을 차례로 공략, 3단계','Hero Tower War의 수 비교 타워 퍼즐','https://apps.apple.com/us/app/hero-tower-war-merge-puzzle/id1570840391','독자적인 숫자 탑 배치이며 전투는 엄격한 대소 비교 후 상대 힘 더하기로 해석했습니다.',hero),
 entry('merge','핑크 과일 바구니','낙하 · 충돌 합체','같은 숫자 과일 두 개를 만나게 해 큰 과일로 합쳐요.','좌우 / A 낙하 · 드래그 후 놓기','45초 동안 합체 점수 획득, 바구니가 넘치면 종료','Suika Game의 과일 물리 합체','https://apps.apple.com/us/app/suika-game-aladdin-x/id6469114836','독자적인 원형 과일 6단계와 간단한 충돌 물리를 사용한 45초 기록 모드입니다.',merge,[200,600,1200]),
 entry('rope','한 입의 진자','줄 자르기 · 운동 예측','흔들리는 간식의 줄을 끊어 홍학 둥지에 넣어요.','줄 탭 또는 A 자르기 / B 다시','진자 속도를 이용해 간식을 3개 둥지로 보내기','Cut the Rope의 줄 절단 물리 퍼즐','https://www.zeptolab.com/games/cut-the-rope','직접 만든 3단계 진자·포물선 실험입니다. 중력과 목표 배치는 브라우저용 독자 값입니다.',rope),
 entry('slide','홍학 한 칸 탈출','슬라이딩 · 공간 논리','블록을 밀어 빨간 홍학이 오른쪽 출구로 나갈 길을 만드세요.','블록 탭 후 화면 화살표 / 드래그 · A 다음 블록 / 방향키 이동 / B 다시','빨간 블록을 오른쪽 끝까지 이동, 3단계','Unblock Me 계열의 슬라이딩 블록 퍼즐','https://apps.apple.com/us/app/unblock-me/id315019111','직접 설계한 6×6 배치입니다. 각 블록은 긴 축을 따라 한 칸씩 움직입니다.',slide),
 entry('match','새우 사탕 세 줄','교환 · 연쇄 퍼즐','이웃한 사탕을 바꿔 세 개 이상의 같은 숫자를 연결해요.','두 이웃 칸 탭 · 방향키 / A 선택 / B 취소','45초 동안 가로·세로 세 줄과 연쇄 점수 획득','Candy Crush Saga 계열의 매치3 교환 규칙','https://www.king.com/game/candycrush','독자적인 숫자 사탕과 5×5 무작위 판입니다. 특수 사탕 없이 낙하·연쇄를 적용한 45초 기록 모드입니다.',match,[300,1000,2000])
];
