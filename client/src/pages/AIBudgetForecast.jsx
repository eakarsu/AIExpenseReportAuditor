import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AIBudgetForecast() {
  const [departments, setDepartments] = useState([])
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => {})
    api.getBudgets().then(setBudgets).catch(() => {})
    api.getCategories().then(setCategories).catch(() => {})
  }, [])

  const analyze = async () => {
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.budgetForecast(); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Full Company Forecast', action: analyze },
    { label: 'Q1 2025 Projection', action: analyze },
    { label: 'Over-Budget Departments', action: analyze },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F4C8}'} AI Budget Forecast</h1><div className="breadcrumb">Predictive budget analytics and recommendations</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <p style={{color:'#64748b',marginBottom:'16px'}}>Analyze current spending trends across all departments and categories to forecast budget utilization, identify risks, and get cost-saving recommendations.</p>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Quick analysis:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={s.action} disabled={loading}>{s.label}</button>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
          <div className="form-group" style={{marginBottom:0}}><label>Departments ({departments.length})</label>
            <select disabled><option>All {departments.length} departments included</option>
              {departments.map(d => <option key={d.id}>{d.name} - Budget: ${d.budget} | Spent: ${d.total_spent}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Budget Entries ({budgets.length})</label>
            <select disabled><option>All {budgets.length} budget limits analyzed</option>
              {budgets.map(b => <option key={b.id}>{b.department_name} / {b.category_name} - ${b.spent_amount}/${b.limit_amount}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={analyze} disabled={loading}>{loading ? 'Forecasting...' : 'Generate Budget Forecast'}</button>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
