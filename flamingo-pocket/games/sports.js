import { C, clamp, lerp, circle, rect, line, text, bird, bg, button, distance } from '../draw.js';

const PI = Math.PI, raw = (v = {}) => ({ x: 0, y: 0, a: false, b: false, pointer: { x: 450, y: 300, down: false, valid: false }, ...v });
const tap = i => i.ap || i.pointer?.pressed;
const held = i => i.a || (i.pointer?.valid && i.pointer.down);
const release = i => i.ar || i.pointer?.released;
const source = {
 sprint: 'https://worldathletics.org/disciplines/jumps/100-metres', hurdles: 'https://worldathletics.org/disciplines/hurdles/110-metres-hurdles',
 longjump: 'https://worldathletics.org/disciplines/jumps/long-jump', javelin: 'https://worldathletics.org/disciplines/throws/javelin-throw',
 archery: 'https://www.worldarchery.sport/sport/disciplines/target-archery', swim: 'https://www.worldaquatics.com/swimming/rules',
 row: 'https://www.worldrowing.com/2026/08/23/rowing-101-the-history-terms-and-tactics-to-know-ahead-of-amsterdam-2026/',
 basket: 'https://refereeing.fiba.basketball/en/rule-zone/official-basketball-rules-2024',
 tennis: 'https://www.ittf.com/statutes/', fencing: 'https://fie.org/documents/rules',
 lift: 'https://iwf.sport/weightlifting_/the-two-lifts/', curl: 'https://worldcurling.org/about/curling/'
};
function ending(env) { let done = false; return (score, outcome, message) => { if (!done) { done = true; env.finish({ score: Math.max(0, Math.round(score)), outcome, message }); } }; }
function meter(c, x, y, w, value, label, color = C.teal) { rect(c, x, y, w, 18, '#d9e2d4', 9); rect(c, x, y, w * clamp(value, 0, 1), 18, color, 9); if (label) text(c, label, x, y - 12, 17, C.ink, 'left'); }
function title(c, label, sub) { text(c, label, 450, 63, 30); if (sub) text(c, sub, 450, 98, 18, C.teal); }
function field(c, mode = 'track') {
 bg(c, { sky: '#eaf0dc', ground: mode === 'ice' ? '#e3f0ee' : '#aacaa3', groundY: 280 });
 for (let j = 0; j < 3; j++) { rect(c, 30, 140 + j * 34, 840, 25, j % 2 ? '#b9c8af' : '#d2d8b4', 8); for (let k = 0; k < 23; k++) circle(c, 46 + k * 36, 153 + j * 34, 5, [C.rose,C.gold,C.teal][(j+k)%3]); }
 if (mode === 'track') { rect(c, 0, 310, 900, 215, '#cb8974'); for (let k = 0; k < 4; k++) line(c, 0, 330+k*55, 900, 330+k*55, '#fff5db', 3); }
}
function water(c, t) { bg(c, { sky:'#edf1dc', ground:'#8dbfc9', groundY:240 }); for(let y=265;y<550;y+=40) for(let x=0;x<900;x+=75) line(c,x+(t*30%75),y,x+30+(t*30%75),y,'#c6e4df',3); }
function notice(c, s, color = C.ink) { rect(c, 180, 532, 540, 43, C.cream, 16); text(c, s, 450, 560, 20, color); }
function meta(id, name, kicker, description, controls, objective, key, adaptation, medal, create) {
 return { id:'sports-'+id, name, category:'sports', kicker, description, controls, objective, inspiration:'국제 스포츠 규칙에서 착안한 플라밍고 미니 스포츠', sourceUrl:source[key], adaptation, color:'#72a798', medal, create };
}

function sprint(env) {
 const end=ending(env); let t=0, x=0, v=0, last=-1, since=10, flash='', penalty=0, steps=0; const go=1.4+env.random()*.6;
 return {
 update(dt,i) { if(dt===0)return; t+=dt; since+=dt; penalty=Math.max(0,penalty-dt); let foot=i.ap?0:i.bp?1:i.pointer?.pressed?(i.pointer.x<450?0:1):-1;
  if(foot>=0) { if(t<go) { penalty=.9; flash='출발 신호를 기다려요!'; } else if(foot===last||since<.12) { v*=.76; flash='왼발 · 오른발 번갈아!'; } else { v=Math.min(12.8,v+2.5); steps++; flash='좋아요!'; env.sound('tap'); } last=foot; since=0; }
  if(t>=go) { v=Math.max(0,v-dt*3.5); if(penalty<=0)x+=v*dt; if(x>=100)end(2400-(t-go)*80,'clear',`100m 완주 · ${(t-go).toFixed(2)}초`); }
  if(t>=32)end(x*5,'fail',`${Math.floor(x)}m까지 달렸어요. A/B를 번갈아 눌러요.`);
 },
 draw(c) { field(c); title(c,'두 발의 리듬','신호 뒤에 왼발과 오른발을 번갈아'); const offset=x*17; for(let k=0;k<15;k++){let px=100+k*150-offset%150;line(c,px,310,px,525,'#efc5b3',2);} bird(c,260,439,80,{pose:v>1?'run':'idle'}); bird(c,clamp(260+((Math.max(0,t-go)*8.4)-x)*15,45,850),375,58,{color:C.teal,pose:'run'});
  if(100-x<35) { const fx=260+(100-x)*15; line(c,fx,310,fx,524,C.white,10); text(c,'FINISH',fx,297,18); }
  text(c,t<go?'준비…':'GO!',740,268,38,t<go?C.rose:C.teal); meter(c,90,480,720,x/100,`${Math.floor(x)} / 100 m`); button(c,'A · 왼발',210,535,220,45,{active:last===0,color:C.pink}); button(c,'B · 오른발',470,535,220,45,{active:last===1,color:C.blue});
 }, hud(){return{score:Math.floor(x*5),label:'거리',value:`${Math.floor(x)}m`,hint:flash||'A와 B 교대 / 화면 왼쪽·오른쪽 교대 터치',progress:x/100};},
 bot(){return raw(t>=go+.06&&since>.19?(last===0?{b:true}:{a:true}):{});}, snapshot(){return{t,x,v,steps,penalty};}
 };
}

