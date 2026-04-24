import React, { useState, useEffect } from 'react'
import { api } from '../services/api'
import AIResultDisplay from '../components/AIResultDisplay'

export default function AITripPlanner() {
  const [form, setForm] = useState({ destination: '', start_date: '', end_date: '', purpose: '', travelers: 1 })
  const [trips, setTrips] = useState([])
  const [employees, setEmployees] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getTrips().then(setTrips).catch(() => {})
    api.getEmployees().then(setEmployees).catch(() => {})
  }, [])

  const analyze = async (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setResult(null)
    try { const data = await api.tripPlanner(form); setResult(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  const samples = [
    { label: 'Tokyo Conference', data: { destination: 'Tokyo, Japan', start_date: '2025-06-15', end_date: '2025-06-22', purpose: 'Tech conference and partner meetings', travelers: 2 } },
    { label: 'London Sales Trip', data: { destination: 'London, UK', start_date: '2025-05-10', end_date: '2025-05-14', purpose: 'Sales kick-off and client entertainment', travelers: 1 } },
    { label: 'NYC Client Visit', data: { destination: 'New York, NY', start_date: '2025-04-21', end_date: '2025-04-24', purpose: 'Quarterly client review and contract negotiation', travelers: 3 } },
    { label: 'Berlin AI Summit', data: { destination: 'Berlin, Germany', start_date: '2025-07-05', end_date: '2025-07-10', purpose: 'AI/ML research symposium and networking', travelers: 1 } },
    { label: 'Singapore Product Launch', data: { destination: 'Singapore', start_date: '2025-08-12', end_date: '2025-08-17', purpose: 'APAC product launch and press events', travelers: 4 } },
  ]

  return (
    <div>
      <div className="page-header"><div><h1>{'\u{1F5FA}\uFE0F'} AI Trip Budget Planner</h1><div className="breadcrumb">Generate detailed day-by-day trip budgets with AI</div></div></div>
      <div className="detail-card"><div className="detail-body">
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
          <span style={{fontSize:'13px',color:'#64748b',lineHeight:'32px'}}>Load sample trip:</span>
          {samples.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" onClick={() => setForm(s.data)}>{s.label}</button>)}
        </div>
        <form onSubmit={analyze}>
          <div className="form-group"><label>Destination</label><input value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} required placeholder="e.g. Tokyo, Japan" /></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px'}}>
            <div className="form-group"><label>Start Date</label><input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} required /></div>
            <div className="form-group"><label>End Date</label><input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} required /></div>
            <div className="form-group"><label>Travelers</label><input type="number" min="1" value={form.travelers} onChange={e => setForm({...form, travelers: e.target.value})} /></div>
          </div>
          <div className="form-group"><label>Purpose</label><textarea value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} rows={2} placeholder="e.g. Tech conference and partner meetings" /></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
            <div className="form-group" style={{marginBottom:0}}><label>Existing Trip Plans ({trips.length})</label>
              <select onChange={e => { const t = trips.find(t2 => String(t2.id) === e.target.value); if (t) setForm({ destination: t.destination, start_date: t.start_date?.split('T')[0]||'', end_date: t.end_date?.split('T')[0]||'', purpose: t.purpose||'', travelers: 1 }) }}>
                <option value="">Load from existing trip...</option>
                {trips.map(t => <option key={t.id} value={t.id}>{t.destination} - {t.employee_name} ({t.status})</option>)}
              </select>
            </div>
            <div className="form-group" style={{marginBottom:0}}><label>Employees ({employees.length})</label>
              <select disabled><option>Assign traveler from {employees.length} employees</option>
                {employees.map(e => <option key={e.id}>{e.full_name} - {e.title}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Planning...' : 'Generate Trip Budget'}</button>
        </form>
      </div></div>
      <AIResultDisplay result={result} loading={loading} error={error} />
    </div>
  )
}
