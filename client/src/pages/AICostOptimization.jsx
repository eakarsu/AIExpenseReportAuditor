import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AICostOptimization() {
  const [vendors, setVendors] = useState([])
  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getVendors().then(setVendors).catch(() => {})
    api.getDepartments().then(setDepartments).catch(() => {})
    api.getCategories().then(setCategories).catch(() => {})
    api.getBudgets().then(setBudgets).catch(() => {})
  }, [])

  const analyze = async () => {
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.costOptimization(); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Full Cost Analysis', action: analyze },
    { label: 'Vendor Consolidation', action: analyze },
    { label: 'Category Optimization', action: analyze },
    { label: 'ROI Opportunities', action: analyze },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F4B2}'} AI Cost Optimization</h1><div className="breadcrumb">Find savings opportunities across all spending</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <p style={{color:'#64748b',marginBottom:'16px'}}>Analyze vendor usage, category spending, and department budgets to identify cost-saving opportunities. Get vendor consolidation, preferred vendor adoption, and process improvement recommendations with estimated ROI.</p>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Quick analysis:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={s.action} disabled={loading}>{s.label}</button>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'16px',marginBottom:'16px'}}>
          <div className="form-group" style={{marginBottom:0}}><label>Vendors ({vendors.length})</label>
            <select disabled><option>Analyzing {vendors.length} vendors</option>
              {vendors.map(v => <option key={v.id}>{v.name} | ${v.total_amount} | {v.total_transactions} txns {v.is_preferred ? '| Preferred' : ''}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Departments ({departments.length})</label>
            <select disabled><option>{departments.length} dept budgets reviewed</option>
              {departments.map(d => <option key={d.id}>{d.name} - Budget: ${d.budget} | Spent: ${d.total_spent}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Categories ({categories.length})</label>
            <select disabled><option>{categories.length} spending categories</option>
              {categories.map(c => <option key={c.id}>{c.name} ({c.code}) - Max: ${c.max_amount || 'No limit'}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Budgets ({budgets.length})</label>
            <select disabled><option>{budgets.length} budget limits checked</option>
              {budgets.map(b => <option key={b.id}>{b.department_name} / {b.category_name} - ${b.spent_amount}/${b.limit_amount}</option>)}
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={analyze} disabled={loading}>{loading ? 'Optimizing...' : 'Find Cost Savings'}</button>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
