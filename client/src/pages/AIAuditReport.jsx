import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AIAuditReport() {
  const [reports, setReports] = useState([])
  const [departments, setDepartments] = useState([])
  const [vendors, setVendors] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getReports().then(setReports).catch(() => {})
    api.getDepartments().then(setDepartments).catch(() => {})
    api.getVendors().then(setVendors).catch(() => {})
    api.getAuditLogs().then(setAuditLogs).catch(() => {})
  }, [])

  const analyze = async () => {
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.auditReport(); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Full Audit Report', action: analyze },
    { label: 'Compliance Summary', action: analyze },
    { label: 'Risk Assessment', action: analyze },
    { label: 'Executive Summary', action: analyze },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F4D3}'} AI Audit Report Generator</h1><div className="breadcrumb">Generate comprehensive audit reports automatically</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <p style={{color:'#64748b',marginBottom:'16px'}}>Generate a complete, professional internal audit report covering all expense reports, flagged items, policy violations, budget variances, vendor risks, and actionable recommendations.</p>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Quick reports:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={s.action} disabled={loading}>{s.label}</button>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'16px',marginBottom:'16px'}}>
          <div className="form-group" style={{marginBottom:0}}><label>Expense Reports ({reports.length})</label>
            <select disabled><option>Auditing {reports.length} reports</option>
              {reports.map(r => <option key={r.id}>{r.report_number} - {r.title} ({r.status}) - ${r.total_amount}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Departments ({departments.length})</label>
            <select disabled><option>{departments.length} departments reviewed</option>
              {departments.map(d => <option key={d.id}>{d.name} - Budget: ${d.budget} | Spent: ${d.total_spent}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Vendors ({vendors.length})</label>
            <select disabled><option>{vendors.length} vendors assessed</option>
              {vendors.map(v => <option key={v.id}>{v.name} - Risk: {v.risk_score} {v.is_flagged ? '| FLAGGED' : ''}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Audit Logs ({auditLogs.length})</label>
            <select disabled><option>{auditLogs.length} audit entries</option>
              {auditLogs.map(a => <option key={a.id}>{a.action} - {a.entity_type} by {a.user_name}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={analyze} disabled={loading}>{loading ? 'Generating Report...' : 'Generate Full Audit Report'}</button>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
