import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AIFraudDetection() {
  const [reports, setReports] = useState([])
  const [employees, setEmployees] = useState([])
  const [vendors, setVendors] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getReports().then(setReports).catch(() => {})
    api.getEmployees().then(setEmployees).catch(() => {})
    api.getVendors().then(setVendors).catch(() => {})
  }, [])

  const analyze = async () => {
    if (!selectedId) return
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.fraudDetection(selectedId); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Client Visit Boston (Rejected - High Risk)', id: () => reports.find(r => r.report_number === 'RPT-2024-006')?.id },
    { label: 'Q4 Client Meetings NYC (Pending)', id: () => reports.find(r => r.report_number === 'RPT-2024-002')?.id },
    { label: 'West Coast Sales Tour ($7,820)', id: () => reports.find(r => r.report_number === 'RPT-2024-013')?.id },
    { label: 'AWS re:Invent 2024 (Approved)', id: () => reports.find(r => r.report_number === 'RPT-2024-001')?.id },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F6E1}\uFE0F'} AI Fraud Detection</h1><div className="breadcrumb">AI-powered fraud and anomaly detection for expense reports</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <div className="form-group"><label>Select Expense Report</label>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">Choose a report to analyze...</option>
            {reports.map(r => <option key={r.id} value={r.id}>{r.report_number} - {r.title} (${r.total_amount}) [{r.status}]</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Quick samples:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={() => { const id = s.id(); if (id) setSelectedId(String(id)) }}>{s.label}</button>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
          <div className="form-group" style={{marginBottom:0}}><label>Browse by Employee</label>
            <select onChange={e => { const emp = e.target.value; if (emp) { const r = reports.find(r2 => String(r2.employee_name) === emp); if (r) setSelectedId(String(r.id)) } }}>
              <option value="">Filter by employee...</option>
              {[...new Set(reports.map(r => r.employee_name))].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Browse by Status</label>
            <select onChange={e => { const st = e.target.value; if (st) { const r = reports.find(r2 => r2.status === st); if (r) setSelectedId(String(r.id)) } }}>
              <option value="">Filter by status...</option>
              {[...new Set(reports.map(r => r.status))].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={analyze} disabled={!selectedId || loading}>
          {loading ? 'Analyzing...' : 'Run Fraud Detection'}
        </button>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
