import {clamp} from './draw.js';
export function random(seed=1){let a=seed|0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export const neutral=()=>({x:0,y:0,a:false,b:false,pointer:{x:450,y:300,down:false,valid:false}});
export class Session{
 constructor(meta,{seed=Date.now(),sound=()=>{}}={}){this.meta=meta;this.seed=seed;this.time=0;this.result=null;this.previous=neutral();this.random=random(seed);this.game=meta.create({random:this.random,seed,sound,finish:r=>{if(this.result)return;if(!r||!Number.isFinite(r.score))throw new Error('Invalid result: '+meta.id);this.result={score:Math.round(r.score*100)/100,outcome:['clear','fail','record'].includes(r.outcome)?r.outcome:'record',message:String(r.message||'경기 종료'),time:this.time};}});if(!this.game?.update||!this.game?.draw||!this.game?.hud)throw new Error('Incomplete game: '+meta.id);}
 step(dt,raw=neutral()){if(this.result)return;const prev=this.previous,p={...neutral().pointer,...raw.pointer};const input={...neutral(),...raw,x:clamp(Number(raw.x)||0,-1,1),y:clamp(Number(raw.y)||0,-1,1),pointer:p};for(const key of ['a','b']){input[key]=!!input[key];input[key+'p']=!!raw[key+'p']||(input[key]&&!prev[key]);input[key+'r']=!!raw[key+'r']||(!input[key]&&!!prev[key]);}p.pressed=!!raw.pointer?.pressed||(!!p.down&&!prev.pointer.down);p.released=!!raw.pointer?.released||(!p.down&&!!prev.pointer.down);this.previous={x:input.x,y:input.y,a:input.a,b:input.b,pointer:{...p}};const step=clamp(Number(dt)||0,0,1/30);this.time+=step;this.game.update(step,input);}
 hud(){const h=this.game.hud()||{};return{score:Number.isFinite(h.score)?h.score:0,label:String(h.label||'도전'),value:String(h.value??''),hint:String(h.hint||this.meta.controls),progress:Number.isFinite(h.progress)?clamp(h.progress,0,1):null};}
}
export const medalFor=(game,score)=>score>=game.medal?.[2]?'gold':score>=game.medal?.[1]?'silver':score>=game.medal?.[0]?'bronze':null;
export class AudioBus{
 constructor(){this.muted=false;this.context=null;this.last=0;}
 start(){if(this.muted)return;try{this.context??=new(window.AudioContext||window.webkitAudioContext)();this.context.resume();}catch{}}
 play(kind){if(this.muted||!this.context||this.context.state!=='running')return;const t=this.context.currentTime;if(t-this.last<.035)return;this.last=t;const o=this.context.createOscillator(),g=this.context.createGain();o.type=kind==='bad'?'triangle':'sine';o.frequency.setValueAtTime({tap:420,good:720,bad:150,win:900}[kind]||420,t);o.frequency.exponentialRampToValueAtTime(kind==='bad'?70:kind==='win'?1350:540,t+.11);g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.connect(g).connect(this.context.destination);o.start(t);o.stop(t+.18);}
}
