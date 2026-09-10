// Recognize a rise and its reversal at camera frame rates: no pause at the
// peak is required. Brief occlusion preserves the motion, but never casts.
export class LiftReleaseGesture {
 constructor(){this.reset()}
 reset(){this.state='find';this.since=null;this.last=null;this.lastSeen=0;this.armedAt=0;this.cooldownUntil=0;this.baseline=null;this.candidate=null;this.peak=null;this.descentSince=null}
 fire(now){this.reset();this.cooldownUntil=now+1500;return {state:'cooldown',fire:true,progress:1}}
 update(point,now){
  if(now<this.cooldownUntil)return {state:'cooldown',fire:false,progress:0};
  if(!point||!Number.isFinite(point.y)||!Number.isFinite(point.x)){
   if(now-this.lastSeen>650)this.reset();
   return {state:this.state,fire:false,progress:this.state==='release'?1:0};
  }
  if(this.last&&(now-this.lastSeen>650||Math.abs(point.x-this.last.x)>.35||point.id!==this.last.id))this.reset();
  this.lastSeen=now;this.last=point;
  if(this.state==='find'){
   if(this.candidate===null||Math.abs(point.y-this.candidate)>.045){this.candidate=point.y;this.since=now}
   if(now-this.since>=180){this.baseline=point.y;this.state='lift';this.since=null}
  }else if(this.state==='lift'){
   this.baseline=Math.max(this.baseline,point.y);
   if(this.baseline-point.y>=.09){this.state='release';this.peak=point.y;this.armedAt=now}
  }else if(this.state==='release'){
   if(now-this.armedAt>5000){this.reset();return {state:'find',fire:false,progress:0}}
   this.peak=Math.min(this.peak,point.y);
   const fall=point.y-this.peak,threshold=Math.max(.045,Math.min(.08,(this.baseline-this.peak)*.3));
   // A clear drop is enough in one frame; small drops need a second sample.
   // This catches a quick release before the hand leaves the camera frame.
   if(fall>=.12)return this.fire(now);
   if(fall>=threshold){this.descentSince??=now;if(now-this.descentSince>=60)return this.fire(now)}
   else this.descentSince=null;
  }
  const progress=this.state==='release'?1:this.state==='lift'?Math.max(0,Math.min(1,(this.baseline-point.y)/.09)):0;
  return {state:this.state,fire:false,progress};
 }
}