function hurdles(env) {
 const end=ending(env); let t=0,x=0,j=0,vy=0,v=7.4,hits=0,clears=0; const hs=Array.from({length:10},(_,k)=>({x:14+k*9.14,passed:false,hit:false}));
 return {update(dt,i){if(!dt)return;t+=dt;if(tap(i)&&j<=0){vy=6.5;j=.001;env.sound('tap');} if(j>0){j+=vy*dt;vy-=16*dt;if(j<0){j=0;vy=0;}}v=Math.min(7.4,v+3*dt);x+=v*dt;
  for(const h of hs)if(!h.passed&&x>=h.x){h.passed=true;if(j<.8){hits++;h.hit=true;v=2.8;env.sound('bad');}else{clears++;env.sound('good');}}
  if(x>=110)end(600+clears*70-t*12,'clear',`110m 완주 · 허들 ${clears}/10개 통과`);
  if(t>=40)end(clears*70,'record','허들 연습 종료');},
 draw(c){field(c);title(c,'깃털 허들','앞의 막대에 닿기 전에 A로 점프');for(const h of hs){const px=260+(h.x-x)*30;if(px>-30&&px<930){line(c,px,450,px,450-(h.hit?14:58),C.cream,8);line(c,px-18,450-(h.hit?14:58),px+18,450-(h.hit?14:58),h.hit?C.red:C.blue,10);}}bird(c,260,450-j*80,75,{pose:j>0?'jump':'run'});meter(c,90,492,720,x/110,`${Math.floor(x)} / 110 m`);notice(c,`통과 ${clears}개 · 넘어진 허들 ${hits}개`);},
 hud(){return{score:clears*70,label:'허들',value:`${clears} / 10`,hint:'A / 화면 터치: 점프. 허들 약 2~3m 앞에서 도약!',progress:x/110};},
 bot(){const h=hs.find(h=>!h.passed);return raw({a:!!h&&h.x-x<2.45&&h.x-x>1.8&&j===0});},snapshot(){return{t,x,j,vy,v,hits,clears};}};
}

function longjump(env) {
 const end=ending(env);let t=0,attempt=1,phase='run',x=0,y=0,vy=0,at=0,best=0,marks=[],message='흰 발판 직전에 A!',flightV=0;
 function finishTrial(d,foul){best=Math.max(best,d);marks.push(d);message=foul?'파울! 발판을 넘었어요.':`${d.toFixed(2)} m`;phase='wait';at=0;env.sound(foul?'bad':'good');}
 return {update(dt,i){if(!dt)return;t+=dt;at+=dt;if(phase==='run'){x+=7.2*dt;if(tap(i)){if(x>25)finishTrial(0,true);else{phase='air';y=.001;vy=5.1;flightV=7.2;at=0;env.sound('tap');}}else if(x>26)finishTrial(0,true);}else if(phase==='air'){x+=flightV*dt;y+=vy*dt;vy-=9.8*dt;if(y<=0){y=0;finishTrial(Math.max(0,x-25),false);}}else if(at>1.5){if(attempt>=3)end(best*100,best>0?'record':'fail',`최고 기록 ${best.toFixed(2)}m · 세 번의 도약`);else{attempt++;phase='run';x=0;at=0;message='흰 발판 직전에 A!';}}},
 draw(c){field(c);title(c,'모래 위 한 발','선을 넘으면 파울 · 세 번 중 최고 거리'); const cam=Math.max(0,x-17), sx=n=>90+(n-cam)*24;rect(c,sx(25),420,450,77,'#e7ce91',8);rect(c,sx(24.75),414,6,80,C.white);line(c,sx(25),380,sx(25),502,C.rose,3);text(c,'도약선',sx(25),365,18);for(let k=1;k<12;k++) {line(c,sx(25+k),460,sx(25+k),484,C.teal,2);text(c,String(k),sx(25+k),510,14);}bird(c,sx(x),437-y*50,73,{pose:phase==='air'?'jump':'run'});text(c,`${attempt} / 3`,770,267,30);notice(c,message,phase==='wait'&&marks.at(-1)===0?C.red:C.ink);},
 hud(){return{score:Math.round(best*100),label:'최고 거리',value:`${best.toFixed(2)} m`,hint:'자동 도움닫기 → 도약선 직전 A / 터치',progress:(attempt-1)/3};},bot(){return raw({a:phase==='run'&&x>=24.7});},snapshot(){return{t,attempt,x,y,vy,best,phase,marks};}};
}

