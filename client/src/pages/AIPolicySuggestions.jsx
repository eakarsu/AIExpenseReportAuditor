import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AIPolicySuggestions() {
  const [policies, setPolicies] = useState([])
  const [categories, setCategories] = useState([])
  const [departments, setDepartments] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getPolicies().then(setPolicies).catch(() => {})
    api.getCategories().then(setCategories).catch(() => {})
    api.getDepartments().then(setDepartments).catch(() => {})
  }, [])

  const analyze = async () => {
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.policySuggestions(); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Full Policy Review', action: analyze },
    { label: 'Gap Analysis', action: analyze },
    { label: 'Industry Best Practices', action: analyze },
    { label: 'Overly Strict Rules', action: analyze },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F4A1}'} AI Policy Suggestions</h1><div className="breadcrumb">AI-powered policy optimization and gap analysis</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <p style={{color:'#64748b',marginBottom:'16px'}}>Analyze current expense policies against actual spending patterns to identify gaps, overly strict rules, and opportunities for new policies. Get industry best practice recommendations.</p>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Quick analysis:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={s.action} disabled={loading}>{s.label}</button>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px',marginBottom:'16px'}}>
          <div className="form-group" style={{marginBottom:0}}><label>Active Policies ({policies.length})</label>
            <select disabled><option>Reviewing {policies.length} policies</option>
              {policies.map(p => <option key={p.id}>{p.name} - {p.rule_type} ({p.is_active ? 'Active' : 'Inactive'})</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Categories ({categories.length})</label>
            <select disabled><option>{categories.length} expense categories</option>
              {categories.map(c => <option key={c.id}>{c.name} ({c.code}) - Max: ${c.max_amount || 'No limit'}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Departments ({departments.length})</label>
            <select disabled><option>{departments.length} departments covered</option>
              {departments.map(d => <option key={d.id}>{d.name} ({d.code}) - Budget: ${d.budget}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={analyze} disabled={loading}>{loading ? 'Analyzing...' : 'Get Policy Suggestions'}</button>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
