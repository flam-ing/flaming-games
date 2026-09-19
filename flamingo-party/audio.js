// Small original synthesized cues; no recordings or external sound assets.
export class PartyAudio {
 constructor(){this.context=null;this.muted=false;this.lastScore=-1;}
 async start(){try{if(!this.context)this.context=new(window.AudioContext||window.webkitAudioContext)();if(this.context.state==='suspended')await this.context.resume();}catch{this.muted=true;}}
 tone(frequency=660,duration=.1,type='sine',delay=0){if(this.muted||!this.context||this.context.state!=='running')return;const t=this.context.currentTime+delay,osc=this.context.createOscillator(),gain=this.context.createGain();osc.type=['sine','triangle','square','sawtooth'].includes(type)?type:'sine';osc.frequency.value=Math.max(60,Math.min(2400,frequency));gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.065,t+.007);gain.gain.exponentialRampToValueAtTime(.0001,t+Math.max(.03,duration));osc.connect(gain);gain.connect(this.context.destination);osc.start(t);osc.stop(t+duration+.03);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
 consume(events){for(const e of events){if(e.type==='tone')this.tone(e.frequency,e.duration,e.wave);else if(e.type==='out')this.tone(160,.22,'triangle');else if(e.type==='score'&&e.time-this.lastScore>.12){this.lastScore=e.time;this.tone(680+(e.player||0)*90,.06);}}events.length=0;}
 finish(won=true){(won?[523,659,784,1047]:[392,330,262]).forEach((n,i)=>this.tone(n,.16,'triangle',i*.12));}
}
