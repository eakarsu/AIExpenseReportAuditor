import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AIReceiptAnalysis() {
  const [form, setForm] = useState({ receipt_text: '', vendor_name: '', amount: '' })
  const [vendors, setVendors] = useState([])
  const [categories, setCategories] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getVendors().then(setVendors).catch(() => {})
    api.getCategories().then(setCategories).catch(() => {})
  }, [])

  const analyze = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.receiptAnalysis(form); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Restaurant Dinner', data: { receipt_text: 'The Capital Grille\n1234 Main St, New York, NY\nDate: 03/15/2025\nTable 12, Server: Mike\n2x Filet Mignon $52.00 each = $104.00\n1x Lobster Tail $68.00\n2x House Salad $14.00 each = $28.00\n1x Bottle Opus One 2019 $385.00\nSubtotal: $585.00\nTax (8.875%): $51.91\nTip (20%): $117.00\nTotal: $753.91\nVisa ending 4521', vendor_name: 'The Capital Grille', amount: '753.91' } },
    { label: 'Hotel Stay', data: { receipt_text: 'Hilton Midtown NYC\nCheck-in: 03/12/2025, Check-out: 03/15/2025\nRoom 1412 - King Deluxe\n3 nights @ $289/night = $867.00\nRoom Service: $45.50\nMinibar: $32.00\nParking (3 days): $150.00\nResort Fee: $45.00/night = $135.00\nSubtotal: $1,229.50\nTax (14.75%): $181.35\nTotal: $1,410.85\nPaid: Corporate Amex ending 8832', vendor_name: 'Hilton Hotels', amount: '1410.85' } },
    { label: 'Uber Rides', data: { receipt_text: 'Uber Technologies\nTrip Summary - March 2025\nTrip 1: JFK Airport to Hilton Midtown, 03/12 - $67.50\nTrip 2: Hilton to Client Office, 03/13 - $18.75\nTrip 3: Client Office to Restaurant, 03/13 - $22.30\nTrip 4: Restaurant to Hotel, 03/13 - $15.00\nTrip 5: Hotel to LaGuardia, 03/15 - $52.80\nTotal: $176.35', vendor_name: 'Uber Technologies', amount: '176.35' } },
    { label: 'Office Supplies', data: { receipt_text: 'Staples Business #4521\n555 Commerce Blvd\nDate: 03/18/2025\n2x HP LaserJet Toner $89.99 ea = $179.98\n5x Reams Copy Paper $12.99 ea = $64.95\n1x Ergonomic Keyboard $149.99\n3x USB-C Cables $15.99 ea = $47.97\nSubtotal: $442.89\nTax (6%): $26.57\nTotal: $469.46', vendor_name: 'Staples', amount: '469.46' } },
    { label: 'Suspicious Receipt', data: { receipt_text: 'Cash Receipt\nNo business name\nDate: unclear, possibly March 2025\nConsulting services rendered\nAmount: $2,500.00\nPaid in cash\nNo itemization provided\nHandwritten receipt, partially illegible', vendor_name: '', amount: '2500.00' } },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F9FE}'} AI Receipt Analyzer</h1><div className="breadcrumb">Extract and validate receipt information</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Load sample receipt:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={() => setForm(s.data)}>{s.label}</button>)}
        </div>
        <form onSubmit={analyze}>
          <div className="form-group"><label>Receipt Description / Text</label>
            <textarea value={form.receipt_text} onChange={e => setForm({...form, receipt_text: e.target.value})} rows={4} required
              placeholder="Paste receipt text or describe the receipt. e.g.: Restaurant XYZ, 2 steaks $45 each, 1 bottle wine $65, tax $12.35, tip $25, total $192.35, paid with Visa ending 4521" /></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div className="form-group"><label>Vendor Name</label>
              <input list="vendor-list" value={form.vendor_name} onChange={e => setForm({...form, vendor_name: e.target.value})} placeholder="e.g. Restaurant XYZ" />
              <datalist id="vendor-list">{vendors.map(v => <option key={v.id} value={v.name} />)}</datalist>
            </div>
            <div className="form-group"><label>Claimed Amount ($)</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="e.g. 192.35" /></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
            <div className="form-group" style={{marginBottom:0}}><label>Known Vendors ({vendors.length})</label>
              <select onChange={e => { if (e.target.value) setForm({...form, vendor_name: e.target.value}) }}><option value="">Select from known vendors...</option>
                {vendors.map(v => <option key={v.id} value={v.name}>{v.name} | Risk: {v.risk_score} {v.is_flagged ? '| FLAGGED' : ''}</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:0}}><label>Categories ({categories.length})</label>
              <select disabled><option>AI will match to {categories.length} categories</option>
                {categories.map(c => <option key={c.id}>{c.name} ({c.code}) - Max: ${c.max_amount || 'No limit'}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Analyzing...' : 'Analyze Receipt'}</button>
        </form>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
