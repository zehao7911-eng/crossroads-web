import * as C from './core.mjs';

export const tools=[
  {name:'Sword',type:'sword',range:8,wait:.48,damage:2,color:0xd9ebff,icon:'M5 20 18 7M13 7l6-2-2 6M4 15l5 5'},
  {name:'Slingshot',type:'pellet',range:63,wait:.27,damage:1,speed:116,color:0xffd33e,icon:'M5 4l4 7h6l4-7M9 11v4l3 6 3-6v-4M5 4h14'},
  {name:'Rocket',type:'rocket',range:93,wait:1.35,damage:3,speed:65,radius:7,color:0xff754b,icon:'M7 15c2-7 7-11 13-11 0 6-4 11-11 13l-2-2ZM7 15l-3 3v3h3l3-3M15 9h.01'},
  {name:'Trowel',type:'wall',range:12,wait:1.9,damage:0,color:0xf1b96c,icon:'m4 18 7-7m-2-2 10-5-5 10-5-5Zm-5 9 2 2'},
  {name:'Time Bomb',type:'bomb',range:12,wait:2.9,damage:3,radius:10,color:0x454756,icon:'M16 8a6 6 0 1 1-8 1c2-2 5-2 8-1Zm0 0 2-3h3M20 2v2'},
  {name:'Superball',type:'ball',range:130,wait:2,damage:2,speed:106,color:0xf4425c,icon:'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-4 8c0-2 2-4 4-4'}
];
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const sides=[-1,0,1];
const maxWalls=9;
export const heights={floor:.8,eye:2.6};

function groundField(parts){
  const bins=new Map();
  const loose=[];
  const key=(x,z)=>Math.floor(x/12)+','+Math.floor(z/12);
  for(const [id,p] of parts.entries()){
    const [group,name,shape,[x,y,z],size,rot,,alpha,solid,anchored]=p;
    if(!solid||alpha<.4||group.startsWith('Team'))continue;
    const aabb=[0,1,2].map(i=>size.reduce((sum,s,j)=>sum+Math.abs(rot[i*3+j])*s/2,0));
    const [hx,hy,hz]=aabb;
    const body={id,group,name,shape,x,y,z,size,rot,left:x-hx,right:x+hx,bottom:y-hy,top:y+hy,near:z-hz,far:z+hz,
      loose:!anchored&&group!=='Room'&&group!=='Teleporter'&&group!=='BattleArmorStand'&&Math.max(...size)<28&&shape==='box'};
    if(body.loose)loose.push(body);
    for(let bx=Math.floor(body.left/12);bx<=Math.floor(body.right/12);bx++)for(let bz=Math.floor(body.near/12);bz<=Math.floor(body.far/12);bz++){
      const cell=bx+','+bz;
      if(!bins.has(cell))bins.set(cell,[]);
      bins.get(cell).push(body);
    }
  }
  const near=(x,z)=>bins.get(key(x,z))||[];
  function span(body,x,z){
    if(x<body.left||x>body.right||z<body.near||z>body.far)return null;
    const d=[x-body.x,z-body.z],r=body.rot;
    let lower=-Infinity,upper=Infinity;
    for(let j=0;j<3;j++){
      const offset=r[j]*d[0]+r[6+j]*d[1];
      const slope=r[3+j],half=body.size[j]/2;
      if(Math.abs(slope)<1e-6){if(Math.abs(offset)>half+.001)return null;continue;}
      const a=(-half-offset)/slope,b=(half-offset)/slope;
      lower=Math.max(lower,Math.min(a,b));upper=Math.min(upper,Math.max(a,b));
      if(lower>upper)return null;
    }
    if(body.shape==='wedge'){
      const offset=(r[1]*d[0]+r[7]*d[1])/body.size[1]-(r[2]*d[0]+r[8]*d[1])/body.size[2];
      const slope=r[4]/body.size[1]-r[5]/body.size[2];
      if(Math.abs(slope)<1e-6){if(offset>0)return null;}
      else if(slope>0)upper=Math.min(upper,-offset/slope);
      else lower=Math.max(lower,-offset/slope);
      if(lower>upper)return null;
    }
    return [body.y+lower,body.y+upper];
  }
  function obstacles(x,z,broken,walls){
    return [...near(x,z).filter(o=>!broken.has(o.id)),...walls.filter(o=>Math.abs(o.x-x)<8&&Math.abs(o.z-z)<8)];
  }
  return {
    support(x,z,ceiling,broken,walls){
      let y=heights.floor;
      for(const o of obstacles(x,z,broken,walls)){
        const height=span(o,x,z)?.[1];
        if(height!==undefined&&height<=ceiling&&height>y)y=height;
      }
      return y;
    },
    blocked(x,y,z,broken,walls,padding=1.04,head=3.4){
      for(const dx of sides)for(const dz of sides){
        const px=x+dx*padding,pz=z+dz*padding;
        for(const o of obstacles(px,pz,broken,walls)){
          const limits=span(o,px,pz);
          if(limits&&limits[0]<y+head&&limits[1]>y+.57)return true;
        }
      }
      return false;
    },
    trace(a,b,broken,walls){
      const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.69);
      for(let i=1;i<=steps;i++){
        const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t;
        for(const o of obstacles(x,z,broken,walls)){
          const limits=span(o,x,z);
          if(limits&&limits[0]<y&&limits[1]>y)return {x,y,z,body:o};
        }
      }
      return null;
    },
    blast(point,range,broken){
      return loose.filter(o=>!broken.has(o.id)&&Math.hypot(o.x-point.x,o.y-point.y,o.z-point.z)<range).slice(0,15);
    }
  };
}

