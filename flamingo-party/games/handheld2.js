import { clamp, dist, toward } from '../core.js';

const PINK = '#ef90aa', BLUE = '#73bcd7', GOLD = '#edc263', GREEN = '#83be9b';
const COLORS = ['#e98294', '#68b4df', '#eee7d0'];
const text = (c,id,label,x=0,y=1,z=0,size=3,color='#293f4c') => c.draw(id,'text',{text:label,x,y,z,sx:size,sy:size/4,color});
const box = (c,id,x,y,z,sx,sy,sz,color,more={}) => c.draw(id,'box',{x,y,z,sx,sy,sz,color,...more});
const ball = (c,id,x,y,z,size,color,more={}) => c.draw(id,'sphere',{x,y,z,sx:size,sy:size,sz:size,color,...more});
const win = (c,why) => c.complete([0],why);
const lose = (c,why) => c.complete([],why);
function solo(c,limit=Infinity) { c.limit=limit; c.activePlayers=[0]; c.players.forEach((p,i)=>{p.visible=i===0;p.alive=i===0;});const p=c.players[0];p.x=0;p.z=0;return p; }
function side(c,size=23,targetY=5,targetX=0) { c.view={size,eye:[targetX,targetY+5,27],target:[targetX,targetY,0]}; }
function targetLabel(c,p,goal,label='점') { text(c,'target-label',`${Math.round(p.score)} / ${goal} ${label}`,0,1,-8,8); }
function arrow(i) { return ['←','→','↑','↓'][i] ?? 'A'; }
function direction(input) { return Math.abs(input.x)>.3 ? input.x<0?0:1 : Math.abs(input.z)>.3 ? input.z<0?2:3 : -1; }
function directionEdge(s,input) { const n=direction(input),result=n!==s.prev?n:-1;s.prev=n;return result; }
const dirInput = n => n<2?{x:n===0?-1:1}:{z:n===2?-1:1};
function timeoutGoal(c,p,goal) { return () => p.score>=goal?win(c,'목표 달성'):lose(c,'제한 시간 안에 목표를 달성하지 못했습니다'); }

function booBye(c) {
  const p=solo(c);c.bounds={x:9,z:7};let face={x:0,z:-1},wave=0,ghosts=[],center=2;
  const paintings=[{x:-7,z:0,color:0},{x:7,z:0,color:1},{x:0,z:-4,color:2}];
  const spawn=()=>{wave++;ghosts=Array.from({length:Math.min(2+Math.floor(wave/2),5)},(_,i)=>({x:(i-(Math.min(2+Math.floor(wave/2),5)-1)/2)*2,z:5.7,color:i%3===2?center:i%2,alive:true,frozen:false}));};spawn();
  return {update(dt){
    c.hint('방향으로 유령을 유인하고 같은 색 그림에 가두세요. 바라보면 멈춥니다. A 점프 · 목표 1,000점');
    const input=c.input(p,()=>{const g=ghosts.find(g=>g.alive);if(!g)return{};const gate=paintings.find(a=>a.color===g.color)||paintings[2];const dx=gate.x-g.x,dz=gate.z-g.z,d=Math.hypot(dx,dz)||1;const x=clamp(gate.x+dx/d*2,-9,9),z=clamp(gate.z+dz/d*2,-7,7);const v=Math.hypot(x-p.x,z-p.z)>.15?toward(p,x,z):{x:0,z:0};for(const q of ghosts){const r=dist(p,q);if(q.alive&&r<2.8&&r>.001){v.x+=(p.x-q.x)/r*(2.8-r)*1.5;v.z+=(p.z-q.z)/r*(2.8-r)*1.5;}}return {...v,a:ghosts.some(q=>q.alive&&dist(p,q)<1.65)&&p.y===0};});
    c.move(p,input,4.5);c.jump(p,input);if(Math.hypot(input.x,input.z)>.1){const l=Math.hypot(input.x,input.z);face={x:input.x/l,z:input.z/l};}
    let captured=0;
    ghosts.forEach(g=>{if(!g.alive)return;const d=dist(p,g),dx=(g.x-p.x)/(d||1),dz=(g.z-p.z)/(d||1);g.frozen=dx*face.x+dz*face.z>.25;
      if(!g.frozen){const v=toward(g,p.x,p.z);g.x+=v.x*dt*2.1;g.z+=v.z*dt*2.1;}
      const gate=paintings.find(a=>a.color===g.color&&dist(a,g)<.8);
      if(gate){g.alive=false;captured++;if(gate===paintings[2]){center=(center+1)%3;gate.color=center;}}
      else if(dist(p,g)<.62&&p.y<1.25)lose(c,'유령에 붙잡혔습니다');
    });
    if(captured)c.points(p,captured*100+Math.max(0,captured-1)*100);
    if(p.score>=1000)win(c,'Shroom City 목표 1,000점 달성');else if(ghosts.every(g=>!g.alive))spawn();
  },render(){c.arena({width:20,depth:16,color:'#847f9b'});paintings.forEach((a,i)=>{box(c,`frame-${i}`,a.x,1.9,a.z,2.5,3.8,.35,GOLD);box(c,`portrait-${i}`,a.x,1.9,a.z+.2,2.1,3.3,.12,COLORS[a.color]);text(c,`portrait-face-${i}`,'● ●',a.x,2,a.z+.4,2);});ghosts.forEach((g,i)=>{if(g.alive){ball(c,`ghost-${i}`,g.x,.9+Math.sin(c.time*3+i)*.15,g.z,1.2,COLORS[g.color],{opacity:g.frozen?.6:1});text(c,`eyes-${i}`,g.frozen?'— —':'● ●',g.x,1.15,g.z+.5,1);}});targetLabel(c,p,1000);}};
}

function grabbit(c) {
  const p=solo(c,60);c.bounds={x:8,z:5.5};let face={x:0,z:-1},dash=0,stun=0;
  const holes=[{x:-7,z:-4.5},{x:7,z:-4.5},{x:-7,z:4.5},{x:7,z:4.5}];
  const rabbits=holes.map((h,i)=>({x:h.x*.55,z:h.z*.55,hole:i,hidden:0,flee:false}));
  return {update(dt){c.hint('살금살금 접근해 A로 다이빙! B 달리기 · 60초 안에 토끼 7마리');
    const q=rabbits.filter(q=>q.hidden<=c.time).sort((a,b)=>dist(p,a)-dist(p,b))[0];
    const input=c.input(p,()=>q?{...toward(p,q.x,q.z),a:dist(p,q)<2.1&&dash===0&&c.time>stun}:{});
    if(dash>0){p.x+=face.x*dt*13;p.z+=face.z*dt*13;dash=Math.max(0,dash-dt);p.pose='dive';if(Math.abs(p.x)>8||Math.abs(p.z)>5.5){p.x=clamp(p.x,-8,8);p.z=clamp(p.z,-5.5,5.5);dash=0;stun=c.time+.8;}}
    else if(c.time>stun){c.move(p,input,input.b?5:2.4);const d=Math.hypot(input.x,input.z);if(d>.1)face={x:input.x/d,z:input.z/d};if(input.ap)dash=.3;}
    rabbits.forEach(r=>{if(r.hidden>c.time)return;if(r.hidden){const h=holes[r.hole];r.x=h.x*.55;r.z=h.z*.55;r.hidden=0;r.flee=false;}
      if(dash>0&&dist(p,r)<1.1){c.points(p);r.hidden=c.time+1.8;return;}
      if(dist(p,r)<(input.b?3.4:1.6))r.flee=true;
      if(r.flee){const h=holes[r.hole],v=toward(r,h.x,h.z);r.x+=v.x*dt*4;r.z+=v.z*dt*4;if(dist(r,h)<.35)r.hidden=c.time+2.4;}
      else {r.x+=Math.cos(c.time*.9+r.hole*2)*dt*.25;r.z+=Math.sin(c.time+r.hole)*dt*.25;}
    });if(p.score>=7)win(c,'토끼 일곱 마리 포획');
  },render(){c.arena({width:18,depth:13,color:'#93bf87'});holes.forEach((h,i)=>c.draw(`hole-${i}`,'cylinder',{x:h.x,y:.01,z:h.z,sx:1.4,sy:.06,sz:1.1,color:'#4e644b'}));rabbits.forEach((r,i)=>{if(r.hidden<=c.time){ball(c,`rabbit-${i}`,r.x,.45,r.z,.8,'#f9edda');[-.2,.2].forEach((dx,j)=>ball(c,`ear-${i}-${j}`,r.x+dx,1,r.z,.3,'#f8c5c2',{sy:.8}));}});targetLabel(c,p,7,'마리');},timeout:timeoutGoal(c,p,7)};
}

