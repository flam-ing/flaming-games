import * as THREE from '../flamingo-stadium/common/vendor/three.module.min.js';
import { makeFlamingo,animateBird } from './bird.js';
import { COLORS } from './core.js';
export class View {
  constructor(canvas){
    this.canvas=canvas;this.objects=new Map();this.frame=0;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.22;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#cbe9e2');this.scene.fog=new THREE.Fog('#cbe9e2',50,110);
    this.scene.add(new THREE.HemisphereLight('#fffaf0','#6a938d',2.5));
    const sun=new THREE.DirectionalLight('#fff3d8',3);sun.position.set(-12,24,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:1,far:70});sun.shadow.normalBias=.05;this.scene.add(sun);
    this.camera=new THREE.OrthographicCamera(-16,16,10,-10,.1,200);this.camera.position.set(0,18,18);this.camera.lookAt(0,0,0);
    const sea=new THREE.Mesh(new THREE.PlaneGeometry(250,250),new THREE.MeshStandardMaterial({color:'#94ccc6',roughness:.65}));sea.rotation.x=-Math.PI/2;sea.position.y=-2;sea.receiveShadow=true;this.scene.add(sea);this.sea=sea;
    this.birds=COLORS.map(color=>{const bird=makeFlamingo(color);this.scene.add(bird.root);return bird;});
    this.geometry={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(.5,16,10),cylinder:new THREE.CylinderGeometry(.5,.5,1,32),cone:new THREE.ConeGeometry(.5,1,12),ring:new THREE.TorusGeometry(.5,.05,8,48),plane:new THREE.PlaneGeometry(1,1)};
    this.resize();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
  }
  resize(){const w=this.canvas.clientWidth||960,h=this.canvas.clientHeight||600;this.renderer.setSize(w,h,false);this.aspect=w/h;}
  pointer(clientX,clientY,height=0){
    const rect=this.canvas.getBoundingClientRect(),x=Math.max(0,Math.min(1,(clientX-rect.left)/rect.width)),y=Math.max(0,Math.min(1,(clientY-rect.top)/rect.height));
    this.camera.updateMatrixWorld();const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(x*2-1,1-y*2),this.camera);const point=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-height),new THREE.Vector3());
    const front=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),0),new THREE.Vector3());
    return {x,y,worldX:point?.x||0,worldZ:point?.z||0,worldValid:!!point,frontX:front?.x||0,frontY:front?.y||0,frontValid:!!front,valid:true};
  }
  begin(){this.frame++;}
  draw=(id,type,p={})=>{
    let entry=this.objects.get(id);if(entry&&entry.type!==type){this.scene.remove(entry.object);entry.object.material?.map?.dispose();entry.object.material?.dispose();this.objects.delete(id);entry=null;}
    if(!entry){let geometry=this.geometry[type]||this.geometry.box,material;
      if(type==='text'){const can=document.createElement('canvas');can.width=512;can.height=128;const tex=new THREE.CanvasTexture(can);tex.colorSpace=THREE.SRGBColorSpace;material=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide});geometry=this.geometry.plane;entry={canvas:can,texture:tex,text:null};}
      else material=new THREE.MeshStandardMaterial({color:p.color||'#efbe5b',roughness:.72,metalness:p.metalness||0,side:THREE.DoubleSide});
      const object=new THREE.Mesh(geometry,material);object.castShadow=type!=='text';object.receiveShadow=true;this.scene.add(object);entry={...entry,type,object};this.objects.set(id,entry);
    }
    const o=entry.object;entry.frame=this.frame;o.visible=true;o.position.set(p.x||0,p.y||0,p.z||0);o.scale.set(p.sx??1,p.sy??1,p.sz??1);o.rotation.set(p.rx||0,p.ry||0,p.rz||0);
    if(type==='text'){const label=String(p.text??''),width=Math.max(64,Math.min(2048,Math.round(128*Math.abs(p.sx??1)/Math.max(.01,Math.abs(p.sy??1)))));if(entry.canvas.width!==width){entry.canvas.width=width;entry.text=null;}if(entry.text!==label||entry.color!==p.color){const c=entry.canvas.getContext('2d');c.clearRect(0,0,width,128);c.fillStyle=p.color||'#213d47';c.font='800 70px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(label,width/2,68,width-12);entry.texture.needsUpdate=true;entry.text=label;entry.color=p.color;}if(p.billboard!==false)o.quaternion.copy(this.camera.quaternion);}
    else {o.material.color.set(p.color||'#efbe5b');o.material.opacity=p.opacity??1;o.material.transparent=(p.opacity??1)<1;o.material.emissive.set(p.glow?p.color||'#fff6c0':'#000000');o.material.emissiveIntensity=p.glow?.35:0;}
    return o;
  }
  render(session){
    const v=session.view;this.sea.visible=!v.noSea;const baseSize=v.size||20,size=Math.max(baseSize,baseSize/this.aspect);this.camera.left=-size*this.aspect/2;this.camera.right=size*this.aspect/2;this.camera.top=size/2;this.camera.bottom=-size/2;this.camera.position.set(...v.eye);this.camera.lookAt(...v.target);this.camera.updateProjectionMatrix();
    for(const entry of this.objects.values())if(entry.frame!==this.frame)entry.object.visible=false;
    session.players.forEach((p,i)=>{const bird=this.birds[i];animateBird(bird,{...p,active:p.visible!==false,alpha:p.alive?1:.2,pose:p.alive?p.pose:'sleep',scale:p.scale??.8},session.time);if(p.normal)bird.root.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...p.normal).normalize());else bird.root.quaternion.identity();});
    this.renderer.render(this.scene,this.camera);
  }
  clear(){for(const entry of this.objects.values()){this.scene.remove(entry.object);entry.texture?.dispose();entry.object.material.dispose();}this.objects.clear();}
  dispose(){this.clear();this.resizeObserver.disconnect();this.renderer.dispose();}
}
