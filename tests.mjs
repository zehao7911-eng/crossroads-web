import assert from 'node:assert/strict';
import * as C from './core.mjs';
import {MAP} from './map.mjs';
import {bridge} from './sdk.mjs';
import * as Classic from './classic.mjs';

const field=C.createField(MAP.parts);
assert.equal(MAP.parts.length,1760);
assert.equal(MAP.spawns.length,8);
assert(MAP.parts.some(p=>p[0]==='Teleporter'));
assert(MAP.parts.some(p=>p[0]==='BattleArmorStand'));
for(const name of ['Tower','Overhead Ramp','BlackrockCastle','LostTemple','Hideout'])assert(MAP.parts.some(p=>p[0]===name));
const progress=C.profile();
for(const hz of [30,60,120])for(const [zone,setting] of C.ZONES.entries()){
  const run=C.makeRun(zone);
  assert(!field.blocked(run.x,run.z,new Set()));
  assert(C.start(run));
  let ends=0;
  for(let i=0;i<hz*setting.limit&&run.phase==='live';i++){
    const angle=i/hz*.83;
    const aim={x:setting.center[0]+Math.sin(angle)*28,z:setting.center[1]+Math.cos(angle)*28};
    ends+=C.step(run,aim,1/hz,field).filter(e=>e.type==='finish').length;
  }
  assert.equal(run.phase,'won',`arena ${zone+1} at ${hz} Hz`);
  assert.equal(run.score,setting.goal);assert.equal(ends,1);
  C.finish(run,progress);
  assert.deepEqual(C.restore(JSON.parse(JSON.stringify(run)),progress),run);
  assert.deepEqual(C.step(run,null,1/hz,field),[]);
}

const coverField=C.createField([['Structure','Brick','box',[2,1.5,0],[2,2.9,2],[1,0,0,0,1,0,0,0,1],1,1,true,false]]);
const demo=C.makeRun();demo.x=-5;demo.z=0;demo.next=9;demo.bots=[{id:0,x:6,z:0,hp:2,cool:1.7}];demo.serial=1;
assert(coverField.trace(demo,demo.bots[0],new Set()));C.start(demo);
assert.deepEqual(C.step(demo,null,1/60,coverField)[0].bricks,[0]);
assert(!coverField.trace(demo,demo.bots[0],new Set(demo.broken)));
const failure=C.makeRun(3);C.start(failure);failure.time=C.ZONES[3].limit-.001;C.step(failure,null,1/60,field);
assert.equal(failure.phase,'lost');assert.equal(C.grade(failure),0);

const floorMap=[['Room','Floor','box',[0,.2,0],[390,1.2,390],[1,0,0,0,1,0,0,0,1],1,1,true,true]];
const practice=Classic.makeClassicField(floorMap);
function practiceRun(weapon){
  const r=Classic.makeRun();
  r.x=2;r.z=0;
  r.weapon=weapon;r.next=45;r.phase='live';r.serial=1;
  r.bots=[{id:0,x:r.x,z:r.z+4.8,y:.8,hp:2,cool:5,grounded:true}];
  return r;
}
for(const i of [0,1,2,4,5]){
  const r=practiceRun(i);
  const aim={x:r.x,z:r.z+4.8};
  Classic.step(r,{fire:aim},1/60,practice);
  assert(r.cooldowns[i]>0,Classic.tools[i].name+' activates');
  for(let j=0;j<175;j++)Classic.step(r,{},1/60,practice);
  assert(i===1?r.bots[0]?.hp===1:r.score===1,Classic.tools[i].name+' damages rival');
}
const building=practiceRun(3);
Classic.step(building,{fire:{x:2,z:12},jump:true},1/60,practice);
assert.equal(building.walls.length,1);
assert(building.y>.8);
assert(practice.blocked(2,.8,12,new Set(),building.walls));
for(let i=0;i<65;i++)Classic.step(building,{},1/60,practice);
assert(building.grounded);
const classicField=Classic.makeClassicField(MAP.parts);
const classicProgress=C.profile(),classic=Classic.makeRun();
assert(!classicField.blocked(classic.x,classic.y,classic.z,new Set(),[]));
C.start(classic);
for(let i=0;i<4200&&classic.phase==='live';i++){
  const target=classic.bots.find(bot=>!classicField.trace({x:classic.x,y:classic.y+1.72,z:classic.z},
    {x:bot.x,y:bot.y+1.72,z:bot.z},new Set(classic.broken),classic.walls));
  const away=classic.bots.some(bot=>Math.hypot(bot.x-classic.x,bot.z-classic.z)<9);
  const move=away?{x:-37,z:-5}:null;
  Classic.step(classic,{move,fire:target?{...target,y:target.y+1.72}:null},1/60,classicField);
}
assert.equal(classic.phase,'won');
C.finish(classic,classicProgress);
assert.equal(Classic.restore(JSON.parse(JSON.stringify(classic)),classicProgress).phase,'won');
const oldPart=C.createField(MAP.parts.slice(0,1676));
for(const [i] of C.ZONES.entries()){
  const old=C.makeRun(i),updated=C.makeRun(i);
  C.start(old);C.start(updated);
  for(let f=0;f<120;f++){C.step(old,null,1/60,oldPart);C.step(updated,null,1/60,field);}
  assert.deepEqual(updated,old);
}

