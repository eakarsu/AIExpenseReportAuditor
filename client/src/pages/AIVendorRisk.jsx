import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AIVendorRisk() {
  const [vendors, setVendors] = useState([])
  const [reports, setReports] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getVendors().then(setVendors).catch(() => {})
    api.getReports().then(setReports).catch(() => {})
  }, [])

  const analyze = async () => {
    if (!selectedId) return
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.vendorRisk(selectedId); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Shadyville Corp (FLAGGED)', id: () => vendors.find(v => v.name === 'Shadyville Corp')?.id },
    { label: 'Quick Cash Services (FLAGGED)', id: () => vendors.find(v => v.name === 'Quick Cash Services')?.id },
    { label: 'The Ritz-Carlton (High Cost)', id: () => vendors.find(v => v.name === 'The Ritz-Carlton')?.id },
    { label: 'United Airlines (Preferred)', id: () => vendors.find(v => v.name === 'United Airlines')?.id },
    { label: 'Local Diner XYZ (Many Txns)', id: () => vendors.find(v => v.name === 'Local Diner XYZ')?.id },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u26A0\uFE0F'} AI Vendor Risk Assessment</h1><div className="breadcrumb">AI-powered vendor risk analysis</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <div className="form-group"><label>Select Vendor</label>
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">Choose a vendor...</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name} | Risk: {v.risk_score} | Txns: {v.total_transactions} | ${v.total_amount} {v.is_flagged ? '| FLAGGED' : ''} {v.is_preferred ? '| Preferred' : ''}</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Quick samples:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={() => { const id = s.id(); if (id) setSelectedId(String(id)) }}>{s.label}</button>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
          <div className="form-group" style={{marginBottom:0}}><label>Filter by Category</label>
            <select onChange={e => { const cat = e.target.value; if (cat) { const v = vendors.find(v2 => v2.category === cat); if (v) setSelectedId(String(v.id)) } }}>
              <option value="">Filter by vendor category...</option>
              {[...new Set(vendors.map(v => v.category).filter(Boolean))].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:0}}><label>Filter by Risk Level</label>
            <select onChange={e => { const lvl = e.target.value; if (lvl === 'high') { const v = vendors.find(v2 => v2.risk_score >= 7); if (v) setSelectedId(String(v.id)) } else if (lvl === 'medium') { const v = vendors.find(v2 => v2.risk_score >= 3 && v2.risk_score < 7); if (v) setSelectedId(String(v.id)) } else if (lvl === 'low') { const v = vendors.find(v2 => v2.risk_score < 3); if (v) setSelectedId(String(v.id)) } }}>
              <option value="">Filter by risk level...</option>
              <option value="high">High Risk (7+)</option>
              <option value="medium">Medium Risk (3-6.9)</option>
              <option value="low">Low Risk (0-2.9)</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" onClick={analyze} disabled={!selectedId||loading}>{loading ? 'Assessing...' : 'Assess Vendor Risk'}</button>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
