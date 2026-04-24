import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AIPolicyCheck() {
  const [reports, setReports] = useState([])
  const [policies, setPolicies] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getReports().then(setReports).catch(() => {})
    api.getPolicies().then(setPolicies).catch(() => {})
  }, [])

  const analyze = async () => {
    if (!selectedId) return
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.policyCheck(selectedId); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Client Visit Boston (Multiple Violations)', id: () => reports.find(r => r.report_number === 'RPT-2024-006')?.id },
    { label: 'Sales Conference Chicago ($5,670)', id: () => reports.find(r => r.report_number === 'RPT-2024-004')?.id },
    { label: 'Product Launch SF ($6,200)', id: () => reports.find(r => r.report_number === 'RPT-2024-009')?.id },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u2696\uFE0F'} AI Policy Compliance</h1><div className="breadcrumb">Automated policy compliance checking</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <div className="form-group"><label>Select Expense Report</label>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">Choose a report...</option>
            {reports.map(r => <option key={r.id} value={r.id}>{r.report_number} - {r.title} (${r.total_amount}) [{r.status}]</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Quick samples:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={() => { const id = s.id(); if (id) setSelectedId(String(id)) }}>{s.label}</button>)}
        </div>
        <div className="form-group"><label>Active Policies ({policies.length})</label>
          <select disabled><option>{policies.length} active policy rules will be checked</option>
            {policies.filter(p => p.is_active).map(p => <option key={p.id}>{p.name} - {p.severity} ({p.category})</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={analyze} disabled={!selectedId||loading}>{loading ? 'Checking...' : 'Run Policy Check'}</button>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