function javelin(env) {
 const end=ending(env);let t=0,at=0,attempt=1,phase='aim',angle=42,power=0,charging=false,x=0,y=0,vx=0,vy=0,best=0,last=0;
 function launch(){const vel=17+power*14;vx=vel*Math.cos(angle*PI/180);vy=vel*Math.sin(angle*PI/180);x=0;y=1.8;phase='air';at=0;charging=false;env.sound('tap');}
 return {update(dt,i){if(!dt)return;t+=dt;at+=dt;if(phase==='aim'){angle=clamp(angle+i.x*45*dt,15,75);if(i.pointer?.valid&&!i.pointer.down)angle=clamp(75-(i.pointer.x-120)/660*60,15,75);if(held(i)){charging=true;power=(power+dt*.8)%1.001;}if(release(i)&&charging)launch();if(at>10){last=0;phase='wait';at=0;}}else if(phase==='air'){x+=vx*dt;y+=vy*dt;vy-=9.8*dt;if(y<=0){y=0;last=x;best=Math.max(best,x);phase='wait';at=0;env.sound('good');}}else if(at>1.2){if(attempt===3)end(best*10,best>0?'record':'fail',`가장 멀리 ${best.toFixed(1)}m 던졌어요.`);else{attempt++;phase='aim';power=0;at=0;}}},
 draw(c){field(c,'grass');title(c,'갈대 창던지기','각도와 힘을 골라 멀리 던져요');line(c,90,480,850,480,C.cream,4);for(let k=0;k<=100;k+=10){let px=130+k*6.5;line(c,px,480,px,493,C.teal,2);text(c,`${k}`,px,515,15);}bird(c,115,480,72);const px=phase==='air'?130+x*6.5:155,py=phase==='air'?480-y*7:366;const a=phase==='air'?Math.atan2(-vy,vx):-angle*PI/180;line(c,px-Math.cos(a)*28,py-Math.sin(a)*28,px+Math.cos(a)*28,py+Math.sin(a)*28,C.ink,4);circle(c,px+Math.cos(a)*30,py+Math.sin(a)*30,4,C.gold);text(c,`각도 ${Math.round(angle)}°`,700,270,26);text(c,`${attempt} / 3`,780,320,26);meter(c,290,340,440,power,'A를 누르면 힘 충전 · 놓으면 투척',C.rose);notice(c,phase==='wait'?`${last.toFixed(1)}m · 최고 ${best.toFixed(1)}m`:'← → 각도 / A 누르기 → 놓기');},
 hud(){return{score:Math.round(best*10),label:'최고 거리',value:`${best.toFixed(1)}m`,hint:'← → 각도 조절 · A 누르고 힘을 모아 놓기',progress:(attempt-1)/3};},bot(){return raw({a:phase==='aim'&&power<.91});},snapshot(){return{t,attempt,angle,power,x,y,vx,vy,best,phase};}};
}

function archery(env) {
 const end=ending(env);let t=0,shots=0,score=0,aimX=630,aimY=310,charge=0,cool=0,wind=(env.random()-.5)*70,marks=[],last='여섯 발로 과녁의 중심을 노려요';
 const sway=()=>({x:Math.sin(t*2.7)*12/(1+charge*4),y:Math.cos(t*2.1)*10/(1+charge*4)});
 return {update(dt,i){if(!dt)return;t+=dt;cool=Math.max(0,cool-dt);aimX=clamp(aimX+i.x*170*dt,445,815);aimY=clamp(aimY+i.y*170*dt,120,500);if(i.pointer?.valid){aimX=clamp(i.pointer.x,445,815);aimY=clamp(i.pointer.y,120,500);}if(cool<=0&&shots<6){if(held(i))charge=Math.min(1.5,charge+dt);if(release(i)&&charge>0){const sw=sway(),mx=aimX+wind+sw.x,my=aimY+sw.y,d=distance(mx,my,630,310),p=clamp(10-Math.floor(d/14),0,10);marks.push({x:mx,y:my,p});score+=p;shots++;last=`${p}점!`;charge=0;cool=.5;wind=(env.random()-.5)*70;env.sound(p>=7?'good':'bad');}}
  if(shots>=6&&cool===0)end(score,'record',`여섯 발 합계 ${score} / 60점`);if(t>=45)end(score,'record',`시간 종료 · ${shots}발, ${score}점`);},
 draw(c){bg(c,{sky:'#e9edda',ground:'#b5caa3',groundY:425});title(c,'바람 읽는 양궁','화살은 바람 방향으로 밀려요');line(c,570,415,550,535,C.teal,10);line(c,690,415,710,535,C.teal,10);for(let k=10;k>=1;k--)circle(c,630,310,k*14,['#f8f4df','#f8f4df','#414b47','#414b47','#89baca','#89baca','#d68279','#d68279','#e9bd55','#e9bd55'][10-k],C.ink,1);for(const m of marks){line(c,m.x-7,m.y-7,m.x+7,m.y+7,C.ink,3);line(c,m.x+7,m.y-7,m.x-7,m.y+7,C.ink,3);}bird(c,230,466,125,{pose:charge?'jump':'idle'});c.beginPath();c.arc(302,347,59,-PI*.4,PI*.4);c.strokeStyle=C.teal;c.lineWidth=6;c.stroke();line(c,320,290,305-charge*18,346,C.ink,2);line(c,305-charge*18,346,320,402,C.ink,2);const sw=sway();circle(c,aimX+sw.x,aimY+sw.y,12,'transparent',C.pink,3);line(c,aimX-20,aimY,aimX+20,aimY,C.pink,2);text(c,`바람 ${wind<0?'←':'→'} ${Math.abs(wind).toFixed(0)}`,250,205,24);meter(c,120,500,250,charge/1.5,'안정도');notice(c,`${last} · 남은 화살 ${6-shots}발`);},
 hud(){return{score,label:'화살',value:`${shots} / 6`,hint:'방향키 / 포인터 조준 · A를 누르면 안정, 놓으면 발사',progress:shots/6};},bot(){const sw=sway();return raw({a:cool<=0&&charge<.9,pointer:{x:630-wind-sw.x,y:310-sw.y,valid:true,down:false}});},snapshot(){return{t,shots,score,aimX,aimY,charge,wind,marks};}};
}

