import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AIApprovalRecommendation() {
  const [reports, setReports] = useState([])
  const [employees, setEmployees] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getReports().then(setReports).catch(() => {})
    api.getEmployees().then(setEmployees).catch(() => {})
  }, [])

  const analyze = async (id) => {
    const reportId = id || selectedId
    if (!reportId) return
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.approvalRecommendation(reportId); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Pending Submitted Report', action: () => { const r = reports.find(r2 => r2.status === 'submitted'); if (r) { setSelectedId(String(r.id)); analyze(String(r.id)) } } },
    { label: 'Under Review Report', action: () => { const r = reports.find(r2 => r2.status === 'under_review'); if (r) { setSelectedId(String(r.id)); analyze(String(r.id)) } } },
    { label: 'Highest Amount Report', action: () => { const r = [...reports].sort((a,b) => b.total_amount - a.total_amount)[0]; if (r) { setSelectedId(String(r.id)); analyze(String(r.id)) } } },
    { label: 'Previously Rejected', action: () => { const r = reports.find(r2 => r2.status === 'rejected'); if (r) { setSelectedId(String(r.id)); analyze(String(r.id)) } } },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F4CB}'} AI Approval Recommendation</h1><div className="breadcrumb">Get AI-powered approve/reject recommendations</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Quick samples:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={s.action} disabled={loading}>{s.label}</button>)}
        </div>
        <div className="form-group"><label>Select Expense Report</label>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}><option value="">Choose a report...</option>
            {reports.map(r => <option key={r.id} value={r.id}>{r.report_number} - {r.title} ({r.status}) - ${r.total_amount}</option>)}
          </select>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
          <div className="form-group" style={{marginBottom:0}}><label>Filter by Employee</label>
            <select onChange={e => { const empId = e.target.value; if (empId) { const r = reports.find(r2 => String(r2.employee_id) === empId); if (r) setSelectedId(String(r.id)) } }}>
              <option value="">Filter reports by employee...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} - {e.title}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Filter by Status</label>
            <select onChange={e => { const st = e.target.value; if (st) { const r = reports.find(r2 => r2.status === st); if (r) setSelectedId(String(r.id)) } }}>
              <option value="">Filter by status...</option>
              <option value="submitted">Submitted</option><option value="under_review">Under Review</option>
              <option value="draft">Draft</option><option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => analyze()} disabled={!selectedId||loading}>{loading ? 'Analyzing...' : 'Get Recommendation'}</button>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