function chompWalker(c) {
  const p=solo(c,60);c.bounds={x:6,z:100};p.z=3;const pet={x:0,z:7};let eating=0,boost=0,warning=0;
  const snacks=Array.from({length:10},(_,i)=>({x:i%2?-2.4:2.4,z:-4-i*5.8,meat:i%3===2,eaten:false}));
  return {update(dt){c.hint('사슬 친구를 결승선까지 끌어 주세요. 뼈는 지연, 고기는 돌진! 풀밭은 느립니다.');
    const input=c.input(p,()=>({x:Math.abs(p.x)>.1?-Math.sign(p.x):0,z:-1}));c.move(p,input,Math.abs(p.x)>3?2:4.3,false);p.x=clamp(p.x,-5.7,5.7);
    const d=dist(p,pet);if(d>5.6){const v=toward(p,pet.x,pet.z);p.x+=v.x*(d-5.6);p.z+=v.z*(d-5.6);}
    if(c.time>eating){const food=snacks.find(s=>!s.eaten&&dist(pet,s)<2);if(food){food.eaten=true;if(food.meat)boost=c.time+2.1;else eating=c.time+2;}
      if(dist(p,pet)<2&&c.time>boost&&warning===0)warning=c.time+.7;
      const speed=c.time<boost?7:warning&&c.time>warning?7.5:2.8;
      const v=toward(pet,p.x,p.z);pet.x+=v.x*dt*speed;pet.z+=v.z*dt*speed;
      if(warning&&c.time>warning+1.2)warning=0;
      if(dist(p,pet)<.8)lose(c,'사슬 친구의 돌진에 부딪혔습니다');
    }
    p.score=Math.max(p.score,Math.min(100,-pet.z/62*100));if(pet.z<=-62)win(c,'사슬 친구와 결승점 도착');
    c.view={size:22,eye:[0,18,p.z+15],target:[0,0,p.z-4]};
  },render(){box(c,'grass',0,-.3,-30,16,.5,83,GREEN);box(c,'path',0,-.01,-30,6,.1,83,'#c5ab7b');box(c,'finish',0,.08,-62,6,.1,.6,PINK);snacks.forEach((s,i)=>{if(!s.eaten){ball(c,`food-${i}`,s.x,.35,s.z,.8,s.meat?PINK:'#f5ead2');text(c,`food-label-${i}`,s.meat?'고기':'뼈',s.x,1,s.z,1.8);}});ball(c,'pet',pet.x,1,pet.z,2.1,'#465f75');text(c,'pet-eye',c.time<eating?'냠':warning?'!':'● ●',pet.x,1.5,pet.z+.7,2);for(let i=1;i<9;i++)ball(c,`chain-${i}`,pet.x+(p.x-pet.x)*i/9,.45,pet.z+(p.z-pet.z)*i/9,.25,'#bdc3cb');},timeout(){lose(c,'60초 안에 결승점에 도착하지 못했습니다');}};
}

function cloudClimb(c) {
  const p=solo(c,60);side(c);p.x=0;p.y=.3;p.vy=0;
  const clouds=Array.from({length:19},(_,i)=>({x:i===0?0:Math.sin(i*1.7)*3.5,y:i*2, spring:i>0&&i%5===0}));let highest=0,stun=0,lastCloud=0,launched=false;const ampPhase=c.rand(0,Math.PI*2);
  return {update(dt){c.hint('좌우로 구름을 밟고 올라가세요. A로 첫 점프 · 용수철은 높이, 전기는 추락!');
    const next=clouds[Math.min(lastCloud+1,clouds.length-1)];
    const input=c.input(p,()=>{let x=Math.abs(next.x-p.x)>.2?Math.sign(next.x-p.x):0;for(const [i,y] of [12,24].entries()){const ax=Math.sin((c.time+.15)*1.3+i+ampPhase)*6;if(Math.abs(p.y-y)<1.8&&Math.abs(p.x-ax)<2)x=p.x>ax?1:-1;}return{x,a:!launched};});
    if(c.time>stun)p.x=clamp(p.x+input.x*dt*6.5,-9,9);const old=p.y;if(input.ap&&!launched){p.vy=10.7;launched=true;}p.vy-=18*dt;p.y+=p.vy*dt;
    if(p.vy<=0){const land=clouds.filter(q=>Math.abs(p.x-q.x)<1.7&&old>=q.y&&p.y<=q.y).sort((a,b)=>b.y-a.y)[0];if(land&&c.time>stun){p.y=land.y;p.vy=land.spring?14.5:10.7;lastCloud=clouds.indexOf(land);}}
    const amps=[12,24].map((y,i)=>({x:Math.sin(c.time*1.3+i+ampPhase)*6,y}));if(c.time>stun&&amps.some(a=>Math.hypot(p.x-a.x,p.y-a.y)<1)){stun=c.time+.65;p.vy=-5;}
    highest=Math.max(highest,p.y);p.score=Math.floor(highest);side(c,23,Math.max(5,p.y));if(p.y>=36)win(c,'구름 정상에 도착');else if(p.y<Math.max(-2,highest-12))lose(c,'구름 아래로 추락했습니다');
  },render(){clouds.forEach((q,i)=>{ball(c,`cloud-${i}`,q.x,q.y-.25,0,3.6,'#f3eee2',{sy:.5,sz:1.6});if(q.spring)box(c,`spring-${i}`,q.x,q.y+.2,0,1,.3,1,GOLD);});[12,24].forEach((y,i)=>{const x=Math.sin(c.time*1.3+i+ampPhase)*6;ball(c,`amp-${i}`,x,y,0,1.2,'#526372');text(c,`amp-spark-${i}`,'⚡',x,y+1,0,2,GOLD);});box(c,'cloud-goal',0,36,-.5,18,.3,2,PINK);},timeout(){lose(c,'60초 안에 구름 정상에 도달하지 못했습니다');}};
}