function swimming(env) {
 const end=ending(env);let t=0,x=0,v=0,stamina=100,since=10,breathing=false,strokes=0;
 return {update(dt,i){if(!dt)return;t+=dt;since+=dt;breathing=!!i.b||(i.pointer?.down&&i.pointer.x>650);if(breathing){stamina=Math.min(100,stamina+38*dt);v*=Math.exp(-1.7*dt);}else stamina=Math.min(100,stamina+4*dt);
  if((i.ap||(i.pointer?.pressed&&i.pointer.x<=650))&&!breathing){if(stamina>=13&&since>.16){const q=clamp(1-Math.abs(since-.4),.3,1);v=Math.min(5,v+1.8*q);stamina-=13;strokes++;env.sound('tap');}else{v*=.85;env.sound('bad');}since=0;}v=Math.max(0,v-.8*dt);x+=v*dt;if(x>=60)end(2500-t*40,'clear',`60m 완주 · ${t.toFixed(1)}초 · ${strokes}번의 스트로크`);if(t>=40)end(x*12,'fail',`${x.toFixed(1)}m · B로 숨을 쉬며 다시 도전해요.`);},
 draw(c){water(c,t);title(c,'숨 고르는 수영','젓고, 숨 쉬고, 다시 앞으로');for(let y=260;y<=510;y+=125)for(let n=0;n<40;n++)circle(c,n*24-(x*20%24),y,5,n%2?C.cream:C.rose);bird(c,300,390+Math.sin(t*7)*4,91,{rotation:breathing?-.2:PI/2,pose:'swim'});for(let n=0;n<6;n++)circle(c,220-n*19,398+(n%2)*11,5+n*.8,'#d8ede3');meter(c,110,458,680,x/60,`${x.toFixed(1)} / 60m`);meter(c,110,503,680,stamina/100,'숨 / 체력',stamina<25?C.red:C.teal);button(c,'A · 팔 젓기',210,543,270,40,{color:C.pink});button(c,'B · 숨 쉬기',660,543,180,40,{active:breathing,color:C.blue});},
 hud(){return{score:Math.floor(x*12),label:'숨',value:`${Math.round(stamina)}%`,hint:'A 리듬에 맞춰 젓기 · B를 누르고 쉬면 체력 회복',progress:x/60};},bot(){const b=stamina<23||(breathing&&stamina<77);return raw({b,a:!b&&since>.4});},snapshot(){return{t,x,v,stamina,strokes,breathing};}};
}

function rowing(env) {
 const end=ending(env);let t=0,x=0,v=0,grip=false,startQuality=0,phase=0,strokes=0,feedback='초록 구간에서 잡고, 금색 구간에서 놓기';
 return {update(dt,i){if(!dt)return;t+=dt;phase=t%1.6/1.6;if(tap(i)){grip=true;startQuality=clamp(1-Math.abs(phase-.22)/.18,0,1);env.sound('tap');}if(release(i)&&grip){const q=startQuality*clamp(1-Math.abs(phase-.62)/.18,0,1);v+=q*5;strokes+=q>.4?1:0;feedback=q>.65?'한 호흡으로 쭉!':q>.1?'다음엔 구간을 맞춰요':'물이 튀었어요!';env.sound(q>.65?'good':'bad');grip=false;}v*=Math.exp(-.7*dt);x+=v*dt;if(t>=35)end(x,'record',`35초 동안 ${Math.floor(x)}m · 정확한 스트로크 ${strokes}회`);},
 draw(c){water(c,t);title(c,'갈대 노 젓기','잡기 → 당기기 → 놓기 → 회복');for(let k=0;k<10;k++)circle(c,850-k*130+(x*12%130),475,10,C.gold);rect(c,215,348,390,40,C.cream,20,C.teal);bird(c,345,351,80,{pose:grip?'jump':'idle'});bird(c,445,351,80,{color:C.blue,pose:grip?'jump':'idle'});for(let px of[340,445]){let a=grip?-.5+phase*1.6:.7-phase*.7;line(c,px,355,px+Math.cos(a)*95,355+Math.sin(a)*95,C.ink,6);circle(c,px+Math.cos(a)*100,355+Math.sin(a)*100,12,C.teal);}rect(c,160,448,580,36,C.cream,12);rect(c,160+.12*580,448,.2*580,36,C.mint,6);rect(c,160+.52*580,448,.2*580,36,C.gold,6);line(c,160+phase*580,439,160+phase*580,493,C.rose,5);text(c,'A 누르기',282,520,20);text(c,'놓기',520,520,20);notice(c,feedback);},hud(){return{score:Math.floor(x),label:'남은 시간',value:`${Math.ceil(Math.max(0,35-t))}초`,hint:'초록 구간 A 누르기 → 금색 구간 놓기 / 화면 길게 터치',progress:t/35};},bot(){return raw({a:phase>=.22&&phase<.62});},snapshot(){return{t,x,v,phase,grip,strokes};}};
}

