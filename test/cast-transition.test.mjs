import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {evaluate,blessingIndex,BLESSINGS} from '../logic.js';
// Exercise the production throw transition with animation time and DOM mocked.
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const throwCode=source.slice(source.indexOf('async function toss('),source.indexOf('function historyHtml('));
const holy={kind:'holy',a:'flat',b:'convex'},yin={kind:'yin',a:'convex',b:'convex'};
async function cast({rule='single',history=[],result=holy,trigger='gesture',cancel=false}={}){
 const calls={fortune:null,scrolls:0},context={phase:'ready',rule,history:[...history],epoch:0,liftAmount:1,canCast:()=>true,randomThrow:()=>result,evaluate,
 stage:{style:{setProperty(){}},classList:{add(){},remove(){}},offsetWidth:1},display(){},tone(){},matchMedia:()=>({matches:false}),setFaces(){},
 setTimeout(resolve,ms){if(cancel&&ms===1100)context.epoch++;resolve()},
 showOutcome(){context.phase='outcome'},finishCup(){context.phase='blessing';calls.fortune=BLESSINGS[blessingIndex(context.rule,context.history)].name},journey:{scrollIntoView(){calls.scrolls++}}};
 vm.createContext(context);vm.runInContext(throwCode,context);await context.toss(trigger);return {context,calls};
}
test('gesture cast automatically reveals a fortune for both favourable and unfavourable single throws',async()=>{for(const result of [holy,yin]){const {context,calls}=await cast({result});assert.equal(context.history.length,1);assert.equal(context.phase,'blessing');assert.ok(calls.fortune);assert.equal(calls.scrolls,1)}});
test('majority and consecutive rules reveal fortune only once the chosen round finishes',async()=>{for(const rule of ['majority','streak']){const unfinished=await cast({rule,history:[holy]});assert.equal(unfinished.context.phase,'outcome');assert.equal(unfinished.calls.fortune,null);const finished=await cast({rule,history:[holy,holy]});assert.equal(finished.context.phase,'blessing');assert.ok(finished.calls.fortune)}});
test('button throws retain the manual result step',async()=>{const {context,calls}=await cast({trigger:'button'});assert.equal(context.phase,'outcome');assert.equal(calls.fortune,null)});
test('leaving the round during the result pause cancels automatic navigation',async()=>{const {calls}=await cast({cancel:true});assert.equal(calls.fortune,null);assert.equal(calls.scrolls,0)});