export function makeClassicField(parts){
  const field=groundField(parts);
  const armor=parts.find(p=>p[0]==='BattleArmorStand'&&p[1]==='BattleArmor')?.[3];
  return {...field,armor};
}

export function makeRun(zone=0){
  const base=C.makeRun(zone);
  if(zone===0){base.x=-60;base.z=-35;}
  return {...base,y:heights.floor,vy:0,grounded:true,weapon:2,cooldowns:tools.map(()=>0),
    shots:[],walls:[],armor:false,shotId:0,aimX:0,aimZ:1};
}

export function restore(raw,progress){
  const base=C.restore(raw,progress);
  if(!raw||!Array.isArray(raw.cooldowns)||raw.cooldowns.length!==tools.length||base.phase==='ready')return makeRun(base.zone);
  const finite=(v,min,max,fallback)=>Number.isFinite(v)?clamp(v,min,max):fallback;
  return {...base,bots:base.bots.map(bot=>({...bot,y:finite(bot.y,.8,125,.8),grounded:true})),
    y:finite(raw.y,.8,125,.8),vy:finite(raw.vy,-65,28,0),grounded:raw.grounded===true,
    weapon:Math.floor(finite(raw.weapon,0,tools.length-1,2)),
    cooldowns:raw.cooldowns.map(n=>finite(n,0,3,0)),shots:[],walls:[],
    armor:raw.armor===true,shotId:0,aimX:finite(raw.aimX,-1,1,0),aimZ:finite(raw.aimZ,-1,1,1)};
}

function emitBlast(run,point,weapon,field,events){
  const {radius=1.65,damage,color}=weapon;
  const broken=new Set(run.broken);
  const bricks=weapon.radius?field.blast(point,radius,broken).slice(0,300-run.broken.length):[];
  run.broken.push(...bricks.map(o=>o.id));
  run.walls=run.walls.filter(w=>!weapon.radius||gap(w,point)>radius);
  for(const bot of run.bots){
    if(gap(bot,point)>radius+1.05||Math.abs(bot.y+1.7-point.y)>radius+1)continue;
    if(field.trace({x:point.x,y:point.y+.07,z:point.z},{x:bot.x,y:bot.y+1.7,z:bot.z},new Set(run.broken),run.walls)&&!weapon.radius)continue;
    bot.hp-=damage;
  }
  events.push({type:'impact',...point,color,bricks:bricks.map(o=>o.id),heavy:!!weapon.radius});
}

