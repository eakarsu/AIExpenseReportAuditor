import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AISmartSearch() {
  const [query, setQuery] = useState('')
  const [reports, setReports] = useState([])
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [vendors, setVendors] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getReports().then(setReports).catch(() => {})
    api.getEmployees().then(setEmployees).catch(() => {})
    api.getDepartments().then(setDepartments).catch(() => {})
    api.getVendors().then(setVendors).catch(() => {})
  }, [])

  const search = async (q) => {
    const searchQuery = q || query
    if (!searchQuery.trim()) return
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.smartSearch(searchQuery); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Flagged Expenses Over $500', query: 'Show me all flagged expenses over $500' },
    { label: 'Top Travel Spenders', query: 'Which employees spent the most on travel and transportation?' },
    { label: 'Rejected Reports', query: 'List all rejected expense reports and reasons for rejection' },
    { label: 'Weekend Expenses', query: 'Find any expenses submitted on weekends or holidays' },
    { label: 'Vendor Concentration Risk', query: 'Which vendors have the highest concentration of spending from a single department?' },
    { label: 'Over-Budget Departments', query: 'Which departments are over budget and by how much?' },
    { label: 'Duplicate Patterns', query: 'Are there any potential duplicate expenses or round-number patterns?' },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F50E}'} AI Smart Search</h1><div className="breadcrumb">Search expenses using natural language</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Try a sample query:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={() => { setQuery(s.query); search(s.query) }} disabled={loading}>{s.label}</button>)}
        </div>
        <form onSubmit={e => { e.preventDefault(); search() }}>
          <div className="form-group"><label>Ask anything about expenses</label>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder='e.g. "Show me all flagged expenses over $500" or "Which department spent the most on travel?"' required style={{fontSize:'16px',padding:'14px 16px'}} /></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'16px',marginBottom:'16px'}}>
            <div className="form-group" style={{marginBottom:0}}><label>Reports ({reports.length})</label>
              <select disabled><option>Browse {reports.length} reports</option>
                {reports.map(r => <option key={r.id}>{r.report_number} - {r.title} (${r.total_amount})</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:0}}><label>Employees ({employees.length})</label>
              <select disabled><option>Browse {employees.length} employees</option>
                {employees.map(e => <option key={e.id}>{e.full_name} - {e.department_name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:0}}><label>Departments ({departments.length})</label>
              <select disabled><option>Browse {departments.length} departments</option>
                {departments.map(d => <option key={d.id}>{d.name} - Budget: ${d.budget}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:0}}><label>Vendors ({vendors.length})</label>
              <select disabled><option>Browse {vendors.length} vendors</option>
                {vendors.map(v => <option key={v.id}>{v.name} - Risk: {v.risk_score} {v.is_flagged ? '| FLAGGED' : ''}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
        </form>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
