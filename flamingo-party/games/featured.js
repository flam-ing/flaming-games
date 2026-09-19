import {clamp,dist,toward} from '../core.js';
function separate(players,r=.65){for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){const a=players[i],b=players[j];if(!a.alive||!b.alive)continue;const d=dist(a,b);if(d<r*2&&d>.001){const k=(r*2-d)/2,dx=(a.x-b.x)/d,dz=(a.z-b.z)/d;a.x+=dx*k;b.x-=dx*k;a.z+=dz*k;b.z-=dz*k;}}}
function books(c){
 c.bounds={x:7.5,z:4.8};c.limit=300;c.view={size:18,eye:[0,22,15],target:[0,1,0]};let page=0,phase=0,holes=[],fallen=false;
 const cells=Array.from({length:24},(_,n)=>({x:(n%6-2.5)*2.5,z:(Math.floor(n/6)-1.5)*2.5}));
 function next(){page++;phase=0;fallen=false;holes=c.shuffle(cells).slice(0,Math.max(2,7-Math.floor(page/3)));}next();
 return {update(dt){phase+=dt;const wait=Math.max(1.35,4.4-page*.13);c.hint(`제 ${page}장 · 구멍 아래로 피하세요`);
  for(const p of c.players){const target=holes.reduce((a,b)=>dist(p,a)<dist(p,b)?a:b);const q=c.input(p,()=>toward(p,target.x+(p.i%2-.5)*.5,target.z+Math.floor(p.i/2)*.3-.15,dist(p,target)>.2?1:0));c.move(p,q,5.7);}
  separate(c.players,.45);
  if(phase>=wait&&!fallen){fallen=true;for(const p of c.players)if(p.alive){if(!holes.some(h=>Math.abs(h.x-p.x)<.95&&Math.abs(h.z-p.z)<.95))c.eliminate(p);else c.points(p,1);}c.lastStanding();}
  if(phase>wait+.75&&!c.ended)next();
 },render(){c.arena({width:17,depth:12,color:'#dfa076'});c.draw('spine','box',{x:-8.2,y:.3,z:0,sx:.4,sy:1,sz:12,color:'#804f51'});const wait=Math.max(1.35,4.4-page*.13),drop=phase<wait-.7?6:Math.max(.05,6*(wait-phase)/.7);for(let i=0;i<cells.length;i++){const h=cells[i],safe=holes.includes(h);if(safe)c.draw('safe'+i,'box',{x:h.x,y:.01,z:h.z,sx:2.35,sy:.05,sz:2.35,color:'#80d3ae'});else c.draw('page'+i,'box',{x:h.x,y:drop,z:h.z,sx:2.5,sy:.18,sz:2.5,color:i%2?'#fff0cc':'#f8e8c6',opacity:phase<wait-.7?.5:1});}c.draw('pageNumber','text',{x:0,y:8,z:-5,sx:5,sy:1.25,text:`PAGE ${page}`});},timeout(){c.survivors();}};
}
function paparazzi(c){
 c.bounds={x:6.7,z:5};c.limit=70;let round=0,phase=0,camera=0,flashed=false,rank=[];const spots=Array.from({length:5},(_,i)=>({x:Math.cos(-Math.PI/2+i*Math.PI*2/5)*6,z:Math.sin(-Math.PI/2+i*Math.PI*2/5)*4.4}));
 c.players.forEach(p=>{p.cool=0;p.kx=0;p.kz=0;});function next(){round++;phase=0;flashed=false;camera=c.int(0,4);}next();
 return {update(dt){phase+=dt;const s=spots[camera];c.hint(`${round} / 7 라운드 · ${flashed?'찰칵! '+rank.map(i=>`${i+1}P`).join(' → '):'카메라 바로 앞을 차지하세요 · A 밀치기'}`);
  for(const p of c.players){p.cool=Math.max(0,p.cool-dt);const q=c.input(p,()=>({...toward(p,s.x*.75,s.z*.75,1),a:p.cool===0&&c.players.some(o=>o!==p&&dist(p,o)<1.6)}));if(!flashed)c.move(p,q,4.8);p.x+=p.kx*dt;p.z+=p.kz*dt;p.kx*=Math.exp(-8*dt);p.kz*=Math.exp(-8*dt);p.x=clamp(p.x,-6.7,6.7);p.z=clamp(p.z,-5,5);
   if(q.ap&&p.cool===0&&!flashed){p.cool=.55;p.pose='hit';for(const o of c.players)if(o!==p&&dist(p,o)<1.8){const d=dist(p,o)||1;o.kx=(o.x-p.x)/d*17;o.kz=(o.z-p.z)/d*17;}}}
  separate(c.players,.5);
  if(phase>=5&&!flashed){flashed=true;rank=[...c.players].sort((a,b)=>dist(a,s)-dist(b,s)).map(p=>p.i);rank.forEach((i,r)=>c.points(c.players[i],3-r));}
  if(phase>=7){if(round===7)c.highest('7장의 사진 점수 합계');else next();}
 },render(){c.arena({width:17,depth:13,color:'#d7c491'});spots.forEach((s,i)=>{c.draw('camera'+i,'box',{x:s.x*1.22,y:2,z:s.z*1.22,sx:.9,sy:.7,sz:.6,color:i===camera?'#f4c958':'#456f72'});c.draw('tripod'+i,'cylinder',{x:s.x*1.22,y:.8,z:s.z*1.22,sx:.12,sy:1.7,sz:.12,color:'#31525b'});if(i===camera)c.draw('photoSpot','cylinder',{x:s.x*.75,y:.015,z:s.z*.75,sx:2.2,sy:.04,sz:2.2,color:flashed?'#fff9df':'#f3bf69'});});if(flashed)c.draw('flash','text',{x:0,y:5,z:0,sx:8,sy:2,text:'+3  +2  +1',color:'#fff4d9'});},timeout(){c.highest();}};
}
const roll=(f,d)=>{const [t,b,n,s,e,w]=f;return d===0?[s,n,t,b,e,w]:d===1?[n,s,b,t,e,w]:d===2?[e,w,n,s,b,t]:[w,e,n,s,t,b];};
function steaks(c){
 c.limit=Infinity;c.view={size:17,eye:[0,19,16],target:[0,0,0]};const states=c.players.map((p,i)=>{p.x=(i%2-.5)*9;p.z=(Math.floor(i/2)-.5)*7;const x=p.x,z=p.z;p.z+=2.6;p.scale=.6;return {x,z,f:[0,1,2,3,4,5],cooked:[0,0,0,0,0,0],last:-1,tilt:0};});
 const colors=['#df6980','#edb549','#569ebb','#5fa585','#bd88b8','#e78750'];
 return {update(dt){c.hint('방향을 눌러 팬 뒤집기 · 여섯 면을 모두 익히면 승리');for(const p of c.players){const s=states[p.i];s.tilt=Math.max(0,s.tilt-dt);let target=-1;
   if(s.cooked[s.f[1]]>=1&&s.tilt===0){const queue=[{f:s.f,path:[]}],seen=new Set();while(queue.length){const v=queue.shift();if(seen.has(v.f.join()))continue;seen.add(v.f.join());if(s.cooked[v.f[1]]<1){target=v.path[0]??-1;break;}for(let d=0;d<4;d++)queue.push({f:roll(v.f,d),path:[...v.path,d]});}}
   const q=c.input(p,()=>({x:target===2?-1:target===3?1:0,z:target===0?-1:target===1?1:0}));const dir=q.z<-.5?0:q.z>.5?1:q.x<-.5?2:q.x>.5?3:-1;
   if(dir>=0&&dir!==s.last){if(s.tilt>.08){s.cooked.fill(0);p.score=0;s.f=[0,1,2,3,4,5];s.tilt=.4;}else if(s.tilt===0){s.f=roll(s.f,dir);s.tilt=.25;}}s.last=dir;
   if(s.tilt===0){const bottom=s.f[1];s.cooked[bottom]=Math.min(1,s.cooked[bottom]+dt/1.8);p.score=s.cooked.filter(n=>n>=1).length;}
   }const finishers=c.players.filter(p=>p.score===6);if(finishers.length)c.complete(finishers.map(p=>p.i),'여섯 면을 모두 구웠습니다');
 },render(){c.arena({width:20,depth:16,color:'#eecdb5'});states.forEach((s,i)=>{const p=c.players[i],z=s.z-.6,x=s.x;c.draw('pan'+i,'cylinder',{x,y:.25,z,sx:3,sy:.35,sz:3,color:'#344a55'});c.draw('handle'+i,'box',{x:x+2,y:.3,z,sx:2,sy:.22,sz:.35,color:'#476370'});c.draw('steak'+i,'box',{x,y:1+s.tilt*2,z,sx:1.4,sy:1.4,sz:1.4,color:s.cooked[s.f[0]]>=1?'#a66e3e':'#ed9391',rz:s.tilt*2});c.draw('face'+i,'text',{x,y:2.15,z,sx:1,sy:.5,text:String(s.f[0]+1),color:'#fff4d3'});s.cooked.forEach((heat,f)=>c.draw('heat'+i+'_'+f,'box',{x:x+(f-2.5)*.48,y:.08,z:z+2.4,sx:.4,sy:.16+heat*.5,sz:.4,color:heat>=1?'#abcc78':colors[f]}));c.draw('label'+i,'text',{x,y:3.2,z,sx:3,sy:.75,text:`${i+1}P · ${p.score}/6`,color:p.color});});},timeout(){c.highest('익힌 면이 가장 많은 플레이어');}};
}
export const games={'Booksquirm':books,'Slaparazzi':paparazzi,'Sizzling Stakes':steaks};
export const notes={Booksquirm:'책장의 구멍과 낙하 순서는 새로 제작했습니다.',Slaparazzi:'7라운드, 자리 순위에 따른 3·2·1·0점과 밀치기 규칙을 적용했습니다.','Sizzling Stakes':'Joy-Con 팬 기울이기를 방향 입력으로 바꾸고, 익힘 상태를 색상으로 표시합니다. 굽는 시간은 브라우저판에 맞게 조정했습니다. 너무 급하게 방향을 바꾸면 고기를 떨어뜨려 처음부터 다시 굽습니다.'};
