import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AIAnomalyDetection() {
  const [reports, setReports] = useState([])
  const [vendors, setVendors] = useState([])
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getReports().then(setReports).catch(() => {})
    api.getVendors().then(setVendors).catch(() => {})
    api.getDepartments().then(setDepartments).catch(() => {})
    api.getEmployees().then(setEmployees).catch(() => {})
  }, [])

  const analyze = async () => {
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.anomalyDetection(); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Full Anomaly Scan', action: analyze },
    { label: 'Statistical Outliers', action: analyze },
    { label: 'Time-Based Patterns', action: analyze },
    { label: 'Vendor Concentration', action: analyze },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F6A8}'} AI Anomaly Detection</h1><div className="breadcrumb">Detect statistical anomalies and outliers across all expenses</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <p style={{color:'#64748b',marginBottom:'16px'}}>Scan all recent expense data using statistical analysis to detect outliers, unusual patterns, time-based anomalies, vendor concentration risks, and potential fraud indicators.</p>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Quick analysis:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={s.action} disabled={loading}>{s.label}</button>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'16px',marginBottom:'16px'}}>
          <div className="form-group" style={{marginBottom:0}}><label>Reports ({reports.length})</label>
            <select disabled><option>Scanning {reports.length} reports</option>
              {reports.map(r => <option key={r.id}>{r.report_number} - {r.title} (${r.total_amount})</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Vendors ({vendors.length})</label>
            <select disabled><option>Checking {vendors.length} vendors</option>
              {vendors.map(v => <option key={v.id}>{v.name} - Risk: {v.risk_score} {v.is_flagged ? '| FLAGGED' : ''}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Departments ({departments.length})</label>
            <select disabled><option>Across {departments.length} departments</option>
              {departments.map(d => <option key={d.id}>{d.name} - Budget: ${d.budget}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Employees ({employees.length})</label>
            <select disabled><option>{employees.length} employees monitored</option>
              {employees.map(e => <option key={e.id}>{e.full_name} - {e.department_name}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={analyze} disabled={loading}>{loading ? 'Scanning...' : 'Run Anomaly Scan'}</button>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