function useTool(run,point,field,events){
  const weapon=tools[run.weapon];
  if(run.cooldowns[run.weapon]>0)return;
  const dx=point.x-run.x,dz=point.z-run.z,length=Math.hypot(dx,dz);
  const x=length>.01?dx/length:run.aimX,z=length>.01?dz/length:run.aimZ;
  const start={x:run.x,y:run.y+1.72,z:run.z};
  run.aimX=x;run.aimZ=z;
  if(weapon.type==='wall'||weapon.type==='bomb'){
    const shift=clamp(length,4,weapon.range);
    const p={x:clamp(start.x+x*shift,-191,191),z:clamp(start.z+z*shift,-191,191)};
    const broken=new Set(run.broken);
    const floor=field.support(p.x,p.z,run.y+1.25,broken,run.walls);
    if(Math.abs(floor-run.y)>3||field.blocked(p.x,floor,p.z,broken,run.walls,.8,2.8)){
      events.push({type:'invalid'});
      return;
    }
    if(weapon.type==='wall'){
      const size=Math.abs(x)>Math.abs(z)?[1.2,4.8,6.0]:[6.0,4.8,1.2];
      run.walls.push({...p,y:floor+2.4,size,rot:[1,0,0,0,1,0,0,0,1],
        left:p.x-size[0]/2,right:p.x+size[0]/2,near:p.z-size[2]/2,far:p.z+size[2]/2,
        ttl:18,id:run.shotId++});
      if(run.walls.length>maxWalls)run.walls.shift();
      events.push({type:'build',...p,y:floor});
    }else run.shots.push({...p,y:floor+1,kind:run.weapon,ttl:2.7,id:run.shotId++});
  }else if(weapon.type==='sword'){
    const broken=new Set(run.broken);
    for(const bot of run.bots){
      const reach=gap(start,bot);
      if(reach>weapon.range||Math.abs(run.y-bot.y)>3.2)continue;
      const dot=(bot.x-run.x)*x+(bot.z-run.z)*z;
      if(dot<reach*.28||field.trace(start,{x:bot.x,y:bot.y+1.7,z:bot.z},broken,run.walls))continue;
      bot.hp-=weapon.damage;
    }
    events.push({type:'swing',x:start.x+x*3,y:start.y,z:start.z+z*3,color:weapon.color});
  }else{
    const dy=clamp(((point.y??start.y)-start.y)/Math.max(5,length),-.5,.65);
    run.shots.push({...start,kind:run.weapon,vx:x*weapon.speed,vy:dy*weapon.speed+(weapon.type==='ball'?6:0),
      vz:z*weapon.speed,ttl:weapon.range/weapon.speed,id:run.shotId++,bounces:0});
  }
  run.cooldowns[run.weapon]=weapon.wait;
  events.push({type:'fire',tool:weapon.type});
}

function moveActor(actor,dx,dz,field,broken,walls){
  for(const [axis,delta] of [['x',dx],['z',dz]]){
    const x=axis==='x'?clamp(actor.x+delta,-193,193):actor.x;
    const z=axis==='z'?clamp(actor.z+delta,-193,193):actor.z;
    const support=field.support(x,z,actor.y+1.14,broken,walls);
    const testY=Math.max(actor.y,support);
    if(!field.blocked(x,testY,z,broken,walls)){
      actor.x=x;actor.z=z;
      if(actor.grounded&&support>=actor.y)actor.y=support;
    }
  }
}

function projectiles(run,dt,field,events){
  const broken=new Set(run.broken);
  run.shots=run.shots.filter(shot=>{
    const weapon=tools[shot.kind];
    shot.ttl-=dt;
    if(weapon.type==='bomb'){
      if(shot.ttl>0)return true;
      emitBlast(run,shot,weapon,field,events);
      return false;
    }
    if(shot.ttl<=0)return false;
    if(weapon.type==='ball')shot.vy-=31*dt;
    const next={x:shot.x+shot.vx*dt,y:shot.y+shot.vy*dt,z:shot.z+shot.vz*dt};
    const impact=field.trace(shot,next,broken,run.walls);
    const target=run.bots.find(b=>gap(b,next)<2.05&&Math.abs(b.y+1.7-next.y)<2.1);
    if(target&&!impact){
      emitBlast(run,{...next,x:target.x,z:target.z},weapon,field,events);
      return false;
    }
    if(impact&&weapon.type==='ball'&&shot.bounces<3){
      const floor=field.support(shot.x,shot.z,shot.y+.45,broken,run.walls);
      if(next.y<=floor+.26)shot.vy=Math.max(8,-shot.vy*.82);
      else if(Math.abs(shot.vx)>Math.abs(shot.vz))shot.vx*=-.83;
      else shot.vz*=-.83;
      shot.bounces++;
      events.push({type:'swing',...impact,color:weapon.color});
      return true;
    }
    if(impact){
      emitBlast(run,{x:impact.x-shot.vx*.002,y:impact.y-shot.vy*.002,z:impact.z-shot.vz*.002},weapon,field,events);
      return false;
    }
    Object.assign(shot,next);
    return Math.abs(shot.x)<200&&Math.abs(shot.z)<200&&shot.y<150&&shot.y>0;
  });
}

