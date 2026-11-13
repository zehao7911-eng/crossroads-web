import assert from 'node:assert/strict';
import * as C from './core.mjs';
import {MAP} from './map.mjs';
import {bridge} from './sdk.mjs';

const field=C.createField(MAP.parts);
assert.equal(MAP.parts.length,1676);
assert.equal(MAP.spawns.length,8);
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