function barrelPeril(c) {
  const p=solo(c,60);p.z=3;let stun=0;
  const guards=Array.from({length:8},(_,i)=>({x:i%2?3.8:-3.8,z:-5-i*7,phase:c.rand(0,4)}));
  const phase=g=>(c.time+g.phase)%4.8;
  return {update(dt){c.hint('방향키로 통을 옮기세요. A 숨기, B 달리기 · 공격에 노출되면 3초간 기절!');
    const near=guards.find(g=>Math.abs(g.z-p.z)<4&&phase(g)>2.5);
    const input=c.input(p,()=>({z:-1,a:!!near,b:!near}));p.scale=input.a?.35:.8;
    if(c.time>stun&&!input.a){p.z+=input.z*dt*(input.b?5.8:3.5);p.x=clamp(p.x+input.x*dt*3,-2.3,2.3);}
    for(const g of guards){if(phase(g)>3.25&&phase(g)<4.25&&Math.abs(g.z-p.z)<1.6&&!input.a&&c.time>stun){stun=c.time+3;p.z+=3.5;}}
    p.score=Math.min(100,Math.max(0,-p.z/63*100));if(p.z<-63)win(c,'통에 숨어 결승점 통과');c.view={size:23,eye:[0,18,p.z+15],target:[0,0,p.z-5]};
  },render(){box(c,'barrel-path',0,-.25,-30,9,.5,80,'#a9bd91');guards.forEach((g,i)=>{const t=phase(g),charge=t>3.25&&t<4.25;ball(c,`guard-${i}`,charge?g.x*(1-Math.sin((t-3.25)*Math.PI)):g.x,1,g.z,2.4,'#46536d');text(c,`guard-state-${i}`,t<2.5?'Zzz':t<3.25?'!':'怒',g.x,2.8,g.z,2,t<2.5?'#46536d':PINK);});c.draw('barrel','cylinder',{x:p.x,y:.5,z:p.z,sx:1.5,sy:1.2,sz:1.5,color:'#ae825d'});box(c,'barrel-finish',0,.1,-63,9,.2,.5,PINK);},timeout(){lose(c,'60초 안에 결승점에 도착하지 못했습니다');}};
}

function bigPopper(c) {
  const p=solo(c,60);side(c,23,5);const bubbles=[];let spawn=.7,nextId=0,lastPop=-5,chain=0,nextFan=0;
  return {update(dt){c.hint('좌우 이동 · A 부채질로 비눗방울을 위 가시로! 연속 배수 1→3→5→7→10, 바닥 -10점 · 목표 70점');
    const q=bubbles.filter(q=>q.alive&&q.vy<=0).sort((a,b)=>a.y-b.y)[0];const input=c.input(p,()=>q?{x:Math.abs(q.x*1.35-p.x)>.2?Math.sign(q.x*1.35-p.x):0,a:q.y<3.2&&Math.abs(q.x-p.x)<2.35&&c.time>nextFan}:{});
    p.x=clamp(p.x+input.x*dt*6,-9,9);
    if(input.ap&&c.time>nextFan){nextFan=c.time+.2;bubbles.forEach(q=>{if(q.alive&&Math.abs(q.x-p.x)<2.4&&q.y<4.2){q.vy=5.6;q.vx=(q.x-p.x)*2.5;}});}
    if(c.time>spawn){spawn=c.time+Math.max(.48,1.1-c.time*.007);bubbles.push({id:nextId++,x:c.rand(-5,5),y:10,vx:0,vy:-1.3,red:c.rng()<.18,alive:true});}
    for(const q of bubbles){if(!q.alive)continue;q.x+=q.vx*dt;q.y+=q.vy*dt;if(q.vy>0)q.vy-=dt*2;else q.vy=Math.min(-1.3,q.vy);q.vx*=Math.pow(.993,dt*60);
      if(Math.hypot(q.x,q.y-8.3)<1.7){q.alive=false;chain=c.time-lastPop<2?Math.min(chain+1,4):0;lastPop=c.time;c.points(p,[1,3,5,7,10][chain]);if(q.red)c.limit+=4;}
      else if(q.y<.3||Math.abs(q.x)>11){q.alive=false;c.points(p,-10);chain=0;}
    }if(p.score>=70)win(c,'비눗방울 70점 달성');
  },render(){box(c,'fan-floor',0,-.4,0,22,.5,5,GREEN);ball(c,'spike-wheel',0,8.3,0,2.8,'#748794');for(let i=0;i<10;i++){const a=i*Math.PI/5+c.time; c.draw(`spike-${i}`,'cone',{x:Math.cos(a)*1.6,y:8.3+Math.sin(a)*1.6,z:0,sx:.5,sy:1,sz:.5,color:'#dce5d8',rz:a-Math.PI/2});}bubbles.forEach(q=>{if(q.alive)ball(c,`bubble-${q.id}`,q.x,q.y,0,1.1,q.red?PINK:BLUE,{opacity:.7});});text(c,'pop-score',`${p.score} / 70`,0,11,0,6);box(c,'fan',p.x+.7,.9,.3,.8,.7,.1,GOLD,{rz:c.time<nextFan?.5:0});},timeout:timeoutGoal(c,p,70)};
}

function forestJump(c) {
  const p=solo(c);side(c,24,4);const logs=[];let next=1.5,id=0,stun=0;
  return {update(dt){const wind=.8+Math.sin(c.time*.5)*1.1;c.hint('A 점프 · B 숙이기 · 좌우로 바람에 버티세요. 가장자리 회피는 보너스 · 목표 300점');
    const near=logs.find(q=>!q.scored&&q.x>p.x&&q.x-p.x<3.5),input=c.input(p,()=>({x:Math.abs(p.x)>1?-Math.sign(p.x):wind>0?-.3:.3,a:!!near&&near.y<1.2&&p.y===0,b:!!near&&near.y>=1.2}));
    if(c.time>stun)p.x+=input.x*dt*4.5;p.x+=wind*dt;c.jump(p,input,7.8);p.scale=input.b&&p.y===0?.4:.8;
    if(c.time>next){next=c.time+c.rand(1.7,2.5);logs.push({id:id++,x:11,y:id%3===0?1.9:.5,large:id%4===0,scored:false});}
    logs.forEach(q=>{const old=q.x;q.x-=dt*(4.2+Math.min(2,c.time*.025));if(old>p.x&&q.x<=p.x&&!q.scored){q.scored=true;const safe=q.y<1.2?p.y>(q.large?1.25:.8):input.b&&p.y<.2;if(safe)c.points(p,Math.abs(p.x)>5?100:50);else{p.x-=2;stun=c.time+.65;}}});
    if(Math.abs(p.x)>7.5)lose(c,'바람에 밀려 절벽 아래로 떨어졌습니다');if(p.score>=300)win(c,'통나무 회피 300점 달성');
  },render(){box(c,'cliff',0,-.6,0,15,1.2,5,'#bfa97d');logs.forEach(q=>{if(q.x>-12)c.draw(`log-${q.id}`,'cylinder',{x:q.x,y:q.y,z:0,sx:q.large?1.8:1.2,sy:2.4,sz:q.large?1.8:1.2,color:'#936e50',rx:Math.PI/2});});text(c,'forest-score',`${p.score} / 300`,0,8,0,6);text(c,'wind-arrow','바람  →',0,6,0,5);}};
}

