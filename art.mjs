import {MAP} from './map.mjs';

const T=globalThis.THREE;
T.ColorManagement.legacyMode=false;
const palette={1:0xf2f3f3,5:0xd7c59a,11:0x80bbdb,21:0xc4281c,23:0x0d69ac,24:0xf5cd30,26:0x1b2a35,27:0x6d6e6c,28:0x287f47,29:0xa1c48c,37:0x4b974b,38:0xa05f35,39:0xc1cade,45:0xb4d2e4,102:0x6e99ca,105:0xe29b40,106:0xda8541,107:0x008f9c,119:0xa4bd47,135:0x74869d,141:0x27462d,149:0x414f5c,151:0x789082,153:0x957977,192:0x694028,194:0xa3a2a5,196:0x8e8e8e,199:0x635f62,208:0xe5e4df,217:0x7c5c46,226:0xfdea8d,1002:0xcacbd1,1013:0x04afec,1019:0,1027:0x9ff3e9};
const box=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(.5,14,9),ring=new T.TorusGeometry(1,.065,8,34),cylinder=new T.CylinderGeometry(.5,.5,1,14),shard=new T.DodecahedronGeometry(1);
const cylX=cylinder.clone();cylX.rotateZ(-Math.PI/2);
const wedge=new T.BufferGeometry();
const w=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5],[-.5,.5,.5],[.5,.5,.5]];
wedge.setAttribute('position',new T.Float32BufferAttribute([0,2,1,0,3,2,3,5,2,3,4,5,0,1,5,0,5,4,0,4,3,1,2,5].flatMap(i=>w[i]),3));wedge.computeVertexNormals();
const shapes={box,ball:sphere,cylinder:cylX,wedge};
const paint=(color,roughness=.77)=>new T.MeshStandardMaterial({color,roughness});
const basic=(color,opacity=1)=>new T.MeshBasicMaterial({color,opacity,transparent:opacity<1,depthWrite:opacity===1});
const tint={teal:paint(0x2ce2d1),dark:paint(0x173353),white:paint(0xffefb0),face:paint(0xffcd60),black:paint(0x172336),steel:paint(0x82b5d5),orange:paint(0xff664a),boot:paint(0x32465c),lens:paint(0x5dffff,.18)};
const mesh=(parent,geo,mat,x,y,z,sx,sy,sz)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;};
const cube=(p,m,x,y,z,a,b,c)=>mesh(p,box,m,x,y,z,a,b,c);
const group=(parent,x=0,y=0,z=0)=>{const node=new T.Group();node.position.set(x,y,z);parent.add(node);return node;};

function pilot(parent,enemy=false){
  const root=group(parent),body=group(root),main=enemy?tint.orange:tint.teal;
  cube(body,tint.dark,0,2.14,0,2,1.59,1.12);
  cube(body,main,0,2.24,.112,1.86,1.36,1.1);
  cube(body,tint.dark,0,1.71,.69,1.86,.19,.095);
  for(const x of [-.54,.54]){
    cube(body,tint.white,x,2.53,.68,.16,.61,.08);
    cube(body,tint.steel,x,2.37,-.67,.29,1.11,.54);
  }
  cube(body,tint.dark,0,2.23,-.73,.77,1.02,.45);
  cube(body,main,0,2.37,-.99,.57,.58,.19);
  cube(body,tint.white,0,2.23,.715,.36,.27,.09);
  const head=group(body,0,3.15,.07);
  mesh(head,cylinder,tint.face,0,.028,0,1.28,1.07,1.14);
  mesh(head,sphere,main,0,.53,-.023,1.52,.82,1.38);
  cube(head,tint.dark,0,.49,.276,1.43,.16,.84);
  cube(head,tint.dark,0,.212,.49,1.29,.39,.27);
  cube(head,tint.lens,0,.216,.634,1.13,.26,.07);
  for(const x of [-.29,.29])cube(head,tint.black,x,.207,.681,.092,.136,.025);
  cube(head,tint.black,0,-.167,.561,.25,.061,.025);
  for(const x of [-.71,.71])mesh(head,cylinder,tint.dark,x,.214,0,.28,.25,.5).rotation.z=Math.PI/2;
  const legs=[],arms=[];
  for(const side of [-1,1]){
    const leg=group(body,side*.48,1.46,.03);
    cube(leg,tint.boot,0,-.58,0,.81,1.17,.81);
    cube(leg,tint.dark,0,-1.29,.16,.87,.32,1.05);
    cube(leg,main,0,-.41,.436,.45,.34,.15);
    legs.push(leg);
    const arm=group(body,side*1.13,2.74,0);
    cube(arm,main,0,-.44,0,.61,.87,.72);
    cube(arm,tint.dark,0,-.77,0,.63,.19,.75);
    cube(arm,tint.face,0,-.96,.06,.56,.31,.59);
    arms.push(arm);
  }
  if(!enemy){
    const tool=group(arms[1],.17,-.8,.4);tool.rotation.x=Math.PI/2;
    mesh(tool,cylinder,tint.dark,0,.25,0,.47,1.53,.47);
    mesh(tool,cylinder,tint.white,0,.66,0,.54,.33,.54);
    mesh(tool,cylinder,tint.orange,0,.9,0,.62,.26,.62);
  }
  return {root,body,head,legs,arms,last:null};
}

