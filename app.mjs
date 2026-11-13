import * as C from './core.mjs';
import * as Classic from './classic.mjs';
import {MAP} from './map.mjs';
import {ArenaView} from './art.mjs';
import {RushAudio} from './audio.mjs';
import {bridge} from './sdk.mjs';

const get=id=>document.getElementById(id);
const ui=Object.fromEntries(['game','world','hud','score','timer','life','sound','cover','play','arcade','film','shot','skip','hint','feedback','result','arena','result-title','stars','stats','next','rewards','fallback','loadout','jump','exit'].map(id=>[id,get(id)]));
const key='crossroads-web-v1',field=C.createField(MAP.parts),classicField=Classic.makeClassicField(MAP.parts);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let local;
try{local=JSON.parse(localStorage.getItem(key)||'null');}catch{}
let progress=C.profile(local?.profile),run=C.restore(local?.run,progress);
let classicProgress=C.profile(local?.classicProfile),classicRun=Classic.restore(local?.classicRun,classicProgress);
let classic=local?.selection==='classic',fire=null,jump=false;
if(classic)run=classicRun;
let arcadeRun=C.restore(local?.run,progress);
const audio=new RushAudio(local?.muted===true);
let mode='cover',elapsed=0,view,host,drag=null,target=null,destination=null,raf=0,previous=0,carry=0,savedAt=0,flashUntil=0;
const keys=new Set(),directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1],a:[-1,0],d:[1,0],w:[0,-1],s:[0,1]};

function persist(cloud=false){
  if(classic)classicRun=run;
  else arcadeRun=run;
  try{localStorage.setItem(key,JSON.stringify({profile:progress,run:arcadeRun,classicProfile:classicProgress,classicRun,selection:classic?'classic':'arcade',muted:audio.muted}));}catch{}
  if(cloud)host?.save();
}

function showRewards(){
  const support=host?.support(),copy=[];
  if(support?.like&&!progress.rewards.like)copy.push('Like on GameWave to unlock pink blast trails.');
  if(support?.comment&&!progress.rewards.comment)copy.push('Comment to unlock violet knockout effects.');
  ui.rewards.hidden=!copy.length;ui.rewards.textContent=copy.join(' ');
}

function setupHost(){return bridge({read:()=>({...progress,classic:classicProgress.best}),write:(value,merge)=>{
  progress=merge?C.mergeProfile(progress,value):C.profile(value);
  if(value?.classic)classicProgress=C.mergeProfile(classicProgress,{best:value.classic});
  persist();
},changed:event=>{showRewards();if(event.type==='connected')requestAnimationFrame(resize);}});}

function audioState(){
  audio.setActive(!document.hidden&&(mode==='play'||mode==='intro'));
  ui.sound.setAttribute('aria-pressed',String(audio.muted));
  ui.sound.setAttribute('aria-label',audio.muted?'Unmute sound':'Mute sound');
}

function hud(){
  const zone=C.ZONES[run.zone],left=Math.ceil(zone.limit-run.time);
  ui.score.textContent=`${run.score} / ${zone.goal}`;
  ui.timer.textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;
  ui.life.textContent=run.hp;
  ui.hint.hidden=mode!=='play'||run.time>4||Boolean(drag);
  if(classic&&mode==='play')for(const [i,button] of Array.from(ui.loadout.children).entries()){
    button.style.setProperty('--ready',String(1-run.cooldowns[i]/Classic.tools[i].wait));
  }
}

function display(next){
  mode=next;elapsed=0;carry=0;ui.game.dataset.mode=next;
  ui.cover.hidden=next!=='cover';ui.hud.hidden=next!=='play';ui.film.hidden=next!=='intro'&&next!=='outro';ui.result.hidden=next!=='result';
  ui.hint.hidden=next!=='play';ui.feedback.textContent='';
  ui.play.textContent=classicRun.phase==='live'?'CONTINUE CLASSIC':'PLAY CLASSIC';
  ui.arcade.textContent=arcadeRun.phase==='live'?'Continue Arcade':'Arcade Mode';
  ui.loadout.hidden=next!=='play'||!classic;ui.jump.hidden=ui.loadout.hidden;
  ui.exit.hidden=next!=='result';
  ui.hint.textContent=classic?'DRAG TO MOVE · TAP TO USE TOOL':'DRAG TO MOVE';
  if(next==='intro')ui.shot.textContent=C.ZONES[run.zone].name;
  if(next==='outro')ui.shot.textContent=run.phase==='won'?'ARENA CLEAR':'ROUND OVER';
  audioState();hud();
}