function switchWay(c) {
  const p=solo(c,99);side(c,25,7);p.x=-7;p.y=0;p.vy=0;let standing=null,pounding=false,botLift=0,botPound=false;
  const lifts=[{x:-6,y:1,top:8,vertical:false,life:0},{x:0,y:6,top:13,vertical:false,life:0},{x:5,y:11,top:18,vertical:false,life:0}];
  const hit=l=>{l.vertical=!l.vertical;};
  return {update(dt){c.hint('좌우 이동 · A 점프 · 공중 B 엉덩이 찍기로 블록 방향 전환. 위에 서면 움직이고 오래 타면 사라집니다.');
    const current=standing, next=lifts.find(l=>l.y>p.y+.6&&l.life<14);
    const input=c.input(p,()=>{
      if(standing){
        botLift=lifts.indexOf(standing);
        if(!standing.vertical){botPound=true;return {a:true};}
        if(botLift<2&&standing.y>=lifts[botLift+1].y+1){botLift++;return {x:Math.sign(lifts[botLift].x-p.x),a:true};}
        return{};
      }
      const l=lifts[botLift];
      if(botPound&&p.y>l.y+.7){botPound=false;return{b:true};}
      return{x:Math.abs(l.x-p.x)>.25?Math.sign(l.x-p.x):0,a:p.y===0};
    });
    if(input.ap&&(standing||p.y===0)){p.vy=9.6;standing=null;}
    if(input.bp&&p.y>0){pounding=true;p.vy=-13;}
    p.x=clamp(p.x+input.x*dt*4.5,-9,9);const oldY=p.y;
    if(standing){const l=standing;l.life+=dt;if(l.life>14){standing=null;p.vy=0;}else if(l.vertical){l.y=Math.min(l.top,l.y+dt*1.55);p.y=l.y;}else{const shift=p.x<l.x?-.8:.8;l.x=clamp(l.x+shift*dt,-7.5,7.5);p.x+=shift*dt;p.y=l.y;}if(Math.abs(p.x-l.x)>2)standing=null;}
    else {p.vy-=18*dt;p.y+=p.vy*dt;for(const l of lifts){if(l.life>=14||Math.abs(p.x-l.x)>2)continue;if(p.vy>0&&oldY+1.6<l.y&&p.y+1.6>=l.y){hit(l);p.vy=-1;}if(p.vy<=0&&oldY>=l.y&&p.y<=l.y){p.y=l.y;p.vy=0;standing=l;if(pounding){hit(l);pounding=false;}}}if(p.y<0){p.y=0;p.vy=0;pounding=false;}}
    p.score=Math.max(p.score,p.y);side(c,25,Math.max(7,p.y));if(p.y>=18)win(c,'방향 전환 블록으로 목표 높이 도달');
  },render(){box(c,'switch-ground',0,-.3,0,20,.6,4,GREEN);lifts.forEach((l,i)=>{if(l.life<14){box(c,`lift-${i}`,l.x,l.y-.25,0,4,.5,2,GOLD);text(c,`lift-arrow-${i}`,l.vertical?'↑':'↔',l.x,l.y+.35,0,2);}});box(c,'switch-goal',0,18,-1,18,.3,1,PINK);},timeout(){lose(c,'99초 안에 목표에 도달하지 못했습니다');}};
}