export class ArenaView {
  constructor(canvas){
    this.renderer=new T.WebGLRenderer({canvas,antialias:true});
    this.renderer.outputEncoding=T.sRGBEncoding;
    this.scene=new T.Scene();this.scene.background=new T.Color(0x93d9ff);this.scene.fog=new T.Fog(0xa2dfff,172,390);
    this.camera=new T.PerspectiveCamera(45,1,.5,620);
    this.focus=new T.Vector3();this.ray=new T.Raycaster();this.floor=new T.Plane(new T.Vector3(0,1,0),-.8);
    this.scene.add(new T.HemisphereLight(0xfff9de,0x7995d9,1.36));
    const sun=new T.DirectionalLight(0xffeed4,1.65);sun.position.set(-85,132,63);this.scene.add(sun);
    const rim=new T.DirectionalLight(0xa2e9ff,.48);rim.position.set(39,36,-70);this.scene.add(rim);
    cube(this.scene,paint(0x66c3cc),0,-2.8,0,1700,2,1700);
    this.instances=new Map();this.hidden=new Set();
    this.buildMap();
    this.hero=pilot(this.scene);this.bots=new Map();
    this.clock=0;this.fxIndex=0;
    this.effects=Array.from({length:78},(_,i)=>{
      const node=mesh(this.scene,i%4===0?ring:shard,basic(0xffcf48,.9),0,-10,0,1,1,1);node.visible=false;
      return {node,born:-9};
    });
    this.tracers=Array.from({length:6},()=>{
      const n=mesh(this.scene,cylinder,basic(0xfff179,.82),0,-10,0,1,1,1);n.visible=false;return {node:n,born:-9};
    });
    this.aim=mesh(this.scene,ring,basic(0x82fcf2,.82),0,-10,0,2.2,2.2,1);this.aim.rotation.x=-Math.PI/2;
    for(let i=0;i<24;i++){
      const g=group(this.scene,Math.sin(i*2.41)*(195+i*6),20+(i%5)*12,Math.cos(i*2.41)*(195+i*6));
      for(let j=0;j<4;j++)mesh(g,sphere,basic(0xe1f7ff),j*7,Math.sin(j*2)*3,0,20+(j%2)*8,9+j*1.8,13);
    }
  }

  buildMap(){
    const sets=new Map();
    for(const [id,part] of MAP.parts.entries()){
      const [section,,shape,[x,y,z],[sx,sy,sz],r,color,opacity]=part;
      if(opacity<=0)continue;
      const category=`${shape}/${opacity}`;
      if(!sets.has(category))sets.set(category,{shape,opacity,parts:[]});
      const matrix=new T.Matrix4().set(r[0]*sx,r[1]*sy,r[2]*sz,x,r[3]*sx,r[4]*sy,r[5]*sz,y,r[6]*sx,r[7]*sy,r[8]*sz,z,0,0,0,1);
      const shade=new T.Color(palette[color]??0x9ab0bd);
      if(section==='Room'&&part[1]==='Floor')shade.set(0x748d75);
      if(section==='Room'&&part[1].toLowerCase().includes('path'))shade.set(0xb6b4ab);
      sets.get(category).parts.push({id,matrix,shade});
    }
    for(const {shape,opacity,parts} of sets.values()){
      const batch=new T.InstancedMesh(shapes[shape],new T.MeshStandardMaterial({roughness:.82,transparent:opacity<1,opacity,depthWrite:opacity===1}),parts.length);
      batch.frustumCulled=false;this.scene.add(batch);
      parts.forEach(({id,matrix,shade},index)=>{
        batch.setMatrixAt(index,matrix);batch.setColorAt(index,shade);
        this.instances.set(id,{batch,index,matrix,shade});
      });
    }
  }

  applyBroken(ids){
    const broken=new Set(ids),invisible=new T.Matrix4().makeScale(0,0,0);
    for(const id of new Set([...this.hidden,...broken])){
      if(this.hidden.has(id)===broken.has(id))continue;
      const item=this.instances.get(id);if(!item)continue;
      item.batch.setMatrixAt(item.index,broken.has(id)?invisible:item.matrix);item.batch.instanceMatrix.needsUpdate=true;
    }
    this.hidden=broken;
  }