function basketball(env) {
 const end=ending(env);let t=0,score=0,shots=0,made=0,angle=56,power=0,charging=false,ball=null,cool=0,last='포물선을 보고 골대를 노려요';const bx=205,by=417,hx=715,hy=247,g=600;
 return {update(dt,i){if(!dt)return;t+=dt;cool=Math.max(0,cool-dt);if(!ball&&cool===0&&shots<12){angle=clamp(angle-i.y*40*dt+i.x*25*dt,30,75);if(held(i)){charging=true;power=(power+dt*.65)%1.001;}if(release(i)&&charging){const v=460+power*390;ball={x:bx,y:by,vx:v*Math.cos(angle*PI/180),vy:-v*Math.sin(angle*PI/180),scored:false};shots++;charging=false;power=0;env.sound('tap');}}
  if(ball){const py=ball.y,px=ball.x;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vy+=g*dt;if(py<hy&&ball.y>=hy&&ball.vy>0){const ix=px+(ball.x-px)*(hy-py)/(ball.y-py);if(Math.abs(ix-hx)<29&&!ball.scored){score+=2;made++;ball.scored=true;last='슛 성공! +2';env.sound('good');}}
   if(ball.x>895||ball.y>530){if(!ball.scored){last='아깝다! 각도와 힘을 바꿔봐요';env.sound('bad');}ball=null;cool=.35;}}
  if((shots>=12&&!ball)||t>=45)end(score,'record',`${made}골 / ${shots}번의 슛 · ${score}점`);},
 draw(c){bg(c,{sky:'#e9e1cc',ground:'#d9b982',groundY:350});title(c,'늪지 자유투','포물선으로 던져요 · 45초, 최대 12구');line(c,770,155,770,480,C.teal,12);rect(c,738,165,27,111,C.cream,4,C.teal);line(c,hx-31,hy,hx+31,hy,C.rose,8);for(let k=0;k<5;k++)line(c,hx-28+k*14,hy,hx-18+k*9,hy+49,C.white,2);line(c,hx-18,hy+49,hx+18,hy+49,C.white,2);line(c,50,504,850,504,C.cream,4);bird(c,180,490,100,{pose:charging?'jump':'idle'});
  const vel=460+power*390;if(charging)for(let s=.12;s<1.4;s+=.12){const px=bx+vel*Math.cos(angle*PI/180)*s,py=by-vel*Math.sin(angle*PI/180)*s+g*s*s/2;if(px<870&&py>120)circle(c,px,py,3,C.teal);}
  const b=ball||{x:bx,y:by};circle(c,b.x,b.y,15,C.gold,C.ink,2);line(c,b.x-15,b.y,b.x+15,b.y,C.ink,1.5);meter(c,340,442,280,power,`각도 ${Math.round(angle)}° · A 충전 후 놓기`,C.rose);notice(c,last);},
 hud(){return{score,label:'슈팅',value:`${shots} / 12`,hint:'방향키 각도 · A 누른 뒤 놓기 · 점선으로 예상 궤적 확인',progress:t/45};},bot(){const a=angle*PI/180,dx=hx-bx,dy=hy-by,vel=Math.sqrt(g*dx*dx/(2*Math.cos(a)**2*(dx*Math.tan(a)+dy))),target=(vel-460)/390;return raw({a:!ball&&cool===0&&power<target});},snapshot(){return{t,score,shots,made,angle,power,ball,charging};}};
}

function tennis(env) {
 const end=ending(env);let t=0,px=450,ball={x:450,y:180,vx:110,vy:230},score=0,lives=5,swing=0,cool=0,serve=.5;
 function reset(){ball={x:300+env.random()*300,y:185,vx:(env.random()-.5)*240,vy:230+score*3};serve=.65;}
 return {update(dt,i){if(!dt)return;t+=dt;px=clamp(px+i.x*440*dt,190,710);if(i.pointer?.valid)px=clamp(i.pointer.x,190,710);swing=Math.max(0,swing-dt);cool=Math.max(0,cool-dt);if(tap(i)&&cool===0){swing=.17;cool=.3;env.sound('tap');}if(serve>0)serve-=dt;else{ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;if(ball.x<185||ball.x>715){ball.x=clamp(ball.x,185,715);ball.vx*=-1;}if(ball.y<175){ball.y=175;ball.vy=Math.abs(ball.vy);ball.vx=(env.random()-.5)*330;}if(ball.vy>0&&ball.y>=444&&ball.y<=470&&swing>0&&Math.abs(ball.x-px)<57){ball.y=443;ball.vy=-Math.min(420,245+score*9);ball.vx=(ball.x-px)*4;score++;env.sound('good');}if(ball.y>490){lives--;reset();env.sound('bad');}}
  if(lives===0||t>=45)end(score,lives===0?'fail':'record',`${score}번 받아쳤어요 · 남은 공 ${lives}개`);},
 draw(c){bg(c,{sky:'#e5e8d5',ground:'#c5d0b7',groundY:360});title(c,'깃털 탁구 랠리','공 아래로 이동 → 가까이 오면 A!');rect(c,160,153,580,337,C.teal,9,C.cream);line(c,450,160,450,485,'#c8dfd1',2);line(c,160,315,740,315,C.cream,5);for(let x=165;x<740;x+=18)line(c,x,300,x,330,'#aec9b9',1);bird(c,450,170,58,{color:C.blue});bird(c,px,548,72);circle(c,px,465-swing*65,35,C.rose,C.cream,3);line(c,px,485,px,516,C.ink,9);circle(c,ball.x,ball.y,9,C.cream,C.gold,2);text(c,`남은 공 ${'●'.repeat(lives)}`,450,585,18);},hud(){return{score,label:'남은 공',value:String(lives),hint:'← → / 포인터 이동 · A / 터치로 라켓 휘두르기',progress:t/45};},bot(){return raw({x:clamp((ball.x-px)/30,-1,1),a:ball.vy>0&&ball.y>422&&ball.y<447&&cool===0});},snapshot(){return{t,px,ball,score,lives,swing};}};
}

