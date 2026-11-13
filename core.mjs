export const ZONES = [
  {name:'Crossroads', center:[2,0], goal:5, limit:70},
  {name:'Blackrock Approach', center:[-72,21], goal:7, limit:80},
  {name:'Lost Temple Approach', center:[111,20], goal:9, limit:90},
  {name:'Tower Approach', center:[-77,-31], goal:12, limit:105},
];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const radius=1.6;

export function profile(raw){
  return {best:ZONES.map((zone,i)=>Number.isInteger(raw?.best?.[i])?clamp(raw.best[i],0,3):0),
    rewards:{like:raw?.rewards?.like===true,comment:raw?.rewards?.comment===true}};
}

export function mergeProfile(a,b){
  a=profile(a);b=profile(b);
  return {best:a.best.map((v,i)=>Math.max(v,b.best[i])),rewards:{like:a.rewards.like||b.rewards.like,comment:a.rewards.comment||b.rewards.comment}};
}

export function makeRun(zone=0){
  const [x,z]=ZONES[zone].center;
  return {zone,x,z,hp:5,time:0,score:0,next:0,serial:0,cool:0,shield:0,phase:'ready',bots:[],broken:[]};
}

export function restore(raw,progress){
  const index=progress.best.findIndex(n=>!n);
  const fresh=makeRun(index<0?0:index);
  const zone=ZONES[raw?.zone];
  if(!zone||!Number.isInteger(raw.zone)||raw.zone>0&&!progress.best[raw.zone-1])return fresh;
  const inRange=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;
  if(!['ready','live','lost','won'].includes(raw.phase)||!inRange(raw.x,-196,196)||!inRange(raw.z,-196,196)||!inRange(raw.hp,0,5)||!inRange(raw.time,0,zone.limit)||
      !Number.isInteger(raw.score)||!inRange(raw.score,0,zone.goal)||!inRange(raw.next,0,140)||!inRange(raw.serial,0,200)||!inRange(raw.cool,0,3)||!inRange(raw.shield,0,3)||
      !Array.isArray(raw.bots)||raw.bots.length>6||raw.bots.some(b=>!b||!inRange(b.x,-196,196)||!inRange(b.z,-196,196)||!inRange(b.cool,0,5)||!inRange(b.hp,1,3)||!Number.isInteger(b.id)||b.id<0||b.id>=raw.serial)||
      !Array.isArray(raw.broken)||raw.broken.length>300||raw.broken.some(id=>!Number.isInteger(id)||id<0||id>=2000)||
      (raw.phase==='won')!==(raw.score===zone.goal)||raw.phase==='live'&&(raw.hp===0||raw.time>=zone.limit))return makeRun(raw.zone);
  return {...raw,bots:raw.bots.map(b=>({...b})),broken:[...new Set(raw.broken)]};
}

export function start(run,host){
  if(run.phase!=='ready'&&run.phase!=='live')return false;
  run.phase='live';host?.start();return true;
}

export function grade(run){return run.phase==='won'?1+Number(run.hp>=2)+Number(run.hp>=4):0;}

export function finish(run,progress,host){
  if(run.phase!=='won'&&run.phase!=='lost')return false;
  progress.best[run.zone]=Math.max(progress.best[run.zone],grade(run));host?.end();return true;
}

export function createField(parts){
  const objects=[],bins=new Map();
  const chunk=(x,z)=>`${Math.floor(x/12)},${Math.floor(z/12)}`;
  for(const [id,p] of parts.entries()){
    const [group,name,shape,[x,y,z],[width,height,depth],r,,opacity,solid,anchored]=p;
    if(group.startsWith('Team')||!solid||opacity<.65||height<.55||y+height/2<2.05)continue;
    const halfX=(Math.abs(r[0])*width+Math.abs(r[1])*height+Math.abs(r[2])*depth)/2;
    const halfY=(Math.abs(r[3])*width+Math.abs(r[4])*height+Math.abs(r[5])*depth)/2;
    const halfZ=(Math.abs(r[6])*width+Math.abs(r[7])*height+Math.abs(r[8])*depth)/2;
    if(y-halfY>5)continue;
    const o={id,x,z,left:x-halfX,right:x+halfX,near:z-halfZ,far:z+halfZ,top:y+halfY,
      loose:!anchored&&group!=='Room'&&Math.max(width,height,depth)<28&&shape==='box'};
    objects.push(o);
    for(let a=Math.floor(o.left/12);a<=Math.floor(o.right/12);a++)for(let b=Math.floor(o.near/12);b<=Math.floor(o.far/12);b++){
      const key=`${a},${b}`;
      if(!bins.has(key))bins.set(key,[]);
      bins.get(key).push(o);
    }
  }
  const near=(x,z)=>bins.get(chunk(x,z))||[];
  return {
    blocked(x,z,broken,padding=radius){
      return [-padding,padding].some(dx=>[-padding,padding].some(dz=>near(x+dx,z+dz).some(o=>
        !broken.has(o.id)&&o.left<x+dx&&o.right>x+dx&&o.near<z+dz&&o.far>z+dz)));
    },
    trace(a,b,broken){
      const count=Math.ceil(distance(a,b)/1.15);
      for(let i=1;i<count;i++){
        const f=i/count,x=a.x+(b.x-a.x)*f,z=a.z+(b.z-a.z)*f;
        const hit=near(x,z).find(o=>!broken.has(o.id)&&o.left<x&&o.right>x&&o.near<z&&o.far>z);
        if(hit)return hit;
      }
      return null;
    },
    blast(x,z,range,broken){return objects.filter(o=>o.loose&&!broken.has(o.id)&&Math.hypot(x-o.x,z-o.z)<range).slice(0,13);},
  };
}