function enter(){
  if(mode!=='intro'&&mode!=='cover')return;
  if(!C.start(run,host))return;
  display('play');persist();
}

function finish(){
  C.finish(run,classic?classicProgress:progress,host);persist(run.phase==='won');
  drag=null;target=null;destination=null;keys.clear();
  display('outro');audio.event(run.phase);
}

function showResult(){
  display('result');
  const won=run.phase==='won',zone=C.ZONES[run.zone],grade=C.grade(run);
  ui.arena.textContent=zone.name;ui['result-title'].textContent=won?'Arena clear':run.hp?'Time up':'Knocked out';
  ui.stars.textContent='★'.repeat(grade)+'☆'.repeat(3-grade);ui.stars.setAttribute('aria-label',`${grade} of 3 stars`);
  ui.stats.textContent=`${run.score} / ${zone.goal} rivals · ${run.broken.length} bricks broken`;
  ui.next.textContent=won?run.zone===C.ZONES.length-1?'PLAY AGAIN':'NEXT ARENA':'TRY AGAIN';
  showRewards();
}

function event(e){
  view.event(e,progress.rewards);
  if(e.type==='blast'){
    audio.event('cut',e.bricks.length?4:1);
    if(e.bricks.length){ui.feedback.textContent=`${e.bricks.length} BRICKS!`;flashUntil=view.clock+.65;}
  }
  if(e.type==='tag'){audio.event('cut',6);ui.feedback.textContent='RIVAL DOWN!';flashUntil=view.clock+.8;}
  if(e.type==='hit'){audio.event('bonk');ui.feedback.textContent='HIT!';flashUntil=view.clock+.55;}
  if(e.type==='fire')audio.event('cut',e.tool==='rocket'?3:1);
  if(e.type==='impact'){audio.event('cut',e.heavy?4:2);if(e.bricks.length){ui.feedback.textContent=`${e.bricks.length} BRICKS!`;flashUntil=view.clock+.65;}}
  if(e.type==='build'||e.type==='armor'){audio.event('cut',5);ui.feedback.textContent=e.type==='build'?'WALL BUILT':'BATTLE ARMOR';flashUntil=view.clock+.75;}
  if(e.type==='finish')finish();
}

function resize(){
  const hint=host?.viewport();
  if(hint?.width>=280&&hint.width<innerWidth)ui.game.style.maxWidth=`${hint.width}px`;
  else ui.game.style.removeProperty('max-width');
  const rect=ui.game.getBoundingClientRect();if(rect.width>0&&rect.height>0)view.size(rect.width,rect.height);
}

function pick(e){
  const r=ui.world.getBoundingClientRect();return view.point(e.clientX-r.left,e.clientY-r.top,classic?run.y+1.25:.8);
}

function frame(timestamp){
  raf=requestAnimationFrame(frame);
  const dt=previous?Math.min(.067,(timestamp-previous)/1000):0;previous=timestamp;
  if(document.hidden)return;
  elapsed+=dt;
  if(mode==='intro'&&elapsed>=(reduced.matches?.18:4.1))enter();
  if(mode==='outro'&&elapsed>=(reduced.matches?.18:3.4))showResult();
  if(mode==='play'){
    let intent=target||destination;
    if(drag&&drag.moved){
      const length=Math.hypot(drag.dx,drag.dy);
      if(length>6){
        const scale=28/Math.max(30,length);
        intent={x:run.x+(drag.dx*.96-drag.dy*.23)*scale,z:run.z+(drag.dy*.96+drag.dx*.23)*scale};
      }
    }
    if(keys.size){let x=0,z=0;for(const name of keys){x+=directions[name][0];z+=directions[name][1];}intent={x:run.x+x*25,z:run.z+z*25};}
    carry+=dt;
    while(carry>=1/60&&mode==='play'){
      const events=classic?Classic.step(run,{move:intent,fire,jump},1/60,classicField):C.step(run,intent,1/60,field);
      fire=null;jump=false;carry-=1/60;
      if(events.some(e=>e.bricks?.length))view.applyBroken(run.broken);
      for(const e of events)event(e);
    }
    hud();
    if(run.time-savedAt>=.65){savedAt=run.time;persist();}
  }
  if(ui.feedback.textContent&&view.clock>flashUntil)ui.feedback.textContent='';
  view.draw(run,dt,mode,elapsed,drag?.moved?null:target||destination);
}