function fencing(env) {
 const end=ending(env);let t=0,px=335,score=0,rival=0,phase='wait',at=0,delay=1.1+env.random()*.7,parry=0,blockCool=0,lunge=0,last='B로 막고 A로 반격!';
 function next(){phase='wait';at=0;delay=1+env.random()*.8;px=335;}
 return {update(dt,i){if(!dt)return;t+=dt;at+=dt;parry=Math.max(0,parry-dt);lunge=Math.max(0,lunge-dt);blockCool=Math.max(0,blockCool-dt);px=clamp(px+i.x*150*dt,200,455);if(i.bp||(i.pointer?.pressed&&i.pointer.x<450)){if(blockCool<=0){parry=.24;blockCool=.48;env.sound('tap');}}
  if(i.ap||(i.pointer?.pressed&&i.pointer.x>=450)){lunge=.18;if((phase==='parried'||phase==='recover')&&570-px<220){score++;last='빈틈을 찔렀어요!';env.sound('good');next();}else last='방어를 먼저 유도해요';}
  if(phase==='wait'&&at>=delay){phase='windup';at=0;last='상대가 준비! 끝에 맞춰 B';}else if(phase==='windup'&&at>=.65){if(parry>0&&570-px<280){phase='parried';at=0;last='막기 성공! 이제 A 반격';env.sound('good');}else if(570-px<260){rival++;last='상대에게 1점';env.sound('bad');next();}else{phase='recover';at=0;last='상대가 헛손질! 다가가 A';}}else if((phase==='parried'||phase==='recover')&&at>.9)next();
  if(score>=5||rival>=5||t>=45)end(score*100+(score>rival?Math.max(0,45-t)*5:0),score>rival?'clear':'fail',`플라밍고 ${score} : ${rival} 청둥이`);},
 draw(c){bg(c,{sky:'#e4e7dc',ground:'#a9c0aa',groundY:400});title(c,'갈대 검의 결투',`${score} : ${rival} · 먼저 5점`);rect(c,90,427,720,75,'#d8d4bc',6,C.cream);line(c,450,427,450,502,C.white,3);bird(c,px+lunge*120,440,100,{pose:lunge?'jump':'idle'});bird(c,570,440,100,{color:C.blue,flip:true,pose:phase==='windup'?'jump':'idle'});line(c,px+28,354,px+120+(lunge?55:0),parry?290:350,C.ink,4);line(c,548,354,phase==='windup'?445:480,phase==='parried'?296:350,phase==='windup'?C.red:C.ink,4);if(parry)circle(c,px+86,330,34,'transparent',C.gold,5);if(phase==='windup')meter(c,490,250,170,at/.65,'상대 공격 예고',C.red);button(c,'B · 막기',165,520,250,45,{active:parry>0,color:C.blue});button(c,'A · 찌르기',485,520,250,45,{active:lunge>0,color:C.pink});text(c,last,450,590,18);},
 hud(){return{score:score*100,label:'대결',value:`${score} : ${rival}`,hint:'← → 거리 · B 막기 · A 찌르기. 화면 왼쪽 B / 오른쪽 A',progress:Math.max(score,rival)/5};},bot(){return raw({x:px<370?1:0,b:phase==='windup'&&at>.49,a:phase==='parried'||phase==='recover'});},snapshot(){return{t,px,score,rival,phase,at,parry};}};
}

function weightlifting(env) {
 const end=ending(env);let t=0,at=0,attempt=1,phase='clean',gauge=0,balance=0,bv=0,holdTime=0,score=0,success=0,message='금색 구간에서 A로 들어올리기';const weights=[40,60,80];
 function trial(ok){if(ok){score+=weights[attempt-1];success++;}message=ok?'안정적으로 들었어요!':'균형을 잃었어요';env.sound(ok?'good':'bad');phase='wait';at=0;}
 return {update(dt,i){if(!dt)return;t+=dt;at+=dt;gauge=(Math.sin(at*3.2)+1)/2;if(phase==='clean'||phase==='jerk'){if(tap(i)){if(gauge>.7&&gauge<.93){if(phase==='clean'){phase='jerk';at=0;message='한 번 더 A로 머리 위까지!';env.sound('good');}else{phase='balance';at=0;balance=0;bv=.18;holdTime=0;message='← → 로 중심을 3초간 유지';}}else trial(false);}else if(at>8)trial(false);}else if(phase==='balance'){let move=i.x;if(i.pointer?.valid&&i.pointer.down)move=clamp((i.pointer.x-450)/150,-1,1);bv+=(Math.sin(t*2.1)*.6+balance*.8+move*3.6)*dt;bv*=Math.exp(-1.1*dt);balance+=bv*dt;holdTime+=dt;if(Math.abs(balance)>1)trial(false);else if(holdTime>=3)trial(true);}else if(at>1.2){if(attempt===3)end(score,success>0?'record':'fail',`성공 ${success}/3회 · 합계 ${score} 깃털kg`);else{attempt++;phase='clean';at=0;message='금색 구간에서 A!';}}},
 draw(c){bg(c,{sky:'#e7e6d0',ground:'#b7c4a7',groundY:390});title(c,'깃털 역도','두 번 들어 올리고 3초간 균형');rect(c,160,460,580,52,'#bd966d',8,C.cream);const by=phase==='balance'?278:phase==='jerk'?340:423;bird(c,450+balance*32,462,133,{pose:phase==='clean'?'idle':'jump',rotation:balance*.13});line(c,425+balance*32,391,385,by-balance*14,C.pink,15);line(c,469+balance*32,388,515,by+balance*14,C.pink,15);line(c,315,by-balance*28,585,by+balance*28,C.ink,12);circle(c,385,by-balance*14,8,C.rose);circle(c,515,by+balance*14,8,C.rose);for(let side of[-1,1]){rect(c,450+side*126-17,by-39+side*balance*25,34,78,C.rose,8);rect(c,450+side*157-10,by-28+side*balance*25,20,56,C.teal,6);}text(c,`${weights[attempt-1]} 깃털kg`,740,330,23);if(phase==='balance'){rect(c,270,145,360,24,C.cream,12);rect(c,390,145,120,24,C.mint,8);circle(c,450+balance*170,157,13,C.rose);meter(c,270,196,360,holdTime/3,'버티기');}else if(phase==='clean'||phase==='jerk'){rect(c,270,164,360,30,C.cream,10);rect(c,270+.7*360,164,.23*360,30,C.gold,4);line(c,270+gauge*360,154,270+gauge*360,204,C.rose,5);}notice(c,message);},
 hud(){return{score,label:'시도',value:`${attempt} / 3`,hint:'금색 구간 A 두 번 · 들어 올린 뒤 ← → 로 균형',progress:(attempt-1)/3};},bot(){return raw({a:(phase==='clean'||phase==='jerk')&&gauge>.79&&gauge<.9,x:phase==='balance'?clamp(-balance*3-bv*2,-1,1):0});},snapshot(){return{t,attempt,phase,gauge,balance,bv,holdTime,score,success};}};
}