export function step(run,input,dt,field){
  if(run.phase!=='live'||dt<=0||dt>.051)return [];
  const events=[],zone=C.ZONES[run.zone],broken=new Set(run.broken);
  run.time=Math.min(zone.limit,run.time+dt);
  run.shield=Math.max(0,run.shield-dt);
  run.cooldowns=run.cooldowns.map(value=>Math.max(0,value-dt));
  run.walls=run.walls.filter(w=>(w.ttl-=dt)>0);
  if(input.jump&&run.grounded){run.vy=22;run.grounded=false;}
  if(input.move){
    const dx=input.move.x-run.x,dz=input.move.z-run.z,length=Math.hypot(dx,dz);
    if(length>.16){
      const speed=Math.min(length,25*dt)/length;
      moveActor(run,dx*speed,dz*speed,field,broken,run.walls);
    }
  }
  const floor=field.support(run.x,run.z,run.y+.32,broken,run.walls);
  if(run.y>floor+.03||run.vy>0){
    run.vy-=58*dt;
    const y=run.y+run.vy*dt;
    if(run.vy>0&&field.blocked(run.x,y,run.z,broken,run.walls,.7)){run.vy=0;}
    else run.y=Math.max(floor,y);
    run.grounded=run.y<=floor+.03;
  }else {run.y=floor;run.vy=0;run.grounded=true;}
  if(run.grounded&&run.vy<0)run.vy=0;
  if(!run.armor&&field.armor&&gap(run,{x:field.armor[0],z:field.armor[2]})<3&&Math.abs(run.y+2-field.armor[1])<4){
    run.armor=true;run.hp=5;run.shield=3;events.push({type:'armor',x:run.x,z:run.z});
  }
  if(run.time>=run.next&&run.bots.length<3&&run.score+run.bots.length<zone.goal){
    for(let i=0;i<18;i++){
      const a=run.serial*2.399+i*.58,r=21+i%4*4;
      const x=clamp(run.x+Math.cos(a)*r,-187,187),z=clamp(run.z+Math.sin(a)*r,-187,187);
      const y=field.support(x,z,run.y+3,broken,run.walls);
      if(Math.abs(y-run.y)>3||field.blocked(x,y,z,broken,run.walls,1.5)||run.bots.some(b=>gap(b,{x,z})<6))continue;
      run.bots.push({id:run.serial++,x,y,z,hp:2,cool:2.3,grounded:true});
      break;
    }
    run.next=run.time+1.25;
  }
  for(const bot of run.bots)bot.y??=heights.floor;
  if(input.fire)useTool(run,input.fire,field,events);
  projectiles(run,dt,field,events);
  run.bots=run.bots.filter(bot=>{
    if(bot.hp>0)return true;
    run.score++;events.push({type:'tag',x:bot.x,y:bot.y,z:bot.z});return false;
  });
  for(const bot of run.bots){
    bot.cool=Math.max(0,bot.cool-dt);
    const distance=gap(bot,run);
    if(distance<5.2&&Math.abs(bot.y-run.y)<2.8&&bot.cool===0){
      bot.cool=2.2;
      if(run.shield===0){
        run.shield=1.35;run.hp=Math.max(0,run.hp-(run.armor?.5:1));events.push({type:'hit',x:run.x,z:run.z});
      }
    }else if(distance>4){
      const angle=Math.atan2(run.z-bot.z,run.x-bot.x);
      const offset=[0,.8,-.8,1.45,-1.45,2.1].find(a=>!field.blocked(bot.x+Math.cos(angle+a)*3,bot.y,bot.z+Math.sin(angle+a)*3,broken,run.walls))??0;
      moveActor(bot,Math.cos(angle+offset)*12*dt,Math.sin(angle+offset)*12*dt,field,broken,run.walls);
      bot.y=field.support(bot.x,bot.z,bot.y+.32,broken,run.walls);
    }
  }
  if(run.score>=zone.goal)run.phase='won';
  else if(run.hp<=0||run.time>=zone.limit)run.phase='lost';
  if(run.phase!=='live')events.push({type:'finish'});
  return events;
}
