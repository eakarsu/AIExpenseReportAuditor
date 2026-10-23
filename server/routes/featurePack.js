'use strict';
// FP34C: authenticated tasks, search/filter + export helpers, domain AI (deterministic fallback).
const express = require('express');
const auth=require('../middleware/auth');
let callProvider=null; try{ const s=require('../services/openrouter'); callProvider=async(p)=>{ const r=await s.callOpenRouter('You are an analyst. Return labelled sections.',p); return r&&(r.content||r); }; }catch{}

function providerKey(){return process.env.OPENROUTER_API_KEY||process.env.OPENAI_API_KEY||'';}
function recordsFrom(body){
  if(Array.isArray(body)) return body;
  if(body&&Array.isArray(body.records)) return body.records;
  if(body&&Array.isArray(body.items)) return body.items;
  if(body&&Array.isArray(body.data)) return body.data;
  if(body&&typeof body==='object'&&Object.keys(body).length) return [body];
  return [];
}
function filterRecords(records,query={}){
  const q=String(query.q||query.search||'').trim().toLowerCase();
  return (records||[]).filter(r=>{
    if(q && !JSON.stringify(r).toLowerCase().includes(q)) return false;
    for(const k of ['status','priority','category','severity','type','season','style']){
      if(query[k]!==undefined && query[k]!=='' && String(r[k]??'')!==String(query[k])) return false;
    }
    return true;
  });
}
function toCSV(records){
  const rows=records||[];
  if(!rows.length) return '';
  const headers=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  const esc=v=>{ if(v===null||v===undefined) return ''; const s=typeof v==='object'?JSON.stringify(v):String(v); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
  return [headers.join(','),...rows.map(r=>headers.map(h=>esc(r[h])).join(','))].join('\n');
}
function sendExport(res,records,format,filename='export'){
  const fmt=String(format||'json').toLowerCase();
  if(fmt==='csv'){ res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition',`attachment; filename="${filename}.csv"`); return res.send(toCSV(records)); }
  res.setHeader('Content-Disposition',`attachment; filename="${filename}.json"`); return res.json(records);
}
function envelope(feature,sections,providerText){
  if(providerText) return {feature,aiGenerated:true,label:'Provider-generated',sections:{...sections,provider:{text:String(providerText)}}};
  return {feature,aiGenerated:false,label:providerKey()?'Deterministic fallback (provider unavailable)':'Deterministic fallback (no provider key configured)',sections};
}
async function maybeProvider(feature,records,fallbackSections){
  if(!providerKey()||typeof callProvider!=='function') return envelope(feature,fallbackSections);
  try{
    const prompt=`Feature ${feature}. Analyse these records and return concise labelled sections:\n${JSON.stringify(records).slice(0,4000)}`;
    const out=await Promise.race([callProvider(prompt),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),4000))]);
    const text=typeof out==='string'?out:(out&&(out.content||out.result||out.text))||'';
    if(!text) return envelope(feature,fallbackSections);
    return envelope(feature,fallbackSections,text);
  }catch{ return envelope(feature,fallbackSections); }
}

function ai1(records){ const amounts=records.map(r=>Number(r.amount??r.total??0)); const total=amounts.reduce((a,b)=>a+b,0); const avg=records.length?total/records.length:0; const high=records.filter((r,i)=>amounts[i]>(avg*2||Infinity)||amounts[i]>=1000); return {'Expense summary':{count:records.length,total,average:avg},'High-value flags':high,'Note':records.length?'Review high-value items':'No records'}; }
function ai2(records){ const seen=new Map(); const dup=[]; for(const r of records){ const k=`${r.amount??''}|${r.vendor||r.vendor_name||r.title||''}`; if(seen.has(k)) dup.push(r); else seen.set(k,r);} return {'Duplicate candidates':dup,'Duplicate count':dup.length,'Empty check':records.length===0}; }
function ai3(records){ const flags=records.filter(r=>!r.category&&!r.category_name||(Number(r.amount||0)>500&&!r.description)); return {'Policy flags':flags,'Flag count':flags.length,'Compliant count':records.length-flags.length}; }


// --- Tasks (in-memory per authenticated user; no DB migration) ---
const tasks=[]; let seq=1;
function ownerOf(req){return String(req.user&&(req.user.id||req.user.userId||req.user.email)||'user');}
const tasksRouter=express.Router();
tasksRouter.use(auth);
tasksRouter.get('/',(req,res)=>{ const mine=tasks.filter(t=>t.owner===ownerOf(req)); res.json({data:filterRecords(mine,req.query),total:mine.length}); });
tasksRouter.post('/',(req,res)=>{
  const b=req.body||{}; if(b.title===undefined||b.title===null||String(b.title).trim()==='') return res.status(400).json({error:'title is required'});
  const t={id:seq++,owner:ownerOf(req),title:b.title,description:b.description??'',status:b.status??'todo',priority:b.priority??'medium',done:b.done??false,estimate:b.estimate??0,dueDate:b.dueDate??null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  tasks.push(t); res.status(201).json(t);
});
tasksRouter.put('/:id',updateTask); tasksRouter.patch('/:id',updateTask);
function updateTask(req,res){
  const t=tasks.find(x=>x.id===Number(req.params.id)&&x.owner===ownerOf(req)); if(!t) return res.status(404).json({error:'Task not found'});
  const b=req.body||{}; for(const k of ['title','description','status','priority','done','estimate','dueDate']) if(Object.prototype.hasOwnProperty.call(b,k)) t[k]=b[k];
  t.updatedAt=new Date().toISOString(); res.json(t);
}

const router=express.Router();
router.use(auth);
router.post('/ai/expense-anomaly-summary',async(req,res)=>{ const recs=recordsFrom(req.body); res.json(await maybeProvider('expense-anomaly-summary',recs,ai1(recs))); });
router.post('/ai/duplicate-risk',async(req,res)=>{ const recs=recordsFrom(req.body); res.json(await maybeProvider('duplicate-risk',recs,ai2(recs))); });
router.post('/ai/policy-flags',async(req,res)=>{ const recs=recordsFrom(req.body); res.json(await maybeProvider('policy-flags',recs,ai3(recs))); });
router.get('/export',(req,res)=>{ const recs=filterRecords(recordsFrom(req.query.records?JSON.parse(req.query.records):[]),req.query); return sendExport(res,recs,req.query.format,'records'); });

module.exports={router,tasksRouter,filterRecords,toCSV,sendExport,recordsFrom,envelope,expenseAnomaly:ai1, duplicateRisk:ai2, policyFlags:ai3,_tasks:tasks};