function curling(env) {
 const end=ending(env);let t=0,at=0,attempt=1,angle=0,power=0,charging=false,phase='aim',stone={x:150,y:320,vx:0,vy:0},score=0,last='',sweeping=false,old=[];const target={x:710,y:320};
 function done(){const d=distance(stone.x,stone.y,target.x,target.y),p=Math.max(0,Math.round(100-d*.8));score+=p;last=`중심에서 ${Math.round(d)}cm · +${p}점`;old.push({...stone});phase='wait';at=0;env.sound(p>60?'good':'bad');}
 return {update(dt,i){if(!dt)return;t+=dt;at+=dt;if(phase==='aim'){angle=clamp(angle+i.x*.4*dt,-.24,.24);if(i.pointer?.valid&&!i.pointer.down)angle=clamp((i.pointer.y-320)/560,-.24,.24);if(held(i)){charging=true;power=(power+dt*.65)%1.001;}if(release(i)&&charging){const v=160+power*200;stone={x:150,y:320,vx:Math.cos(angle)*v,vy:Math.sin(angle)*v};phase='slide';charging=false;at=0;env.sound('tap');}else if(at>=9){last='시간 안에 스톤을 놓아주세요';phase='wait';at=0;}}else if(phase==='slide'){sweeping=!!i.b||(i.pointer?.down&&i.pointer.x>450);const v=Math.hypot(stone.vx,stone.vy),f=sweeping?57:80,nv=Math.max(0,v-f*dt);if(v>0){stone.vx*=nv/v;stone.vy*=nv/v;}stone.x+=stone.vx*dt;stone.y+=stone.vy*dt;if(stone.x>875||stone.y<175||stone.y>467){stone.vx=0;stone.vy=0;}if(nv<1||stone.vx===0)done();}else if(at>1.2){if(attempt>=3)end(score,'record',`세 번의 정밀 투구 · ${score} / 300점`);else{attempt++;phase='aim';at=0;power=0;stone={x:150,y:320,vx:0,vy:0};}}},
 draw(c){bg(c,{sky:'#e9eedf',ground:'#dceae6',groundY:240});title(c,'얼음 위 조약돌','가까이 멈추기 · B 스위핑은 더 멀리');rect(c,75,178,800,286,'#f4f6e9',20,C.blue);for(let r=110;r>0;r-=27)circle(c,710,320,r,(Math.round(r/27)%2)?C.blue:C.cream);circle(c,710,320,16,C.rose);line(c,75,320,875,320,'#b8ceca',1);line(c,250,180,250,461,C.red,3);for(const p of old)circle(c,p.x,p.y,18,'#a9b7ad',C.teal,2);if(phase==='aim'){line(c,150,320,440,320+Math.tan(angle)*290,C.rose,2);}circle(c,stone.x,stone.y,20,C.teal,C.cream,3);rect(c,stone.x-10,stone.y-8,20,8,C.gold,4);bird(c,110,430,67);if(sweeping&&phase==='slide'){line(c,stone.x+30,stone.y-35,stone.x+45,stone.y+12,C.ink,5);rect(c,stone.x+29,stone.y+8,35,13,C.gold,5);}meter(c,270,500,390,power,`힘 · 각도 ${(angle*180/PI).toFixed(0)}°`,C.rose);notice(c,phase==='wait'?last:'← → 방향 · A 충전 후 놓기 · 이동 중 B 스위핑');},
 hud(){return{score,label:'스톤',value:`${attempt} / 3`,hint:'← → 방향 · A 누르고 놓기 · B 누르면 더 멀리 미끄러져요',progress:(attempt-1)/3};},bot(){return raw({a:phase==='aim'&&power<.70});},snapshot(){return{t,attempt,phase,angle,power,stone,score,sweeping};}};
}

