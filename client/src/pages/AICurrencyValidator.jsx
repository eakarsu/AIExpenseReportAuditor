import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AICurrencyValidator() {
  const [form, setForm] = useState({ amount: '', from_currency: 'EUR', to_currency: 'USD', expense_date: '', description: '' })
  const [vendors, setVendors] = useState([])
  const [trips, setTrips] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currencies = ['USD','EUR','GBP','JPY','CAD','AUD','CHF','CNY','INR','SGD','HKD','KRW','BRL','MXN','AED','THB','SEK','NOK','DKK','NZD']

  useEffect(() => {
    api.getVendors().then(setVendors).catch(() => {})
    api.getTrips().then(setTrips).catch(() => {})
  }, [])

  const analyze = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.currencyValidator(form); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Tokyo Hotel (JPY)', data: { amount: '45000', from_currency: 'JPY', to_currency: 'USD', expense_date: '2025-06-18', description: 'Hotel stay in Tokyo for conference' } },
    { label: 'London Dinner (GBP)', data: { amount: '185.50', from_currency: 'GBP', to_currency: 'USD', expense_date: '2025-05-12', description: 'Client dinner at The Ivy, London' } },
    { label: 'Berlin Transport (EUR)', data: { amount: '342.00', from_currency: 'EUR', to_currency: 'USD', expense_date: '2025-07-07', description: 'Train tickets and taxi fares in Berlin' } },
    { label: 'Singapore Conference (SGD)', data: { amount: '2800.00', from_currency: 'SGD', to_currency: 'USD', expense_date: '2025-08-14', description: 'APAC conference registration and materials' } },
    { label: 'Brazil Office Supplies (BRL)', data: { amount: '1250.00', from_currency: 'BRL', to_currency: 'USD', expense_date: '2025-04-10', description: 'Office supplies for Sao Paulo branch' } },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F4B1}'} AI Currency Converter & Validator</h1><div className="breadcrumb">Convert and validate foreign currency expenses</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Load sample:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={() => setForm(s.data)}>{s.label}</button>)}
        </div>
        <form onSubmit={analyze}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px'}}>
            <div className="form-group"><label>Amount</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required placeholder="e.g. 1500.00" /></div>
            <div className="form-group"><label>From Currency</label><select value={form.from_currency} onChange={e => setForm({...form, from_currency: e.target.value})}>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="form-group"><label>To Currency</label><select value={form.to_currency} onChange={e => setForm({...form, to_currency: e.target.value})}>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div className="form-group"><label>Expense Date</label><input type="date" value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} /></div>
            <div className="form-group"><label>Description</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. Hotel in Tokyo" /></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
            <div className="form-group" style={{marginBottom:0}}><label>International Vendors ({vendors.filter(v => v.category).length})</label>
              <select onChange={e => { if (e.target.value) setForm({...form, description: e.target.value + ' expense'}) }}>
                <option value="">Reference vendor for context...</option>
                {vendors.map(v => <option key={v.id} value={v.name}>{v.name} | ${v.total_amount} | {v.category || 'Uncategorized'}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:0}}><label>International Trips ({trips.length})</label>
              <select onChange={e => { const t = trips.find(t2 => String(t2.id) === e.target.value); if (t) setForm({...form, description: 'Expense during trip to ' + t.destination, expense_date: t.start_date?.split('T')[0] || ''}) }}>
                <option value="">Reference trip for context...</option>
                {trips.map(t => <option key={t.id} value={t.id}>{t.destination} - {t.employee_name} ({t.status})</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Converting...' : 'Convert & Validate'}</button>
        </form>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