  size(width,height){
    this.width=width;this.height=height;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6,Math.sqrt(1150000/(width*height))));
    this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
  }

  point(x,y){
    this.ray.setFromCamera(new T.Vector2(x/this.width*2-1,1-y/this.height*2),this.camera);
    const p=this.ray.ray.intersectPlane(this.floor,new T.Vector3());return p?{x:p.x,z:p.z}:null;
  }

  burst(x,z,count,color){
    for(let i=0;i<count;i++){
      const f=this.effects[this.fxIndex++%this.effects.length],a=i*2.4;
      f.node.position.set(x,i%4===0?.84:2,z);f.node.material.color.set(color);f.node.visible=true;
      f.born=this.clock;f.size=i%4===0?1.3:.3+(i%7)*.09;
      f.node.scale.setScalar(f.size);f.node.rotation.set(i%4===0?-Math.PI/2:i,0,a);
      f.vx=Math.cos(a)*(4+i%7);f.vz=Math.sin(a)*(4+i%8);f.vy=4+i%6;
    }
  }

  event(event,rewards){
    if(event.type==='blast'){
      const f=this.tracers.reduce((a,b)=>a.born<b.born?a:b);
      const from=new T.Vector3(event.fromX,2.6,event.fromZ),to=new T.Vector3(event.x,2,event.z),diff=to.clone().sub(from);
      f.born=this.clock;f.node.position.copy(from.addScaledVector(diff,.5));f.node.scale.set(.21,Math.max(.05,diff.length()),.21);
      f.node.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),diff.normalize());f.node.visible=true;
      f.node.material.color.set(rewards.like?0xff80ee:0xffdf53);
      this.burst(event.x,event.z,9,0xffbb4d);
      for(const id of event.bricks){const o=this.instances.get(id);if(o){const p=new T.Vector3().setFromMatrixPosition(o.matrix);this.burst(p.x,p.z,5,o.shade);}}
    }
    if(event.type==='tag')this.burst(event.x,event.z,15,rewards.comment?0xa968ff:0x60f9de);
    if(event.type==='hit')this.burst(event.x,event.z,10,0xff634e);
  }

  pose(actor,state,dt){
    const speed=actor.last?Math.hypot(state.x-actor.last[0],state.z-actor.last[1])/Math.max(dt,.005):0;
    if(actor.last&&speed>1)actor.root.rotation.y=Math.atan2(state.x-actor.last[0],state.z-actor.last[1]);
    const swing=Math.sin(this.clock*14)*Math.min(.61,speed*.032);
    actor.legs.forEach((leg,i)=>leg.rotation.x=swing*(i?-1:1));
    actor.arms.forEach((arm,i)=>arm.rotation.x=(i===1?-.24:0)-swing*(i?-1:1));
    actor.body.position.y=Math.abs(swing)*.3;actor.root.position.set(state.x,.81,state.z);actor.last=[state.x,state.z];
  }

  draw(run,dt,mode,elapsed,target){
    this.clock+=dt;
    this.pose(this.hero,run,dt);
    const current=new Set(run.bots.map(bot=>bot.id));
    for(const [id,actor] of this.bots)if(!current.has(id)){actor.root.removeFromParent();this.bots.delete(id);}
    for(const bot of run.bots){
      let actor=this.bots.get(bot.id);
      if(!actor){actor=pilot(this.scene,true);this.bots.set(bot.id,actor);}
      this.pose(actor,bot,dt);
    }
    this.aim.visible=Boolean(target)&&mode==='play';
    if(target)this.aim.position.set(target.x,.98,target.z);
    for(const f of this.tracers)f.node.visible=this.clock-f.born<.14;
    for(const f of this.effects){
      const age=this.clock-f.born;f.node.visible=age<.57;
      if(!f.node.visible)continue;
      if(f.node.geometry===ring){f.node.scale.setScalar(f.size+age*9);}
      else{
        f.node.position.x+=f.vx*dt;f.node.position.z+=f.vz*dt;f.node.position.y=Math.max(.85,f.node.position.y+f.vy*dt);f.vy-=26*dt;
        f.node.rotation.z+=dt*8;f.node.rotation.x+=dt*4;f.node.scale.setScalar(f.size*(1-age));
      }
      f.node.material.opacity=(1-age/.57)*.87;
    }
    const portrait=this.height>this.width;
    const cx=run.x,cz=run.z;
    if(mode==='play'){
      this.focus.lerp(new T.Vector3(cx,1,cz-3),Math.min(1,dt*10+.025));
      this.camera.position.set(this.focus.x+(portrait?13:19),portrait?54:46,this.focus.z+(portrait?40:38));
      this.camera.lookAt(this.focus);
    }else if(mode==='intro'){
      const k=Math.min(1,elapsed/4.1),a=(1-k)*1.3+.29;
      const d=31+(1-k)*102;
      this.camera.position.set(cx+Math.sin(a)*d,22+(1-k)*77,cz+Math.cos(a)*d);
      this.camera.lookAt(cx,1,cz);this.focus.set(cx,1,cz);
    }else{
      const a=mode==='outro'?.51+Math.min(1,elapsed/3)*.94:.51+Math.sin(this.clock*.36)*.14;
      const d=mode==='outro'?15:21;
      this.hero.root.rotation.y=a;
      if(mode==='outro'&&run.phase==='won')this.hero.arms.forEach((arm,i)=>arm.rotation.x=-1.7+Math.sin(this.clock*13+i)*.28);
      this.camera.position.set(cx+Math.sin(a)*d,10,cz+Math.cos(a)*d);
      this.camera.lookAt(cx,3.5,cz);
      this.focus.set(cx,1,cz);
    }
    this.renderer.render(this.scene,this.camera);
  }
}