export const games = [
 meta('sprint','두 발의 리듬','100M DASH','신호를 기다렸다가 두 발의 리듬으로 결승선을 통과해요.','A/B 교대 · 화면 왼쪽/오른쪽 교대','100m를 빠르게 완주','sprint','교대 입력과 감속을 사용하는 100m 아케이드입니다. 빠른 중복 입력은 감속하며, 32초 제한과 점수 환산은 새로 설계했습니다.',[900,1200,1450],sprint),
 meta('hurdles','깃털 허들','HURDLE HOP','달리기는 자동, 도약 시점은 당신의 몫. 열 개의 허들을 넘어요.','A / 터치: 점프','열 개의 허들을 넘어 110m 완주','hurdles','110m의 10개 허들에서 착안했습니다. 점프 높이·이동 속도·충돌 감속·점수는 2D 게임용 수치입니다.',[850,1000,1110],hurdles),
 meta('long-jump','모래 위 한 발','LONG JUMP','흰 도약선을 넘지 않고 최대한 가까이에서 뛰어올라요.','자동 도움닫기 · A / 터치: 도약','세 번 중 가장 긴 유효 기록','longjump','도약선 파울과 최고 유효 기록 규칙을 사용합니다. 도움닫기·비행 물리·세 번의 짧은 시도는 브라우저용 구성입니다.',[400,600,700],longjump),
 meta('javelin','갈대 창던지기','JAVELIN ARC','각도와 힘을 조절해 갈대 창으로 큰 포물선을 그려요.','← → 각도 · A 누른 뒤 놓기','세 번 중 가장 멀리 던지기','javelin','창던지기에서 착안한 2D 포물선 기록전입니다. 도움닫기와 착지 각도 판정은 생략하고 각도·힘·중력을 직접 설계했습니다.',[550,750,900],javelin),
 meta('archery','바람 읽는 양궁','WIND & FEATHER','바람을 읽고 호흡을 가다듬어 여섯 발을 쏘세요.','방향키 / 포인터 조준 · A 유지 후 놓기','여섯 발 합계 60점에 도전','archery','동심원 10점 표적을 이용합니다. 6발·45초, 가상의 바람과 조준 흔들림은 미니게임용 규칙입니다.',[30,45,55],archery),
 meta('swimming','숨 고르는 수영','BREATH STROKE','팔을 젓는 리듬과 숨 쉬는 휴식을 균형 있게 맞춰요.','A 팔 젓기 · B 숨 쉬기','체력을 관리하며 60m 완주','swim','자유형 수영에서 착안한 60m·40초 도전입니다. 체력 게이지와 입력 리듬은 실제 경기 규정이 아닌 게임 장치입니다.',[750,1000,1250],swimming),
 meta('rowing','갈대 노 젓기','CATCH & RELEASE','노를 넣고 당겼다가 놓는 하나의 흐름을 만들어요.','초록 구간 A 누르기 → 금색 구간 놓기','35초 동안 이동한 거리 기록','row','캐치·드라이브·릴리스·회복의 흐름을 타이밍 조작으로 옮겼습니다. 35초 거리전과 속도 계산은 새로 설계했습니다.',[90,115,135],rowing),
 meta('basketball','늪지 자유투','POND HOOPS','각도와 힘을 골라 공이 림 위에서 떨어지게 던져요.','방향키 각도 · A 충전 후 놓기','45초 동안 최대 12구 · 성공당 2점','basket','농구 슈팅에서 착안한 물리 연습입니다. 자유투의 공식 1점 대신 성공당 2점, 최대 12구와 궤적 안내를 사용합니다.',[8,16,22],basketball),
 meta('table-tennis','깃털 탁구 랠리','RALLY CLUB','공의 길을 따라가 정확한 순간 라켓을 휘둘러요.','← → / 포인터 이동 · A / 터치 스윙','45초 동안 최대한 많은 리턴','tennis','탁구 리턴 연습을 평면 아케이드로 바꿨습니다. 벽 반사·5개 여분 공·리턴 횟수 점수는 독자 규칙이며 정규 탁구 세트가 아닙니다.',[10,20,27],tennis),
 meta('fencing','갈대 검의 결투','PARRY & RIPOSTE','공격 예고를 읽어 막아낸 뒤 생긴 빈틈을 찔러요.','← → 거리 · B 막기 · A 찌르기','먼저 5점 · 45초 제한','fencing','펜싱의 거리·패리·리포스트에서 착안했습니다. 방어 후 반격 창과 5점·45초 승부는 단순화한 독자 규칙입니다.',[200,500,600],fencing),
 meta('weightlifting','깃털 역도','LIFT & BALANCE','두 번의 정확한 타이밍으로 들고, 중심을 유지해요.','금색 구간 A 두 번 · ← → 균형','세 중량을 들고 3초간 버티기','lift','클린 앤 저크의 두 단계와 최종 정지 자세에서 착안했습니다. 40·60·80 깃털kg와 타이밍·균형 점수는 가상 단위 및 독자 규칙입니다.',[40,100,180],weightlifting),
 meta('curling','얼음 위 조약돌','SWEEP & SETTLE','힘을 조절하고 필요할 때 얼음을 쓸어 중심에 멈춰요.','← → 방향 · A 충전 후 놓기 · B 스위핑','세 번의 정밀 투구 합계 300점','curl','컬링의 투구·스위핑에서 착안한 단독 정밀도 연습입니다. 스톤 충돌과 엔드별 정규 점수 대신 중심까지 거리에 따른 점수를 사용합니다.',[120,210,270],curling)
];
