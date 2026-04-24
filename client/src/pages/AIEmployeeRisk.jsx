import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AIEmployeeRisk() {
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getEmployees().then(setEmployees).catch(() => {})
    api.getDepartments().then(setDepartments).catch(() => {})
  }, [])

  const analyze = async (id) => {
    const empId = id || selectedId
    if (!empId) return
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.employeeRisk(empId); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Sarah Jones (Developer)', action: () => { const e = employees.find(e2 => e2.full_name === 'Sarah Jones'); if (e) { setSelectedId(String(e.id)); analyze(String(e.id)) } } },
    { label: 'Mike Wilson (Sales)', action: () => { const e = employees.find(e2 => e2.full_name === 'Mike Wilson'); if (e) { setSelectedId(String(e.id)); analyze(String(e.id)) } } },
    { label: 'Lisa Chen (Marketing)', action: () => { const e = employees.find(e2 => e2.full_name === 'Lisa Chen'); if (e) { setSelectedId(String(e.id)); analyze(String(e.id)) } } },
    { label: 'Bob Brown (Finance)', action: () => { const e = employees.find(e2 => e2.full_name === 'Bob Brown'); if (e) { setSelectedId(String(e.id)); analyze(String(e.id)) } } },
    { label: 'Tom Davis (Operations)', action: () => { const e = employees.find(e2 => e2.full_name === 'Tom Davis'); if (e) { setSelectedId(String(e.id)); analyze(String(e.id)) } } },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F464}'} AI Employee Risk Profiling</h1><div className="breadcrumb">Analyze employee spending behavior and risk patterns</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Quick profiles:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={s.action} disabled={loading}>{s.label}</button>)}
        </div>
        <div className="form-group"><label>Select Employee</label>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}><option value="">Choose an employee...</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} - {e.title} ({e.department_name})</option>)}
          </select>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
          <div className="form-group" style={{marginBottom:0}}><label>Filter by Department</label>
            <select onChange={e => { const deptId = e.target.value; if (deptId) { const emp = employees.find(e2 => String(e2.department_id) === deptId); if (emp) setSelectedId(String(emp.id)) } }}>
              <option value="">Filter by department...</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Filter by Title</label>
            <select onChange={e => { const title = e.target.value; if (title) { const emp = employees.find(e2 => e2.title === title); if (emp) setSelectedId(String(emp.id)) } }}>
              <option value="">Filter by job title...</option>
              {[...new Set(employees.map(e => e.title))].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => analyze()} disabled={!selectedId||loading}>{loading ? 'Profiling...' : 'Generate Risk Profile'}</button>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