function amplifried(c) {
  const p=solo(c);c.bounds={x:6.3,z:5.3};let start=0,wave=0,beams=[],scored=false;
  const reset=()=>{scored=false;beams=Array.from({length:Math.min(1+Math.floor(wave/3),3)},()=>{const a=c.rand(0,Math.PI*2),b=a+Math.PI+c.rand(-.8,.8);return{a:{x:Math.cos(a)*7,z:Math.sin(a)*6},b:{x:Math.cos(b)*7,z:Math.sin(b)*6}};});};reset();
  const distance=(q,b)=>{const dx=b.b.x-b.a.x,dz=b.b.z-b.a.z,t=clamp(((q.x-b.a.x)*dx+(q.z-b.a.z)*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(q.x-b.a.x-t*dx,q.z-b.a.z-t*dz);};
  return {update(dt){const t=c.time-start;c.hint('전기 예고선을 보고 피하세요. 가까스로 피할수록 높은 점수 · 한 번 감전되면 실패 · 목표 300점');
    const input=c.input(p,()=>{
      const options=[];for(let x=-5.5;x<=5.5;x+=.5)for(let z=-4.5;z<=4.5;z+=.5)options.push({x,z});
      const safe=options.filter(a=>Math.min(...beams.map(q=>distance(a,q)))>1);
      const target=(safe.length?safe:options).sort((a,b)=>dist(p,a)-dist(p,b))[0];
      return dist(p,target)>.1?toward(p,target.x,target.z):{};
    });c.move(p,input,6);
    if(t>=1.1&&t<1.65&&beams.some(b=>distance(p,b)<.38))lose(c,'전기에 닿았습니다');
    if(t>=1.65&&!scored){scored=true;const near=Math.min(...beams.map(b=>distance(p,b)));c.points(p,Math.round(10+40/(near+.5)));if(p.score>=300)win(c,'전기 회피 300점 달성');}
    if(t>=2.2){wave++;start=c.time;reset();}
  },render(){c.arena({width:14,depth:12,color:'#9197b3'});beams.forEach((b,i)=>{const dx=b.b.x-b.a.x,dz=b.b.z-b.a.z,t=c.time-start;[b.a,b.b].forEach((a,j)=>ball(c,`amp-${i}-${j}`,a.x,.75,a.z,1.1,'#47556e'));box(c,`electric-${i}`,(b.a.x+b.b.x)/2,.45,(b.a.z+b.b.z)/2,Math.hypot(dx,dz),t<1.1?.05:.3,.15,t<1.1?'#d0ccaa':'#ffe76a',{ry:-Math.atan2(dz,dx),opacity:t>=1.65?.12:1,glow:t>=1.1&&t<1.65});});targetLabel(c,p,300);}};
}

function flingshot(c) {
  const p=solo(c);side(c,26,5);let power=0,expected='a',vx=0,vy=0,launched=false;const used=new Set();p.y=4;
  const drafts=[{x:24,vertical:true},{x:46,vertical:false},{x:75,vertical:true}];
  return {update(dt){c.hint(c.time<5?'5초 동안 A/B 번갈아 연타해 고무줄을 당기세요!':'↑ 높이 날기 · ↓ 급강하 · 상승기류를 타고 5,000점까지!');
    const input=c.input(p,()=>c.time<5?{a:Math.floor(c.time*12)%2===0,b:Math.floor(c.time*12)%2===1}:{z:-.5});
    if(c.time<5){if(input[expected+'p']){power++;expected=expected==='a'?'b':'a';}return;}
    if(!launched){launched=true;vx=7+power*.21;vy=4;}
    const pitch=-input.z;vx=Math.max(1,vx-dt*(.13+Math.max(0,pitch)*.13));vy-=dt*(1.2-.8*Math.max(0,pitch));if(pitch<0)vy+=pitch*dt*2;p.x+=vx*dt;p.y+=vy*dt;p.rotation=0;p.pose='jump';
    drafts.forEach((d,i)=>{if(Math.abs(p.x-d.x)<2&&p.y>0&&!used.has(i)){used.add(i);if(d.vertical)vy=6;else vx+=6;}});p.score=Math.floor(p.x*12);side(c,26,Math.max(5,p.y),p.x+5);
    if(p.y<=0){p.y=0;p.score>=5000?win(c,'비행 거리 5,000점 달성'):lose(c,'5,000점 전에 착지했습니다');}
  },render(){box(c,'flight-ground',p.x,-.5,0,45,1,8,GREEN);drafts.forEach((d,i)=>{if(Math.abs(d.x-p.x)<30){box(c,`draft-${i}`,d.x,5,0,3,10,1,BLUE,{opacity:.25});text(c,`draft-arrow-${i}`,d.vertical?'↑ ↑':'→ →',d.x,6,0,4,BLUE);}});if(!launched){box(c,'sling-left',-1.5,2,0,.4,5,.5,'#9b7652');box(c,'sling-right',1.5,2,0,.4,5,.5,'#9b7652');text(c,'charge',`힘 ${power}`,0,8,0,5);}text(c,'flight-score',`${p.score} / 5000`,p.x+4,Math.max(10,p.y+4),0,6);}};
}

function spookySpike(c) {
  const p=solo(c,30);const targets=[{x:-3,z:0},{x:3,z:0},{x:0,z:-3},{x:0,z:3}];let start=0,target=c.int(0,3),dived=false,returned=false,returnAt=0;const state={prev:-1};
  return {update(){const t=c.time-start;c.hint('공 그림자를 보고 방향키로 다이빙! 30초 안에 공 10개를 받아내세요.');
    const input=c.input(p,()=>t>.85&&t<1.15&&!dived?dirInput(target):{}),d=directionEdge(state,input);
    if(d>=0&&!dived){dived=true;p.x=targets[d].x;p.z=targets[d].z;p.pose='dive';returnAt=c.time+.55;if(d===target&&t>=.75&&t<=1.3){returned=true;c.points(p);}}
    if(dived&&c.time>returnAt){p.x=p.z=0;p.pose='idle';}
    if(t>1.8){start=c.time;target=c.int(0,3);dived=false;returned=false;p.x=p.z=0;}
    if(p.score>=10)win(c,'공 열 개를 받아냈습니다');
  },render(){c.arena({width:13,depth:12,color:'#ddcaa0'});box(c,'volley-net',0,1,-5,13,2,.15,'#f6efe0');const q=targets[target],t=c.time-start;c.draw('ball-shadow','cylinder',{x:q.x,y:.04,z:q.z,sx:1.4,sy:.03,sz:1.4,color:'#8e826d'});ball(c,'spike-ball',q.x,returned?3+(t-.9)*5:Math.max(.2,7-t*5.3),q.z,1,GOLD);ball(c,'ghost-server',0,3,-6,1.8,'#efebd9');targetLabel(c,p,10,'개');},timeout:timeoutGoal(c,p,10)};
}

function bobOOOM(c) {
  const p=solo(c,60);side(c,26,6);p.y=10;let bombs=[],held=null,nextBomb=0,id=0,stun=0,statues=[];
  const refill=()=>{statues=Array.from({length:16},(_,i)=>({x:(i%4-1.5)*2.4,y:Math.floor(i/4)*1.9+.7,hp:2}));};refill();
  const make=()=>({id:id++,x:p.x,y:11,fuse:2.8,vy:0,dropped:false});
  return {update(dt){c.hint('좌우 이동 · A 폭탄 놓기 · B 달리기. 도화선 시간을 맞춰 조각상을 부수세요. 여러 개 동시 파괴는 시간 보너스 · 1,500점');
    const target=statues.filter(q=>q.hp>0).sort((a,b)=>b.y-a.y)[0];
    const input=c.input(p,()=>({x:target&&Math.abs(target.x-p.x)>.2?Math.sign(target.x-p.x):0,a:!!held&&held.fuse<Math.sqrt(2*(9.7-(target?.y??1))/12),b:true}));
    if(c.time>stun){p.x=clamp(p.x+input.x*dt*(input.b?6:3),-6.5,6.5);if(input.ap&&held){held.dropped=true;held.x=p.x;held.y=9.7;held=null;}}
    if(!held&&c.time>nextBomb&&c.time>stun){held=make();bombs.push(held);nextBomb=c.time+3.2;}
    for(const b of bombs){if(b.done)continue;b.fuse-=dt;if(!b.dropped){b.x=p.x;b.y=11;}else{b.vy-=12*dt;b.y+=b.vy*dt;b.y=Math.max(.3,b.y);}
      if(b.fuse<=0){b.done=true;if(!b.dropped){stun=c.time+1.3;if(held===b)held=null;}else{let destroyed=0;for(const q of statues){if(q.hp>0&&Math.hypot(q.x-b.x,q.y-b.y)<2.8){q.hp--;if(q.hp===0){destroyed++;c.points(p,100);}}}if(destroyed>=2)c.limit+=destroyed*2;}
      b.blastUntil=c.time+.35;}
    }if(statues.every(q=>q.hp===0))refill();if(p.score>=1500)win(c,'조각상 파괴 1,500점 달성');
  },render(){box(c,'bomb-walkway',0,9.5,-.7,16,.3,2,GREEN);statues.forEach((q,i)=>{if(q.hp>0){box(c,`statue-${i}`,q.x,q.y,0,2,1.7,1.7,q.hp===2?'#9a91a0':'#bcaba9');text(c,`statue-face-${i}`,q.hp===2?'● ●':'╱╲',q.x,q.y+.1,1,1.7);}});bombs.forEach(b=>{if(!b.done){ball(c,`bomb-${b.id}`,b.x,b.y,0,.85,b.fuse<.65?PINK:'#4f586f');text(c,`fuse-${b.id}`,b.fuse.toFixed(1),b.x,b.y+1,0,1.4);}else if(c.time<b.blastUntil)ball(c,`blast-${b.id}`,b.x,b.y,0,5.4,GOLD,{opacity:.4});});text(c,'bomb-score',`${p.score} / 1500`,0,14,0,6);},timeout:timeoutGoal(c,p,1500)};
}

function reelCheep(c) {
  const p=solo(c,30);p.x=0;p.z=7;const bobber={x:0,z:0},fish=Array.from({length:5},(_,i)=>({x:(i-2)*3,z:i%2?-2:2,weight:[320,540,680,780,920][i],phase:c.rand(0,6),taken:false}));let hooked=null,sequence=[],step=0,bite=0,escape=0,cooldown=0;
  return {update(dt){c.hint('Mini-Game Attack · 방향키로 찌를 물고기 위로. 입질 뒤 표시된 A/B 순서로 감아 30초 안에 700파운드 초과!');
    const target=fish.filter(f=>!f.taken&&f.weight>700).sort((a,b)=>a.weight-b.weight)[0]||fish.find(f=>!f.taken);
    const input=c.input(p,()=>hooked?(Math.sin(c.time*16)>.2?{[sequence[step]]:true}:{}):target?toward(bobber,target.x,target.z):{});
    if(!hooked){bobber.x=clamp(bobber.x+input.x*dt*5,-8,8);bobber.z=clamp(bobber.z+input.z*dt*5,-4.5,4.5);fish.forEach(f=>{if(!f.taken){f.x+=Math.cos(c.time+f.phase)*dt*.45;f.z+=Math.sin(c.time*.8+f.phase)*dt*.3;}});const q=fish.find(f=>!f.taken&&dist(f,bobber)<.8);if(q&&c.time>cooldown){if(!bite)bite=c.time+.45;if(c.time>bite){hooked=q;sequence=Array.from({length:Math.ceil(q.weight/150)+2},()=>c.rng()<.5?'a':'b');step=0;escape=c.time+5;bite=0;}}else bite=0;}
    else {const k=input.ap?'a':input.bp?'b':null;if(k){if(k===sequence[step]){step++;if(step===sequence.length){p.score=Math.max(p.score,hooked.weight);hooked.taken=true;hooked=null;cooldown=c.time+.5;if(p.score>700)win(c,'700파운드를 넘는 물고기 포획');}}else{hooked=null;cooldown=c.time+1;}}
      if(hooked&&c.time>escape){hooked=null;cooldown=c.time+1;}}
  },render(){c.arena({width:19,depth:13,color:'#73b9c8'});box(c,'fishing-bank',0,-.1,7,19,.2,3,'#d8c299');fish.forEach((f,i)=>{if(!f.taken)ball(c,`fish-${i}`,f.x,-.05,f.z,f.weight/450,'#467488',{sy:.3,sz:.7});});ball(c,'bobber',bobber.x,.3,bobber.z,.65,PINK);if(hooked)text(c,'reel-sequence',sequence.map((v,i)=>i<step?'✓':v.toUpperCase()).join(' '),0,3,2,12);text(c,'fish-weight',`최대 ${p.score} lb · 목표 >700`,0,1,-7,10);},timeout(){p.score>700?win(c,'목표 무게 달성'):lose(c,'700파운드 초과 물고기를 낚지 못했습니다');}};
}

function shellStack(c) {
  const p=solo(c,60);side(c,23,5);p.x=0;p.y=0;p.vy=0;let shell=null,next=1,stun=0,id=0;
  const spawn=()=>{const color=Math.min(3,Math.floor(p.score/3));shell={id:id++,x:id%2?-9:9,y:p.score*.45+.55,speed:(id%2?1:-1)*(3.2+color*1.35),color};};
  return {update(dt){c.hint('A로 점프해서 날아오는 등껍질 위에 착지하세요. 60초 안에 10개! 놓치면 3초 기절.');
    const base=p.score*.45,input=c.input(p,()=>({a:!!shell&&Math.abs(shell.x/shell.speed)<.72&&p.y<=base+.01&&c.time>stun}));
    if(input.ap&&p.y<=base+.01&&c.time>stun)p.vy=7.8;
    const old=p.y;p.vy-=18*dt;p.y=Math.max(base,p.y+p.vy*dt);if(p.y===base)p.vy=0;
    if(!shell&&c.time>next&&c.time>stun)spawn();
    if(shell){shell.x+=shell.speed*dt;if(Math.abs(shell.x)<.8&&p.vy<0&&old>=shell.y&&p.y<=shell.y){c.points(p);p.y=p.score*.45;p.vy=0;shell=null;next=c.time+.55;}
      else if(Math.abs(shell.x)<.65&&p.y<shell.y-.1&&p.y+1.5>shell.y&&c.time>stun){shell=null;stun=c.time+3;next=stun;p.y=base;p.vy=0;}
      else if(Math.abs(shell.x)>10){shell=null;stun=c.time+3;next=stun;}}
    if(p.score>=10)win(c,'등껍질 열 개 쌓기');side(c,23,Math.max(5,base+3));
  },render(){box(c,'shell-ground',0,-.3,0,22,.6,4,'#a0bf93');for(let i=0;i<p.score;i++)ball(c,`stack-${i}`,0,i*.45+.2,0,1.5,GREEN,{sy:.5});if(shell){ball(c,'moving-shell',shell.x,shell.y,0,1.5,[GREEN,GOLD,'#eaaa68',PINK][shell.color],{sy:.65});[-9,9].forEach((x,i)=>box(c,`shell-pipe-${i}`,x,shell.y,0,1.2,1.2,2,[GREEN,GOLD,'#eaaa68',PINK][shell.color]));}text(c,'shell-count',`${p.score} / 10`,0,p.score*.45+8,0,5);},timeout:timeoutGoal(c,p,10)};
}

function billBounce(c) {
  const p=solo(c,30);side(c,24,5);p.vy=0;let bullets=[],next=.5,id=0,combo=0,stun=0;
  return {update(dt){c.hint('좌우 이동 · A 점프. 탄환을 연속으로 밟으면 10점씩 증가해 최대 200점! 30초 안에 1,000점');
    const input=c.input(p,()=>{
      let aim=null;
      for(const q of bullets.filter(q=>!q.used)){
        const initialVy=p.y===0?9.3:p.vy, disc=initialVy*initialVy+32*(p.y-q.y-.5);
        if(disc<0)continue;const arrival=(initialVy+Math.sqrt(disc))/16;if(arrival<=0)continue;
        const x=q.x+q.vx*arrival;
        if(Math.abs(x)<8.7&&Math.abs(x-p.x)<6*arrival+.8&&(!aim||arrival<aim.arrival))aim={x,arrival};
      }
      return {x:aim?clamp((aim.x-p.x)*2,-1,1):0,a:p.y===0&&!!aim};
    });
    if(c.time>stun)p.x=clamp(p.x+input.x*dt*6,-9,9);if(input.ap&&p.y===0&&c.time>stun)p.vy=9.3;
    const old=p.y;p.vy-=16*dt;p.y=Math.max(0,p.y+p.vy*dt);if(p.y===0){p.vy=0;combo=0;}
    if(c.time>next){next=c.time+.48;const side=id%2?1:-1;bullets.push({id:id++,x:side*11,y:.8+(id%3)*.7,vx:-side*5.2,used:false});}
    for(const b of bullets){b.x+=b.vx*dt;if(b.used)continue;if(Math.abs(b.x-p.x)<1&&p.vy<0&&old>=b.y+.5&&p.y<=b.y+.5){b.used=true;p.y=b.y+.5;p.vy=8.4;combo++;c.points(p,Math.min(200,combo*10));}
      else if(Math.abs(b.x-p.x)<.75&&p.y<b.y+.35&&p.y+1.5>b.y-.3&&c.time>stun){b.used=true;stun=c.time+1.2;p.vy=0;combo=0;}}
    bullets=bullets.filter(b=>Math.abs(b.x)<14);if(p.score>=1000)win(c,'연속 밟기 1,000점 달성');
  },render(){box(c,'bill-floor',0,-.3,0,22,.6,5,'#a1ba91');bullets.forEach(b=>{if(!b.used){ball(c,`bullet-${b.id}`,b.x,b.y,0,1.1,'#586477',{sx:1.8});text(c,`bullet-eye-${b.id}`,'●',b.x+.3,b.y+.2,.55,.7,'#fff5df');}});text(c,'bill-score',`${p.score} / 1000 · 연속 ${combo}`,0,8,0,10);},timeout:timeoutGoal(c,p,1000)};
}

function bunnyBelt(c) {
  const p=solo(c,30);p.z=4;const sequence=Array.from({length:4},()=>c.int(0,3));let step=0,bad=false,last=-1,lastBot=0,dolls=[];
  return {update(){c.hint('표시된 방향 네 번 → A로 인형 완성. 틀렸다면 B로 다시! 30초 안에 토끼 인형 10개');
    const input=c.input(p,()=>{if(c.time-lastBot<.26)return{};lastBot=c.time;return step<4?dirInput(sequence[step]):{a:true};});
    const n=direction(input),edge=n!==last?n:-1;last=n;
    if(input.bp){step=0;bad=false;}
    else if(step<4&&edge>=0){if(edge!==sequence[step])bad=true;step++;}
    else if(input.ap){const correct=step===4&&!bad;if(correct)c.points(p);dolls.push({time:c.time,good:correct});step=0;bad=false;}
    if(p.score>=10)win(c,'토끼 인형 열 개 완성');
  },render(){c.arena({width:19,depth:12,color:'#a9bec1'});box(c,'factory-machine',0,2,-2,8,4,3,'#7691a2');text(c,'bunny-order',sequence.map((n,i)=>i<step?'✓':arrow(n)).join('  ')+'  A',0,5.3,-1,10);box(c,'conveyor',0,.2,1,18,.4,2,'#4f6577');dolls.forEach((d,i)=>{const x=(c.time-d.time)*3-3;if(x<10){ball(c,`doll-body-${i}`,x,.8,1,.9,d.good?'#eee3cf':'#b095a3');if(d.good)[-.2,.2].forEach((dx,j)=>ball(c,`doll-ear-${i}-${j}`,x+dx,1.4,1,.25,PINK,{sy:.75}));else text(c,`doll-bad-${i}`,'?',x,1.6,1,1.3);}});text(c,'doll-count',`${p.score} / 10`,0,1,-7,6);},timeout:timeoutGoal(c,p,10)};
}

function pestAside(c) {
  const p=solo(c,30);const places=[{x:-5,z:0},{x:5,z:0},{x:0,z:-4},{x:0,z:4}],flowers=places.map(a=>({...a,health:2,need:null,since:0}));let next=.4,selected=0;
  return {update(){c.hint('방향키로 꽃 선택 · A 물 / B 벌레약. 빠른 관리 30점, 늦으면 20점 · 500점 목표, 꽃이 두 번 상하면 실패');
    const urgent=flowers.map((f,i)=>({f,i})).filter(q=>q.f.need!==null).sort((a,b)=>a.f.since-b.f.since)[0];
    const input=c.input(p,()=>urgent?{...dirInput(urgent.i),[urgent.f.need===0?'a':'b']:Math.sin(c.time*10)>.1}:{});const n=direction(input);if(n>=0)selected=n;
    if(c.time>next){next=c.time+c.rand(1.15,1.45);const free=flowers.filter(f=>f.need===null);if(free.length){const f=c.pick(free);f.need=c.int(0,1);f.since=c.time;}}
    const f=flowers[selected],k=input.ap?0:input.bp?1:-1;if(k>=0&&f.need!==null){if(k===f.need)c.points(p,c.time-f.since<2.2?30:20);else f.health--;f.need=null;}
    flowers.forEach(f=>{if(f.need!==null&&c.time-f.since>4){f.health--;f.need=null;}if(f.health<=0)lose(c,'꽃이 시들었습니다');});
    p.rotation=Math.atan2(-places[selected].z,places[selected].x);if(p.score>=500)win(c,'꽃 관리 500점 달성');
  },render(){c.arena({width:16,depth:13,color:'#a6c788'});flowers.forEach((f,i)=>{box(c,`stem-${i}`,f.x,.7,f.z,.17,1.5,.17,GREEN);ball(c,`flower-center-${i}`,f.x,1.7,f.z,.8,'#8e7250');for(let j=0;j<7;j++){const a=j*Math.PI*2/7;ball(c,`petal-${i}-${j}`,f.x+Math.cos(a)*.6,1.7+Math.sin(a)*.6,f.z,.6,f.health===2?GOLD:'#b6ad7c');}if(f.need!==null)text(c,`flower-need-${i}`,f.need===0?'물 A':'벌레 B',f.x,3.2,f.z,3,c.time-f.since>2.2?PINK:'#315264');if(i===selected)c.draw(`selected-${i}`,'ring',{x:f.x,y:.06,z:f.z,sx:2.4,sy:2.4,sz:1,rx:-Math.PI/2,color:PINK});});targetLabel(c,p,500);},timeout:timeoutGoal(c,p,500)};
}

function melonFolley(c) {
  const p=solo(c,10);let slot=6,standingSince=0,nextMove=0;const path=[6,3,0,1,4,7,8,5,2],tiles=Array.from({length:9},(_,i)=>({x:(i%3-1)*3,z:(Math.floor(i/3)-1)*3,alive:true,fruit:i!==6,melon:i===2}));p.x=tiles[slot].x;p.z=tiles[slot].z;
  return {update(){c.hint('방향키로 뗏목 이동 · B 빠르게. 떠난 뗏목은 가라앉습니다. 10초 안에 모든 과일, 통멜론은 마지막!');
    const step=path.indexOf(slot),target=path[step+1];const input=c.input(p,()=>target!==undefined&&c.time>nextMove?{x:Math.sign(target%3-slot%3),z:Math.sign(Math.floor(target/3)-Math.floor(slot/3)),b:true}:{});
    if(c.time>nextMove&&direction(input)>=0){const d=direction(input),x=slot%3+(d===0?-1:d===1?1:0),z=Math.floor(slot/3)+(d===2?-1:d===3?1:0);tiles[slot].alive=false;nextMove=c.time+(input.b?.16:.3);standingSince=c.time;
      if(x<0||x>2||z<0||z>2||!tiles[z*3+x].alive){lose(c,'물에 빠졌습니다');return;}slot=z*3+x;const q=tiles[slot];p.x=q.x;p.z=q.z;p.y=.25;if(q.fruit){const last=tiles.filter(t=>t.fruit).length===1;c.points(p,q.melon&&last?1000:100);q.fruit=false;}if(tiles.every(q=>!q.fruit))win(c,'Shroom City 과일 뗏목 한 스테이지 완주');
    }p.y=Math.max(0,p.y-c.dt*2);if(c.time-standingSince>1.7)lose(c,'뗏목에 너무 오래 머물렀습니다');
  },render(){c.arena({width:16,depth:14,color:'#66b8c7'});tiles.forEach((q,i)=>{if(q.alive){box(c,`raft-${i}`,q.x,.02,q.z,2.8,.25,2.8,'#b69869');for(let n=-1;n<=1;n++)box(c,`raft-line-${i}-${n}`,q.x+n*.7,.18,q.z,.06,.03,2.6,'#836e51');if(q.fruit){ball(c,`melon-${i}`,q.x,.65,q.z,q.melon?1.2:.8,q.melon?GREEN:PINK);if(q.melon)text(c,'melon-last','마지막',q.x,1.7,q.z,2.5);}}});text(c,'melon-count',`남은 과일 ${tiles.filter(q=>q.fruit).length}`,0,1,-7,7);},timeout(){lose(c,'10초 안에 과일을 모두 모으지 못했습니다');}};
}

function sortStack(c) {
  const p=solo(c,30);side(c,27,5);p.x=9;p.y=0;p.z=1;p.scale=.65;const colors=['#e98696',GOLD,BLUE,GREEN],books=c.shuffle(Array.from({length:16},(_,i)=>i<12?Math.floor(i/3):-1));let cursor=0,next=0;const hands=[-1,-1];
  const solved=()=>books.every((v,i)=>v<0||v===Math.floor(i/4))&&hands.every(v=>v<0);
  return {update(){c.hint('방향키로 책 선택 · A 오른손 / B 왼손 집기·놓기. 빈 칸에 놓으세요. 위부터 빨강·노랑·파랑·초록, 30초 안에 정리!');
    const input=c.input(p,()=>{let target=cursor,key=0;if(hands[0]>=0){target=books.findIndex((v,i)=>v<0&&Math.floor(i/4)===hands[0]);if(target<0){key=1;target=books.findIndex((v,i)=>Math.floor(i/4)===hands[0]&&v>=0&&v!==hands[0]);}}else if(hands[1]>=0){key=1;target=books.findIndex((v,i)=>v<0&&Math.floor(i/4)===hands[1]);if(target<0){key=0;target=books.findIndex((v,i)=>Math.floor(i/4)===hands[1]&&v>=0&&v!==hands[1]);}}else target=books.findIndex((v,i)=>v>=0&&v!==Math.floor(i/4));if(target<0)return{};const x=target%4-cursor%4,z=Math.floor(target/4)-Math.floor(cursor/4);return x?{x:Math.sign(x)}:z?{z:Math.sign(z)}:{[key?'b':'a']:Math.sin(c.time*12)>.1};});
    const dir=direction(input);if(dir<0)next=0;if(dir>=0&&c.time>next){const x=clamp(cursor%4+(dir===0?-1:dir===1?1:0),0,3),y=clamp(Math.floor(cursor/4)+(dir===2?-1:dir===3?1:0),0,3);cursor=y*4+x;next=c.time+.1;}
    [input.ap,input.bp].forEach((pressed,h)=>{if(!pressed)return;if(hands[h]<0&&books[cursor]>=0){hands[h]=books[cursor];books[cursor]=-1;}else if(hands[h]>=0&&books[cursor]<0){books[cursor]=hands[h];hands[h]=-1;}});
    p.score=books.filter((v,i)=>v>=0&&v===Math.floor(i/4)).length;if(solved())win(c,'책장을 색깔대로 정리했습니다');
  },render(){for(let row=0;row<4;row++){const y=9-row*2.5;box(c,`shelf-${row}`,0,y-1.15,0,15,.3,2,'#947756');text(c,`shelf-label-${row}`,['빨강','노랑','파랑','초록'][row],-9,y,0,2.5,colors[row]);for(let x=0;x<4;x++){const n=row*4+x,v=books[n],xx=(x-1.5)*3.2;if(v>=0)box(c,`book-${n}`,xx,y,0,1.8,1.9,.8,colors[v]);if(n===cursor)box(c,'book-cursor',xx,y,1.1,2.5,2.3,.08,PINK,{opacity:.35});}}hands.forEach((v,i)=>{text(c,`hand-label-${i}`,i?'B 왼손':'A 오른손',i?4:-4,-2,0,4);if(v>=0)box(c,`held-book-${i}`,i?4:-4,-.5,1,1.4,1.5,.8,colors[v]);});},timeout(){lose(c,'30초 안에 책장 정리를 마치지 못했습니다');}};
}

function onTheSpot(c) {
  const p=solo(c,30);p.z=4;let sequence=[],index=0,last=-1,lastBot=0,flash=0;
  const reset=()=>{sequence=Array.from({length:3+Math.floor(p.score/2)},()=>c.int(0,3));index=0;};reset();
  return {update(){c.hint('돌 친구가 알려 주는 방향 순서로 등을 누르세요. 틀리면 5초 감소! 30초 안에 다섯 명');
    const input=c.input(p,()=>{if(c.time-lastBot<.35)return{};lastBot=c.time;return dirInput(sequence[index]);});const n=direction(input),edge=n!==last?n:-1;last=n;
    if(edge>=0){flash=c.time+.2;if(edge===sequence[index]){index++;if(index===sequence.length){c.points(p);if(p.score>=5)win(c,'다섯 돌 친구의 등을 정확히 눌렀습니다');else reset();}}else{c.limit-=5;index=0;}}
  },render(){c.arena({width:17,depth:12,color:'#bcc49f'});box(c,'whomp-body',0,2,-1,6,4,2,'#8f969c');const points=[{x:-2,y:2},{x:2,y:2},{x:0,y:3.2},{x:0,y:.8}];points.forEach((q,i)=>ball(c,`back-spot-${i}`,q.x,q.y,.2,.75,i===sequence[index]&&c.time<flash?GOLD:'#d8c0a2'));text(c,'poke-order',sequence.map((v,i)=>i<index?'✓':arrow(v)).join('  '),0,5.7,-1,10);text(c,'poke-count',`${p.score} / 5`,0,1,-7,5);},timeout:timeoutGoal(c,p,5)};
}

export const games = {
  'Boo-Bye':booBye, 'Grabbit':grabbit, 'Chomp Walker':chompWalker, 'Cloud Climb':cloudClimb,
  'Barrel Peril':barrelPeril, 'Big Popper':bigPopper, 'Forest Jump':forestJump, 'Switch Way?':switchWay,
  'Amplifried':amplifried, 'Flingshot':flingshot, 'Spooky Spike':spookySpike, 'Bob-OOOM!':bobOOOM,
  'Reel Cheep':reelCheep, 'Shell Stack':shellStack, 'Bill Bounce':billBounce, 'Bunny Belt':bunnyBelt,
  'Pest Aside':pestAside, 'Melon Folley':melonFolley, 'Sort Stack':sortStack, 'On the Spot':onTheSpot,
};
export const supportedTitles = Object.fromEntries(Object.keys(games).map(name=>[name,['advance']]));
export const notes = {
  'Boo-Bye':'1P 솔로 · 방향 이동, A 점프. 유령을 바라보면 멈춥니다. 같은 색 그림으로 유인해 Shroom City 목표 1,000점. 지형 배치는 홍학 버전으로 재구성했습니다.',
  'Grabbit':'1P 솔로 · 방향 이동, A 다이빙, B 달리기. 다이빙 중 접촉해야 토끼가 잡힙니다. Shroom City: 60초 안에 7마리.',
  'Chomp Walker':'1P 솔로 · 방향 이동. 사슬의 길이를 유지하며 친구를 끌어 갑니다. 뼈는 지연, 고기는 가속, 풀은 감속. Shroom City: 60초 안에 결승점.',
  'Cloud Climb':'1P 솔로 · 좌우 이동, A 첫 점프. 구름 착지 시 자동 바운스, 용수철은 높이 뛰고 전기는 추락시킵니다. Shroom City: 60초 안에 정상.',
  'Barrel Peril':'1P 솔로 · 방향 이동, A 누르는 동안 숨기, B 달리기. 노출된 상태로 맞으면 원작처럼 3초 기절합니다. Shroom City: 60초 완주.',
  'Big Popper':'1P 솔로 · 좌우 이동, A 부채질. 연속 배수 1·3·5·7·10, 바닥 유실 -10, 빨강은 시간 추가. Shroom City 목표 70점. 빨강 추가시간은 이 버전에서 4초로 설정했습니다.',
  'Forest Jump':'1P 솔로 · 좌우 이동, A 점프, B 숙이기. 바람에 떠밀리며 통나무를 피합니다. Shroom City 목표 300점. 이 버전의 회피 점수는 기본 50·가장자리 100으로 설정했습니다.',
  'Switch Way?':'1P 솔로 · 좌우 이동, A 점프, 공중 B 엉덩이 찍기. 밑에서 머리로 치거나 위에서 찍어 가로/세로를 바꿉니다. 타면 작동하고 오래 타면 사라집니다. Shroom City 99초.',
  'Amplifried':'1P 솔로 · 방향 이동. 전기선 가까이 피할수록 더 높은 점수이며 피격 즉시 실패. Shroom City 목표 300점. 거리별 점수 곡선은 이 버전의 연속 함수로 조정했습니다.',
  'Flingshot':'1P 솔로 · 준비 5초 A/B 교대 연타, 비행 중 ↑ 상승 자세·↓ 급강하. 상승기류로 높이·거리를 얻습니다. Shroom City 목표 5,000점.',
  'Spooky Spike':'1P 솔로 · 그림자 방향으로 방향키를 눌러 다이빙. A/B는 사용하지 않습니다. Shroom City: 30초 안에 10회 받아내기.',
  'Bob-OOOM!':'1P 솔로 · 좌우 이동, A 폭탄 내려놓기, B 달리기. 도화선이 다 타기 전에 놓고 조각상 높이에 맞춰 터뜨립니다. Shroom City 목표 1,500점. 조각상 당 100점은 이 버전의 설정입니다.',
  'Reel Cheep':'1P 솔로 · 방향키로 찌 이동, 입질 후 원작 L/R를 A/B로 바꾼 표시 순서 입력. 이 종목은 확인된 Mini-Game Attack 기준: 30초 안에 700파운드 초과.',
  'Shell Stack':'1P 솔로 · A 점프만 사용. 날아오는 등껍질 위에 착지해 쌓습니다. Shroom City: 60초 안에 10개, 실패 시 3초 기절.',
  'Bill Bounce':'1P 솔로 · 좌우 이동, A 점프. 연속 밟기 10·20·30…최대 200점, 착지·피격 시 연속 종료. Shroom City: 30초 안에 1,000점.',
  'Bunny Belt':'1P 솔로 · 방향 순서 입력 후 A 제작, B 초기화. 틀린 순서로 끝내면 불량품입니다. Shroom City: 30초 안에 올바른 인형 10개.',
  'Pest Aside':'1P 솔로 · 방향으로 꽃 선택, A 물, B 벌레약. 일반 요청 30점·긴급 20점. Shroom City: 30초 안에 500점, 꽃이 두 번 상하면 실패.',
  'Melon Folley':'1P 솔로 · 방향 이동, B 빠르게. 떠난 뗏목은 가라앉으며 오래 머물러도 침몰. Shroom City: 10초 안에 한 스테이지의 과일 수집. 통멜론 마지막은 1,000점.',
  'Sort Stack':'1P 솔로 · 방향 선택, A 오른손·B 왼손 집기/놓기. 한 손에 한 권, 빈 칸으로 이동. 위에서 빨강·노랑·파랑·초록 순으로 정리. Shroom City 30초.',
  'On the Spot':'1P 솔로 · 화면에 표시된 방향 순서 입력. 오류 시 5초 감소. Shroom City: 30초 안에 다섯 명 완료.',
};
