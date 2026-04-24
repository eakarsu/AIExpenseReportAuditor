import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function Vendors() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', category: '', is_preferred: false, address: '', contact_email: '' })

  const load = () => api.getVendors().then(setItems).finally(() => setLoading(false))
  useEffect(() => { load() }, [])
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const handleCreate = async (e) => { e.preventDefault(); await api.createVendor(form); setShowModal(false); setForm({ name: '', category: '', is_preferred: false, address: '', contact_email: '' }); load() }
  const handleEdit = async (e) => { e.preventDefault(); await api.updateVendor(editing.id, editing); setEditing(null); load() }
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await api.deleteVendor(id); setSelected(null); load() }

  if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>
  return (
    <div>
      <div className="page-header"><div><h1>Vendors</h1><div className="breadcrumb">Manage vendors and risk scores</div></div><button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Vendor</button></div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Category</th><th>Risk Score</th><th>Transactions</th><th>Total Amount</th><th>Preferred</th><th>Flagged</th></tr></thead>
          <tbody>{items.map(i => (
            <tr key={i.id} onClick={() => setSelected(i)} style={i.is_flagged ? {background:'#fef2f2'} : {}}>
              <td><strong>{i.name}</strong></td><td>{i.category||'-'}</td>
              <td><span className={i.risk_score >= 7 ? 'risk-high' : i.risk_score >= 4 ? 'risk-medium' : 'risk-low'} style={{fontWeight:700}}>{i.risk_score}</span></td>
              <td>{i.total_transactions}</td><td className="amount">{fmt(i.total_amount)}</td>
              <td>{i.is_preferred ? '\u2B50' : '-'}</td><td>{i.is_flagged ? '\u{1F6A9}' : '-'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>{selected.name}</h2><button className="btn btn-ghost" onClick={() => setSelected(null)}>{'\u2715'}</button></div>
        <div className="modal-body"><div className="detail-grid">
          <div className="detail-field"><label>Category</label><div className="value">{selected.category||'-'}</div></div>
          <div className="detail-field"><label>Risk Score</label><div className={`value ${selected.risk_score>=7?'risk-high':selected.risk_score>=4?'risk-medium':'risk-low'}`} style={{fontSize:'24px',fontWeight:700}}>{selected.risk_score}/10</div></div>
          <div className="detail-field"><label>Total Transactions</label><div className="value">{selected.total_transactions}</div></div>
          <div className="detail-field"><label>Total Amount</label><div className="value amount">{fmt(selected.total_amount)}</div></div>
          <div className="detail-field"><label>Preferred</label><div className="value">{selected.is_preferred?'Yes':'No'}</div></div>
          <div className="detail-field"><label>Flagged</label><div className="value">{selected.is_flagged?'Yes':'No'}</div></div>
        </div>
        {selected.address && <p style={{marginTop:'16px',color:'#64748b'}}>Address: {selected.address}</p>}
        {selected.contact_email && <p style={{color:'#64748b'}}>Email: {selected.contact_email}</p>}
        {selected.is_flagged && <div className="error-msg mt-16">{'\u26A0\uFE0F'} This vendor has been flagged for review</div>}
        </div>
        <div className="modal-footer"><button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button><button className="btn btn-primary btn-sm" onClick={() => { setEditing({...selected}); setSelected(null) }}>Edit</button></div>
      </div></div>}

      {showModal && <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>New Vendor</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}>{'\u2715'}</button></div>
        <form onSubmit={handleCreate}><div className="modal-body">
          <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div className="form-group"><label>Category</label><input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Airline, Hotel" /></div>
          <div className="form-group"><label>Address</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
          <div className="form-group"><label>Contact Email</label><input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} /></div>
          <div className="form-group"><label><input type="checkbox" checked={form.is_preferred} onChange={e => setForm({...form, is_preferred: e.target.checked})} style={{width:'auto',marginRight:'8px'}} />Preferred Vendor</label></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div></form>
      </div></div>}

      {editing && <div className="modal-overlay" onClick={() => setEditing(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Edit Vendor</h2><button className="btn btn-ghost" onClick={() => setEditing(null)}>{'\u2715'}</button></div>
        <form onSubmit={handleEdit}><div className="modal-body">
          <div className="form-group"><label>Name</label><input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} required /></div>
          <div className="form-group"><label>Category</label><input value={editing.category||''} onChange={e => setEditing({...editing, category: e.target.value})} /></div>
          <div className="form-group"><label>Address</label><input value={editing.address||''} onChange={e => setEditing({...editing, address: e.target.value})} /></div>
          <div className="form-group"><label>Contact Email</label><input value={editing.contact_email||''} onChange={e => setEditing({...editing, contact_email: e.target.value})} /></div>
          <div className="form-group"><label><input type="checkbox" checked={editing.is_preferred||false} onChange={e => setEditing({...editing, is_preferred: e.target.checked})} style={{width:'auto',marginRight:'8px'}} />Preferred</label></div>
          <div className="form-group"><label><input type="checkbox" checked={editing.is_flagged||false} onChange={e => setEditing({...editing, is_flagged: e.target.checked})} style={{width:'auto',marginRight:'8px'}} />Flagged</label></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div></form>
      </div></div>}
    </div>
  )
}
