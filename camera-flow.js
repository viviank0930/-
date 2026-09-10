export function cameraFlow({phase,done=false,dialog=false,editing=false}){
 if(dialog)return {enabled:false,key:'dialog',action:null};
 if(editing)return {enabled:false,key:'editing',action:null};
 if(['setup','ready'].includes(phase)||phase==='outcome'&&!done)return {enabled:true,key:'find',action:null};
 if(phase==='waiting')return {enabled:false,key:'waiting',action:'ready'};
 if(phase==='outcome'&&done)return {enabled:false,key:'complete',action:'blessing'};
 if(phase==='tossing')return {enabled:false,key:'cooldown',action:null};
 return {enabled:false,key:'complete',action:null};
}
export function pairLift(state,point){if(state==='release')return 1;if(state!=='lift'||!point)return 0;return Math.max(0,Math.min(1,(.64-point.y)/.26))}
