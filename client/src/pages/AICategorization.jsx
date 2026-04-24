import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AICategorization() {
  const [form, setForm] = useState({ description: '', amount: '', vendor_name: '' })
  const [categories, setCategories] = useState([])
  const [vendors, setVendors] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {})
    api.getVendors().then(setVendors).catch(() => {})
  }, [])

  const analyze = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.categorizeExpense(form); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Team Dinner', data: { description: 'Team dinner at STK Steakhouse for 4 people', amount: '285.75', vendor_name: 'STK Steakhouse' } },
    { label: 'Flight Booking', data: { description: 'Round-trip flight SFO to JFK economy plus', amount: '680.00', vendor_name: 'Delta Airlines' } },
    { label: 'Hotel Stay', data: { description: 'Hilton Midtown NYC 4 nights for client meetings', amount: '1560.00', vendor_name: 'Hilton Hotels' } },
    { label: 'Software License', data: { description: 'Annual Figma team license renewal', amount: '450.00', vendor_name: 'Figma Inc' } },
    { label: 'Uber Rides', data: { description: 'Uber rides to conference venue and airport transfers', amount: '87.00', vendor_name: 'Uber Technologies' } },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F916}'} AI Smart Categorization</h1><div className="breadcrumb">Automatically categorize expenses using AI</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Load sample:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={() => setForm(s.data)}>{s.label}</button>)}
        </div>
        <form onSubmit={analyze}>
          <div className="form-group"><label>Expense Description</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} required placeholder="e.g. Team dinner at Italian restaurant" /></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div className="form-group"><label>Amount ($)</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="e.g. 250.00" /></div>
            <div className="form-group"><label>Vendor Name</label>
              <input list="vendor-list" value={form.vendor_name} onChange={e => setForm({...form, vendor_name: e.target.value})} placeholder="e.g. Olive Garden" />
              <datalist id="vendor-list">{vendors.map(v => <option key={v.id} value={v.name} />)}</datalist>
            </div>
          </div>
          <div className="form-group"><label>Available Categories ({categories.length})</label>
            <select disabled><option>AI will suggest from {categories.length} categories</option>
              {categories.map(c => <option key={c.id}>{c.name} ({c.code}) - Max: ${c.max_amount || 'No limit'}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Categorizing...' : 'Categorize Expense'}</button>
        </form>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
