'use strict';
process.env.JWT_SECRET=process.env.JWT_SECRET||'test-secret-at-least-32-characters-long!!';
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const test=require('node:test'); const assert=require('node:assert/strict');
const express=require('express'); const jwt=require('jsonwebtoken');
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const fp=require('../routes/featurePack');
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const token=jwt.sign({id:7,tenant_id:'t1',role:'admin',email:'a@test'},process.env.JWT_SECRET);
async function withServer(fn){ const app=express(); app.use(express.json()); app.use('/api/tasks',fp.tasksRouter); app.use('/api/feature-pack',fp.router); const s=app.listen(0); await new Promise(r=>s.once('listening',r)); const base=`http://127.0.0.1:${s.address().port}`; try{ await fn(base); } finally{ s.close(); } }
const H=()=>({Authorization:`Bearer ${token}`,'Content-Type':'application/json'});
test('tasks require auth and create/list/update preserving false/0/empty',async()=>{ await withServer(async(base)=>{
  assert.equal((await fetch(`${base}/api/tasks`)).status,401);
  const c=await fetch(`${base}/api/tasks`,{method:'POST',headers:H(),body:JSON.stringify({title:'T',done:false,estimate:0,description:''})}); assert.equal(c.status,201); const t=await c.json(); assert.equal(t.done,false); assert.equal(t.estimate,0); assert.equal(t.description,'');
  const u=await fetch(`${base}/api/tasks/${t.id}`,{method:'PUT',headers:H(),body:JSON.stringify({done:false,estimate:0,description:''})}); const uj=await u.json(); assert.equal(uj.done,false); assert.equal(uj.estimate,0);
  const l=await (await fetch(`${base}/api/tasks?q=T`,{headers:H()})).json(); assert.ok(l.data.length>=1);
});});
test('filter and CSV preserve 0/false',()=>{ assert.equal(fp.filterRecords([{title:'A',status:'todo',n:0},{title:'B',status:'done'}],{q:'a',status:'todo'}).length,1); const csv=fp.toCSV([{a:0,b:false,c:''}]); assert.ok(csv.includes('0,false')); });
test('domain AI fallback is labelled aiGenerated:false with sections',async()=>{ await withServer(async(base)=>{
  const path='expense-anomaly-summary';
  const r=await fetch(`${base}/api/feature-pack/ai/${path}`,{method:'POST',headers:H(),body:JSON.stringify({records:[{title:'x',amount:0,status:'todo'}]})}); const j=await r.json(); assert.equal(j.aiGenerated,false); assert.ok(j.label); assert.ok(j.sections&&Object.keys(j.sections).length>=1);
});});