const tick=async()=>{for(let i=0;i<14;i++)await Promise.resolve();};
let platform,starts=0,ends=0,claims=0,off=0,like,comment;
let p=C.profile();const writes=[];
const attach=(timeout=5000)=>bridge({host:()=>platform,read:()=>p,write:(v,merge)=>{p=merge?C.mergeProfile(p,v):C.profile(v);},changed:event=>{if(event.type==='reward')claims++;},timeout});
let sdk=attach(),run=C.makeRun();assert(C.start(run,sdk));
for(let i=0;i<105;i++)C.step(run,null,1/60,field);
assert.equal(run.phase,'live');assert(run.bots.length);
platform={gameStart:()=>starts++};sdk.connect();sdk.connect();assert.equal(starts,1);
Object.assign(platform,{gameOver:()=>ends++,onLike:async cb=>{like=cb;return {code:0,data:{unsubscribe:()=>off++}};},onComment:async cb=>{comment=cb;return {code:0,data:{unsubscribe:()=>off++}};},loadUserGameState:async()=>({}),saveUserGameState:async value=>{writes.push(value);return {code:0};}});
sdk.connect();await tick();
like({project_id:'crossroads',status:false,count:7});comment({project_id:3,content:''});assert.equal(claims,0);
like({project_id:'crossroads',status:true,count:0});like({project_id:'crossroads',status:true,count:11});
comment({project_id:'crossroads',content:'',count:0});comment({project_id:'crossroads',content:'duplicate'});await tick();
assert.equal(claims,2);assert.equal(writes.at(-1).game,'crossroads-web');assert(!('run' in writes.at(-1)));
sdk.stop();assert.equal(off,2);run=C.restore(JSON.parse(JSON.stringify(run)),p);sdk=attach();await tick();assert.equal(starts,1);
C.start(run,sdk);C.start(run,sdk);assert.equal(starts,2);
for(let i=0;i<4200&&run.phase==='live';i++)C.step(run,null,1/60,field);
assert.equal(run.phase,'won');C.finish(run,p,sdk);C.finish(run,p,sdk);sdk.save();await tick();assert.equal(ends,1);assert.equal(writes.at(-1).profile.best[0],3);sdk.stop();assert.equal(off,4);
let pending;
platform={gameStart:async()=>{throw Error('start unavailable');},onLike:()=>new Promise(resolve=>pending=resolve),onComment:async()=>{throw Error('comment unavailable');}};
sdk=attach();C.start(C.makeRun(),sdk);sdk.stop();pending({code:0,data:{unsubscribe:()=>off++}});await tick();assert.equal(off,5);
let expired;
platform={onLike:()=>new Promise(resolve=>expired=resolve)};sdk=attach(8);await new Promise(resolve=>setTimeout(resolve,22));expired({code:0,data:{unsubscribe:()=>off++}});await tick();sdk.stop();assert.equal(off,6);
let foreign=0;
platform={loadUserGameState:async()=>({game:'another',v:1,profile:{}}),saveUserGameState:()=>foreign++};sdk=attach();await tick();sdk.save();await tick();sdk.stop();assert.equal(foreign,0);
console.log('12 full arena simulations, original map, breakable collision, restored round and optional host checks passed.');