export function step(run,input,dt,field){
  const events=[];
  if(run.phase!=='live'||dt<=0||dt>.051)return events;
  const zone=ZONES[run.zone],broken=new Set(run.broken);
  run.time=Math.min(zone.limit,run.time+dt);
  run.cool=Math.max(0,run.cool-dt);run.shield=Math.max(0,run.shield-dt);
  function move(actor,x,z){
    const nextX=clamp(actor.x+x,-193,193),nextZ=clamp(actor.z+z,-193,193);
    if(!field.blocked(nextX,actor.z,broken))actor.x=nextX;
    if(!field.blocked(actor.x,nextZ,broken))actor.z=nextZ;
  }
  if(input){
    const dx=input.x-run.x,dz=input.z-run.z,len=Math.hypot(dx,dz);
    if(len>.2){const amount=Math.min(len,26*dt)/len;move(run,dx*amount,dz*amount);}
  }
  const count=Math.min(6,2+run.zone);
  if(run.time>=run.next&&run.bots.length<count&&run.score+run.bots.length<zone.goal){
    for(let i=0;i<24;i++){
      const a=run.serial*2.399+i*.45,r=21+(i%4)*4;
      const x=clamp(run.x+Math.cos(a)*r,-189,189),z=clamp(run.z+Math.sin(a)*r,-189,189);
      if(field.blocked(x,z,broken,2.3)||Math.hypot(x-run.x,z-run.z)<14||run.bots.some(b=>Math.hypot(x-b.x,z-b.z)<5))continue;
      const id=run.serial++,hp=run.zone>0&&id%4===3?3:2;
      run.bots.push({id,x,z,hp,cool:1.7});events.push({type:'spawn',x,z});break;
    }
    run.next=run.time+(run.zone===0?1.32:.9);
  }
  const targets=run.bots.filter(b=>distance(run,b)<44).sort((a,b)=>distance(run,a)-distance(run,b));
  if(!run.cool&&targets.length){
    const clear=targets.find(b=>!field.trace(run,b,broken));
    const bot=clear||targets[0],obstacle=clear?null:field.trace(run,bot,broken);
    if(!obstacle||obstacle.loose){
      run.cool=.7;
      const x=obstacle?.x??bot.x,z=obstacle?.z??bot.z;
      const bricks=field.blast(x,z,4.6,broken).slice(0,300-run.broken.length);
      for(const brick of bricks){broken.add(brick.id);run.broken.push(brick.id);}
      for(const rival of run.bots)if(Math.hypot(rival.x-x,rival.z-z)<5.2)rival.hp--;
      events.push({type:'blast',x,z,fromX:run.x,fromZ:run.z,bricks:bricks.map(o=>o.id)});
      run.bots=run.bots.filter(rival=>{
        if(rival.hp>0)return true;
        run.score++;events.push({type:'tag',x:rival.x,z:rival.z});return false;
      });
    }
  }
  for(const bot of run.bots){
    bot.cool=Math.max(0,bot.cool-dt);
    const len=distance(bot,run);
    if(len<6&&bot.cool===0){
      bot.cool=2.2;
      if(run.shield===0){run.shield=1.5;run.hp--;events.push({type:'hit',x:run.x,z:run.z});}
    }else if(len>4){
      const angle=Math.atan2(run.z-bot.z,run.x-bot.x),speed=(11+run.zone*.6)*dt;
      let detour=angle;
      if(field.blocked(bot.x+Math.cos(angle)*3,bot.z+Math.sin(angle)*3,broken)){
        const offsets=bot.id%2===0?[.7,-.7,1.4,-1.4,2]:[-.7,.7,-1.4,1.4,-2];
        detour+=offsets.find(n=>!field.blocked(bot.x+Math.cos(angle+n)*4,bot.z+Math.sin(angle+n)*4,broken))??0;
      }
      move(bot,Math.cos(detour)*speed,Math.sin(detour)*speed);
    }
  }
  if(run.score>=zone.goal)run.phase='won';
  else if(run.hp<=0||run.time>=zone.limit)run.phase='lost';
  if(run.phase!=='live')events.push({type:'finish'});
  return events;
}
