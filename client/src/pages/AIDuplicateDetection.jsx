import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AIDuplicateDetection() {
  const [reports, setReports] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { api.getReports().then(setReports).catch(() => {}) }, [])

  const analyze = async () => {
    if (!selectedId) return
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.duplicateDetection(selectedId); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'AWS re:Invent (15 items)', id: () => reports.find(r => r.report_number === 'RPT-2024-001')?.id },
    { label: 'Q4 Client Meetings NYC (11 items)', id: () => reports.find(r => r.report_number === 'RPT-2024-002')?.id },
    { label: 'Client Visit Boston (9 items)', id: () => reports.find(r => r.report_number === 'RPT-2024-006')?.id },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F50D}'} AI Duplicate Detection</h1><div className="breadcrumb">Find duplicate expense submissions across reports</div></div></div>
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
        <div className="form-group"><label>Browse by Employee</label>
          <select onChange={e => { const emp = e.target.value; if (emp) { const r = reports.find(r2 => String(r2.employee_name) === emp); if (r) setSelectedId(String(r.id)) } }}>
            <option value="">Filter by employee...</option>
            {[...new Set(reports.map(r => r.employee_name))].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={analyze} disabled={!selectedId||loading}>{loading ? 'Scanning...' : 'Scan for Duplicates'}</button>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
