import {LiftReleaseGesture} from './gesture.js';
export const CAMERA_TEXT={off:'抬一抬手，再放下，把好运接住。',request:'请允许摄像头访问。',loading:'正在准备手势识别，首次加载请稍候。',find:'让一只手在画面里停一下，掌心朝向镜头。',lift:'识别到手了，向上抬一小段，筊杯会跟着升起。',release:'筊杯已举起！自然放下手，让它们一起抛落。',cooldown:'动作收到，好运落地中。',prepare:'摄像头已就绪，可以直接抬手再放下。',paused:'请先关闭说明，再继续手势。',waiting:'正在静心倒计时；也可以点下方按钮直接准备掷筊。',complete:'本轮已完成，点下方按钮查看祝福。',dialog:'关闭弹出的说明或祝福卡后，即可继续。',editing:'正在填写心事，完成后点一下输入框外，再抬手掷筊。',denied:'摄像头未获允许。可在浏览器设置中开启，或用按钮掷筊。',unsupported:'此浏览器暂不支持摄像头，请在 Safari 或 Chrome 中打开，也可用按钮掷筊。',missing:'没有找到可用摄像头，仍可用按钮掷筊。',busy:'摄像头可能正被其他应用使用，请关闭后再试。',model:'手势识别未能启动，请重试；按钮掷筊仍可使用。',hidden:'摄像头已关闭；回来后可重新开启。',ended:'摄像头已断开，可重新开启或用按钮掷筊。'};
export class HandCamera {
 constructor({video,canvas,button,status,canCast,onCast,onMotion=()=>{},pauseKey=()=>'paused'}){Object.assign(this,{video,canvas,button,status,canCast,onCast,onMotion,pauseKey});this.stream=null;this.detector=null;this.active=false;this.pending=false;this.generation=0;this.frame=0;this.gate=new LiftReleaseGesture();this.lastEnabled=false;this.lastStamp=-1;this.lastVideoTime=-1;this.handLostAt=0;this.button.onclick=()=>this.active||this.pending?this.stop():this.start();document.addEventListener('visibilitychange',()=>{if(document.hidden&&(this.active||this.pending))this.stop('hidden')});window.addEventListener('pagehide',()=>this.stop());this.setStatus('off')}
 setStatus(key){if(this.statusKey===key)return;this.statusKey=key;this.status.textContent=CAMERA_TEXT[key]||key}
 sync(){const enabled=this.canCast();if(enabled!==this.lastEnabled){this.gate.reset();this.lastEnabled=enabled}if(this.active&&!enabled)this.setStatus(this.pauseKey())}
 stop(key='off'){this.generation++;this.pending=false;this.active=false;cancelAnimationFrame(this.frame);this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.pause();this.video.srcObject=null;this.detector?.close();this.detector=null;this.gate.reset();this.onMotion({state:'find',point:null});this.lastVideoTime=-1;this.lastStamp=-1;this.canvas.getContext('2d')?.clearRect(0,0,this.canvas.width,this.canvas.height);document.body.classList.remove('camera-on');this.button.textContent='开启摄像头，用手势掷筊';this.button.setAttribute('aria-pressed','false');this.button.removeAttribute('aria-busy');this.setStatus(key)}
 async start(){
  if(this.active||this.pending)return;
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){this.setStatus('unsupported');return}
  this.pending=true;const token=++this.generation;this.button.textContent='取消开启摄像头';this.button.setAttribute('aria-busy','true');this.setStatus('request');let detector=null;
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:15,max:24}}});
   if(token!==this.generation){stream.getTracks().forEach(t=>t.stop());return}
   this.stream=stream;stream.getVideoTracks()[0].addEventListener('ended',()=>{if(token===this.generation)this.stop('ended')});this.video.srcObject=stream;await this.video.play();if(token!==this.generation)return;
   document.body.classList.add('camera-on');this.setStatus('loading');
   const {HandLandmarker,FilesetResolver}=await import('./assets/vision/vision_bundle.mjs');if(token!==this.generation)return;
   const files=await FilesetResolver.forVisionTasks(new URL('./assets/vision/wasm',import.meta.url).href);if(token!==this.generation)return;
   detector=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./assets/vision/hand_landmarker.task',import.meta.url).href,delegate:'CPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.65,minHandPresenceConfidence:.65,minTrackingConfidence:.65});
   if(token!==this.generation){detector.close();return}
   this.detector=detector;this.active=true;this.pending=false;this.lastEnabled=this.canCast();this.gate.reset();this.button.textContent='关闭摄像头';this.button.setAttribute('aria-pressed','true');this.button.removeAttribute('aria-busy');this.setStatus(this.lastEnabled?'find':this.pauseKey());this.loop(token);
  }catch(e){if(token!==this.generation)return;const key={NotAllowedError:'denied',PermissionDeniedError:'denied',NotFoundError:'missing',DevicesNotFoundError:'missing',NotReadableError:'busy',TrackStartError:'busy',SecurityError:'unsupported'}[e.name]||'model';this.stop(key)}
 }
 loop(token){if(!this.active||token!==this.generation)return;this.frame=requestAnimationFrame(()=>this.loop(token));const now=performance.now();if(now-this.lastStamp<125||this.video.readyState<2||this.video.currentTime===this.lastVideoTime)return;this.lastStamp=now;this.lastVideoTime=this.video.currentTime;
  try{const result=this.detector.detectForVideo(this.video,now),hand=result.landmarks?.[0];this.draw(hand);const enabled=this.canCast();if(!enabled){this.gate.reset();this.lastEnabled=false;this.setStatus(this.pauseKey());return}if(!this.lastEnabled){this.gate.reset();this.lastEnabled=true}
   const center=hand?[0,5,9,13,17].reduce((a,i)=>({x:a.x+hand[i].x/5,y:a.y+hand[i].y/5}),{x:0,y:0}):null;
   if(center)center.id=result.handedness?.[0]?.[0]?.categoryName||'hand';const event=this.gate.update(center,now);this.setStatus(event.state);if(event.fire){this.gate.reset();this.onCast()}else this.onMotion({...event,point:center})
  }catch{this.stop('model')}
 }
 draw(hand){const canvas=this.canvas;canvas.width=this.video.videoWidth||640;canvas.height=this.video.videoHeight||480;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);if(!hand)return;const links=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];ctx.strokeStyle='#e8ff9e';ctx.lineWidth=2;for(const [a,b] of links){ctx.beginPath();ctx.moveTo((1-hand[a].x)*canvas.width,hand[a].y*canvas.height);ctx.lineTo((1-hand[b].x)*canvas.width,hand[b].y*canvas.height);ctx.stroke()}ctx.fillStyle='#fff6dc';for(const p of hand){ctx.beginPath();ctx.arc((1-p.x)*canvas.width,p.y*canvas.height,3,0,Math.PI*2);ctx.fill()}}
}
