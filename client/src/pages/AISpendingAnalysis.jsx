import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AISpendingAnalysis() {
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [employeeId, setEmployeeId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getEmployees().then(setEmployees).catch(() => {})
    api.getDepartments().then(setDepartments).catch(() => {})
  }, [])

  const analyze = async (empId, deptId) => {
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.spendingAnalysis({ employee_id: empId || undefined, department_id: deptId || undefined }); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'All Company Spending', action: () => { setEmployeeId(''); setDepartmentId(''); analyze('', '') } },
    { label: 'Engineering Dept', action: () => { const d = departments.find(d2 => d2.code === 'ENG'); if (d) { setDepartmentId(String(d.id)); setEmployeeId(''); analyze('', String(d.id)) } } },
    { label: 'Sales Dept', action: () => { const d = departments.find(d2 => d2.code === 'SLS'); if (d) { setDepartmentId(String(d.id)); setEmployeeId(''); analyze('', String(d.id)) } } },
    { label: 'Sarah Jones (Developer)', action: () => { const e = employees.find(e2 => e2.full_name === 'Sarah Jones'); if (e) { setEmployeeId(String(e.id)); setDepartmentId(''); analyze(String(e.id), '') } } },
    { label: 'Mike Wilson (Sales)', action: () => { const e = employees.find(e2 => e2.full_name === 'Mike Wilson'); if (e) { setEmployeeId(String(e.id)); setDepartmentId(''); analyze(String(e.id), '') } } },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F9E0}'} AI Spending Analysis</h1><div className="breadcrumb">Pattern analysis, trends, and insights</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <p style={{color:'#64748b',marginBottom:'16px'}}>Analyze spending patterns across employees and departments. Identify anomalies, trends, and optimization opportunities.</p>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Quick analysis:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={s.action} disabled={loading}>{s.label}</button>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
          <div className="form-group" style={{marginBottom:0}}><label>Filter by Employee</label>
            <select value={employeeId} onChange={e => { setEmployeeId(e.target.value); setDepartmentId('') }}>
              <option value="">All employees...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} - {e.title} ({e.department_name})</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Filter by Department</label>
            <select value={departmentId} onChange={e => { setDepartmentId(e.target.value); setEmployeeId('') }}>
              <option value="">All departments...</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code}) - Budget: ${d.budget}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => analyze(employeeId, departmentId)} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze Spending Patterns'}</button>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