function newRound(index){
  run=classic?Classic.makeRun(index):C.makeRun(index);
  host.prepare();view.applyBroken([]);savedAt=0;persist();display('intro');selectTool(run.weapon);
}

function selectTool(index){
  if(!classic||!Classic.tools[index])return;
  run.weapon=index;
  for(const [i,button] of Array.from(ui.loadout.children).entries())button.setAttribute('aria-pressed',String(i===index));
}

function selectMode(next){
  classic=next;
  run=classic?classicRun:arcadeRun;
  savedAt=run.time;host.prepare();view.applyBroken(run.broken);selectTool(run.weapon);
  if(run.phase==='live')enter();
  else if(run.phase==='won'||run.phase==='lost')showResult();
  else display('intro');
  persist();
}

function bind(){
  ui.play.addEventListener('click',()=>{audio.unlock();selectMode(true);});
  ui.arcade.addEventListener('click',()=>{audio.unlock();selectMode(false);});
  ui.exit.addEventListener('click',()=>{
    keys.clear();drag=null;target=null;destination=null;fire=null;jump=false;
    persist();display('cover');
  });
  ui.jump.addEventListener('click',()=>{if(mode==='play'&&classic)jump=true;});
  for(const [i,tool] of Classic.tools.entries()){
    const button=document.createElement('button');
    button.className='small tool';button.type='button';button.title=tool.name;
    button.setAttribute('aria-label',tool.name);
    button.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${tool.icon}"/></svg><span>${tool.name}</span>`;
    button.addEventListener('click',()=>{if(mode==='play')selectTool(i);});
    ui.loadout.append(button);
  }
  selectTool(run.weapon);
  ui.skip.addEventListener('click',()=>{if(mode==='intro')enter();else if(mode==='outro')showResult();});
  ui.next.addEventListener('click',()=>{audio.unlock();newRound(run.phase==='won'?(run.zone+1)%C.ZONES.length:run.zone);});
  ui.sound.addEventListener('click',()=>{audio.mute(!audio.muted);audioState();persist();});
  ui.world.addEventListener('pointerdown',e=>{
    if(mode!=='play'||drag||e.button!==0)return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0,moved:false};
    ui.world.setPointerCapture(e.pointerId);destination=null;target=classic?null:pick(e);
  });
  ui.world.addEventListener('pointermove',e=>{
    if(drag?.id!==e.pointerId)return;
    drag.dx=e.clientX-drag.x;drag.dy=e.clientY-drag.y;
    if(Math.hypot(drag.dx,drag.dy)>8){drag.moved=true;target=null;}
  });
  ui.world.addEventListener('pointerup',e=>{
    if(drag?.id!==e.pointerId)return;
    const point=drag.moved?null:pick(e);
    if(classic)fire=point;
    else destination=point;
    drag=null;target=null;
  });
  const cancel=e=>{if(drag?.id===e.pointerId){drag=null;target=null;}};
  ui.world.addEventListener('pointercancel',cancel);ui.world.addEventListener('lostpointercapture',cancel);
  addEventListener('keydown',e=>{
    if(mode!=='play')return;
    if(directions[e.key]){e.preventDefault();keys.add(e.key);}
    else if(classic&&e.code==='Space'&&!e.repeat){e.preventDefault();jump=true;}
    else if(classic&&/^[1-6]$/.test(e.key))selectTool(Number(e.key)-1);
  });
  addEventListener('keyup',e=>keys.delete(e.key));
  addEventListener('blur',()=>{keys.clear();drag=null;target=null;fire=null;jump=false;});
}

function init(){
  try{view=new ArenaView(ui.world);}catch(error){console.warn(error);ui.cover.hidden=true;ui.fallback.hidden=false;return;}
  view.applyBroken(run.broken);host=setupHost();savedAt=run.time;
  if(run.phase==='won'||run.phase==='lost')showResult();else display('cover');
  resize();bind();addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{previous=0;carry=0;keys.clear();drag=null;target=null;fire=null;jump=false;audioState();if(document.hidden)persist();});
  addEventListener('pagehide',()=>{persist();host.stop();audio.setActive(false);cancelAnimationFrame(raf);});
  addEventListener('pageshow',e=>{if(e.persisted){host=setupHost();previous=0;if(run.phase==='won'||run.phase==='lost')showResult();else display('cover');raf=requestAnimationFrame(frame);}});
  raf=requestAnimationFrame(frame);
}
init();
