import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function TripPlans() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ employee_id: 1, destination: '', purpose: '', start_date: '', end_date: '', estimated_budget: '' })

  const load = () => api.getTrips().then(setItems).finally(() => setLoading(false))
  useEffect(() => { load() }, [])
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)

  const handleCreate = async (e) => { e.preventDefault(); await api.createTrip(form); setShowModal(false); setForm({ employee_id: 1, destination: '', purpose: '', start_date: '', end_date: '', estimated_budget: '' }); load() }
  const handleEdit = async (e) => { e.preventDefault(); await api.updateTrip(editing.id, editing); setEditing(null); load() }
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await api.deleteTrip(id); setSelected(null); load() }

  if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>
  return (
    <div>
      <div className="page-header"><div><h1>Trip Plans</h1><div className="breadcrumb">Business trip planning and budgets</div></div><button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Trip</button></div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Destination</th><th>Employee</th><th>Purpose</th><th>Dates</th><th>Est. Budget</th><th>Status</th></tr></thead>
          <tbody>{items.map(i => (
            <tr key={i.id} onClick={() => setSelected(i)}><td><strong>{i.destination}</strong></td><td>{i.employee_name}</td><td>{i.purpose ? (i.purpose.length > 40 ? i.purpose.slice(0,40)+'...' : i.purpose) : '-'}</td>
              <td>{new Date(i.start_date).toLocaleDateString()} - {new Date(i.end_date).toLocaleDateString()}</td>
              <td className="amount">{i.estimated_budget ? fmt(i.estimated_budget) : '-'}</td>
              <td><span className={`status-badge status-${i.status}`}>{i.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:'700px'}}>
        <div className="modal-header"><h2>{selected.destination}</h2><button className="btn btn-ghost" onClick={() => setSelected(null)}>{'\u2715'}</button></div>
        <div className="modal-body"><div className="detail-grid">
          <div className="detail-field"><label>Employee</label><div className="value">{selected.employee_name}</div></div>
          <div className="detail-field"><label>Destination</label><div className="value">{selected.destination}</div></div>
          <div className="detail-field"><label>Dates</label><div className="value">{new Date(selected.start_date).toLocaleDateString()} - {new Date(selected.end_date).toLocaleDateString()}</div></div>
          <div className="detail-field"><label>Est. Budget</label><div className="value amount" style={{fontSize:'20px'}}>{selected.estimated_budget ? fmt(selected.estimated_budget) : '-'}</div></div>
          <div className="detail-field"><label>Status</label><div className="value"><span className={`status-badge status-${selected.status}`}>{selected.status}</span></div></div>
        </div>
        {selected.purpose && <p style={{marginTop:'16px',color:'#64748b'}}>Purpose: {selected.purpose}</p>}
        {selected.daily_breakdown && <div style={{marginTop:'16px'}}>
          <h3 style={{fontSize:'16px',fontWeight:700,marginBottom:'12px'}}>Daily Breakdown</h3>
          {(Array.isArray(selected.daily_breakdown) ? selected.daily_breakdown : []).map((day, idx) => (
            <div key={idx} style={{padding:'12px',marginBottom:'8px',background:'#f8fafc',borderRadius:'8px',border:'1px solid #e2e8f0'}}>
              <div className="flex-between"><strong>Day {day.day} - {day.date}</strong><span className="amount">{fmt(day.items?.reduce((s,i)=>s+i.amount,0)||0)}</span></div>
              <div style={{marginTop:'6px',display:'flex',flexWrap:'wrap',gap:'8px'}}>{(day.items||[]).map((item,i) => (
                <span key={i} style={{fontSize:'12px',background:'white',padding:'3px 8px',borderRadius:'4px',border:'1px solid #e2e8f0'}}>{item.type}: {fmt(item.amount)}</span>
              ))}</div>
            </div>
          ))}
        </div>}
        </div>
        <div className="modal-footer"><button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button><button className="btn btn-primary btn-sm" onClick={() => { setEditing({...selected}); setSelected(null) }}>Edit</button></div>
      </div></div>}

      {showModal && <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>New Trip Plan</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}>{'\u2715'}</button></div>
        <form onSubmit={handleCreate}><div className="modal-body">
          <div className="form-group"><label>Destination</label><input value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} required placeholder="e.g. Tokyo, Japan" /></div>
          <div className="form-group"><label>Purpose</label><textarea value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} rows={2} placeholder="Business purpose of the trip" /></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div className="form-group"><label>Start Date</label><input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} required /></div>
            <div className="form-group"><label>End Date</label><input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} required /></div>
          </div>
          <div className="form-group"><label>Estimated Budget ($)</label><input type="number" value={form.estimated_budget} onChange={e => setForm({...form, estimated_budget: e.target.value})} /></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div></form>
      </div></div>}

      {editing && <div className="modal-overlay" onClick={() => setEditing(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Edit Trip</h2><button className="btn btn-ghost" onClick={() => setEditing(null)}>{'\u2715'}</button></div>
        <form onSubmit={handleEdit}><div className="modal-body">
          <div className="form-group"><label>Destination</label><input value={editing.destination} onChange={e => setEditing({...editing, destination: e.target.value})} required /></div>
          <div className="form-group"><label>Purpose</label><textarea value={editing.purpose||''} onChange={e => setEditing({...editing, purpose: e.target.value})} rows={2} /></div>
          <div className="form-group"><label>Estimated Budget ($)</label><input type="number" value={editing.estimated_budget||''} onChange={e => setEditing({...editing, estimated_budget: e.target.value})} /></div>
          <div className="form-group"><label>Status</label><select value={editing.status} onChange={e => setEditing({...editing, status: e.target.value})}><option>planned</option><option>approved</option><option>completed</option><option>cancelled</option></select></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div></form>
      </div></div>}
    </div>
  )
}
