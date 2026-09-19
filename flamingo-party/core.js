// Deterministic simulation; no DOM or renderer is required to run a game.
export const COLORS = ['#f376a0','#5aaae6','#edb83f','#53bb99'];
export const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
export const dist = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
export const toward = (p,x,z,speed=1) => { const d=Math.hypot(x-p.x,z-p.z)||1; return {x:(x-p.x)/d*speed,z:(z-p.z)/d*speed}; };
export function random(seed=1) { let a=seed|0;return () => {a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}; }
export class Session {
  constructor(factory,meta,{seed=Date.now(),humans=1,draw=()=>{}}={}) {
    this.meta=meta;this.rng=random(seed);this.seed=seed;this.humans=humans;this.time=0;this.dt=0;this.ended=false;this.result=null;this.draw=draw;
    this.bounds={x:8,z:5};this.view={size:20,eye:[0,18,18],target:[0,0,0]};this.players=Array.from({length:4},(_,i)=>({i,x:(i-1.5)*3,y:0,z:0,vx:0,vz:0,alive:true,score:0,color:COLORS[i],pose:'idle',rotation:0}));
    this.inputs=Array.from({length:4},()=>({}));this.previous=Array.from({length:4},()=>({}));this.events=[];this.message='';this.limit=meta.durationSeconds||60;this.game=factory(this,meta);if(!this.game||typeof this.game.update!=='function')throw new Error('Missing game update');
  }
  rand(a=0,b=1){return a+(b-a)*this.rng();}
  int(a,b){return Math.floor(this.rand(a,b+1));}
  pick(list){return list[this.int(0,list.length-1)];}
  shuffle(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=this.int(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;}
  input(p,bot={}){const raw=p.i<this.humans?this.inputs[p.i]:(typeof bot==='function'?bot():bot);const prev=this.previous[p.i],v={x:0,z:0,a:false,b:false,c:false,d:false,...raw};for(const k of ['a','b','c','d'])v[k+'p']=!!v[k]&&!prev[k];const pointer=raw?.pointer||{x:.5,y:.5,down:false,valid:false};v.pointer={...pointer,pressed:!!pointer.down&&!prev.pointer?.down,released:!pointer.down&&!!prev.pointer?.down};this.previous[p.i]={...v,pointer:{...v.pointer}};return v;}
  move(p,input,speed=5,bounds=true){if(!p.alive)return;let x=input.x||0,z=input.z||0;const d=Math.hypot(x,z);if(d>1){x/=d;z/=d;}p.x+=x*speed*this.dt;p.z+=z*speed*this.dt;p.pose=d>.05?'run':'idle';if(d>.05)p.rotation=Math.atan2(-z,x);if(bounds){p.x=clamp(p.x,-this.bounds.x,this.bounds.x);p.z=clamp(p.z,-this.bounds.z,this.bounds.z);}}
  jump(p,input,force=7){if(p.y<=.001&&input.ap){p.vy=force;p.y=.001;}if(p.y>0){p.vy=(p.vy||0)-18*this.dt;p.y=Math.max(0,p.y+p.vy*this.dt);p.pose='jump';}}
  eliminate(p){if(!p.alive)return;p.alive=false;p.outAt=this.time;this.events.push({type:'out',player:p.i,time:this.time});}
  points(p,n=1){p.score+=n;this.events.push({type:'score',player:p.i,points:n,time:this.time});}
  complete(winners,reason='경기 종료'){if(this.ended)return;this.ended=true;this.result={winners:[...new Set(winners)],reason,scores:this.players.map(p=>p.score),time:this.time};}
  highest(reason='가장 높은 점수'){const top=Math.max(...this.players.map(p=>p.score));this.complete(this.players.filter(p=>p.score===top).map(p=>p.i),reason);}
  survivors(reason='마지막까지 살아남기'){this.complete(this.players.filter(p=>p.alive).map(p=>p.i),reason);}
  lastStanding(){const alive=this.players.filter(p=>p.alive);if(alive.length<=1)this.complete(alive.map(p=>p.i),'생존 경기 종료');}
  teamWin(team,reason){this.complete(team,reason);}
  arena({width=18,depth=12,color='#76bec0',shape='box',height=.5}={}){this.draw('arena',shape,{x:0,y:-height/2,z:0,sx:width,sy:height,sz:depth,color});}
  sound(frequency,duration=.1,wave='sine'){this.events.push({type:'tone',frequency,duration,wave,time:this.time});}
  hint(message){this.message=message;}
  step(dt,inputs=this.inputs){if(this.ended){this.game.render?.();return;}this.dt=Math.min(dt,1/30);this.time+=this.dt;this.inputs=inputs;this.game.update(this.dt);this.game.render?.();if(this.time>=this.limit&&!this.ended){if(this.game.timeout)this.game.timeout();else this.highest('시간 종료');}}
}
