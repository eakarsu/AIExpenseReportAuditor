import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AIDepartmentBenchmark() {
  const [departments, setDepartments] = useState([])
  const [budgets, setBudgets] = useState([])
  const [employees, setEmployees] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => {})
    api.getBudgets().then(setBudgets).catch(() => {})
    api.getEmployees().then(setEmployees).catch(() => {})
  }, [])

  const analyze = async () => {
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.departmentBenchmark(); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Full Benchmark Analysis', action: analyze },
    { label: 'Spending Efficiency', action: analyze },
    { label: 'Budget Utilization', action: analyze },
    { label: 'Compliance Comparison', action: analyze },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F3C6}'} AI Department Benchmarking</h1><div className="breadcrumb">Compare department spending efficiency and compliance</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <p style={{color:'#64748b',marginBottom:'16px'}}>Compare all departments against each other on spending efficiency, policy compliance, budget utilization, and best practices. Identify outliers and opportunities for improvement.</p>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Quick analysis:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={s.action} disabled={loading}>{s.label}</button>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px',marginBottom:'16px'}}>
          <div className="form-group" style={{marginBottom:0}}><label>Departments ({departments.length})</label>
            <select disabled><option>All {departments.length} departments benchmarked</option>
              {departments.map(d => <option key={d.id}>{d.name} ({d.code}) - Budget: ${d.budget} | Spent: ${d.total_spent}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Budget Entries ({budgets.length})</label>
            <select disabled><option>All {budgets.length} budgets analyzed</option>
              {budgets.map(b => <option key={b.id}>{b.department_name} / {b.category_name} - ${b.spent_amount}/${b.limit_amount}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Employees ({employees.length})</label>
            <select disabled><option>{employees.length} employees across departments</option>
              {employees.map(e => <option key={e.id}>{e.full_name} - {e.title} ({e.department_name})</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={analyze} disabled={loading}>{loading ? 'Benchmarking...' : 'Run Department Benchmark'}</button>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
