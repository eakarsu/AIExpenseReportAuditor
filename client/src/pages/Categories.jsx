import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function Categories() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', description: '', max_amount: '', requires_receipt: true })

  const load = () => api.getCategories().then(setItems).finally(() => setLoading(false))
  useEffect(() => { load() }, [])
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const handleCreate = async (e) => { e.preventDefault(); await api.createCategory(form); setShowModal(false); setForm({ name: '', code: '', description: '', max_amount: '', requires_receipt: true }); load() }
  const handleEdit = async (e) => { e.preventDefault(); await api.updateCategory(editing.id, editing); setEditing(null); load() }
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await api.deleteCategory(id); setSelected(null); load() }

  if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>
  return (
    <div>
      <div className="page-header"><div><h1>Expense Categories</h1><div className="breadcrumb">Manage expense categories and limits</div></div><button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Category</button></div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Code</th><th>Max Amount</th><th>Receipt Required</th><th>Usage Count</th><th>Total Spent</th><th>Status</th></tr></thead>
          <tbody>{items.map(i => (
            <tr key={i.id} onClick={() => setSelected(i)}><td><strong>{i.name}</strong></td><td>{i.code}</td><td className="amount">{i.max_amount ? fmt(i.max_amount) : '-'}</td><td>{i.requires_receipt ? '\u2705' : '\u274C'}</td><td>{i.usage_count}</td><td className="amount">{fmt(i.total_spent)}</td><td><span className={`status-badge ${i.is_active ? 'status-approved' : 'status-draft'}`}>{i.is_active ? 'Active' : 'Inactive'}</span></td></tr>
          ))}</tbody>
        </table>
      </div>

      {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>{selected.name}</h2><button className="btn btn-ghost" onClick={() => setSelected(null)}>{'\u2715'}</button></div>
        <div className="modal-body"><div className="detail-grid">
          <div className="detail-field"><label>Code</label><div className="value">{selected.code}</div></div>
          <div className="detail-field"><label>Max Amount</label><div className="value">{selected.max_amount ? fmt(selected.max_amount) : 'No limit'}</div></div>
          <div className="detail-field"><label>Receipt Required</label><div className="value">{selected.requires_receipt ? 'Yes' : 'No'}</div></div>
          <div className="detail-field"><label>Usage Count</label><div className="value">{selected.usage_count}</div></div>
          <div className="detail-field"><label>Total Spent</label><div className="value amount">{fmt(selected.total_spent)}</div></div>
          <div className="detail-field"><label>Status</label><div className="value">{selected.is_active ? 'Active' : 'Inactive'}</div></div>
        </div>{selected.description && <p style={{marginTop:'16px',color:'#64748b'}}>{selected.description}</p>}</div>
        <div className="modal-footer"><button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button><button className="btn btn-primary btn-sm" onClick={() => { setEditing({...selected}); setSelected(null) }}>Edit</button></div>
      </div></div>}

      {showModal && <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>New Category</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}>{'\u2715'}</button></div>
        <form onSubmit={handleCreate}><div className="modal-body">
          <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div className="form-group"><label>Code</label><input value={form.code} onChange={e => setForm({...form, code: e.target.value})} required placeholder="e.g. AIR" /></div>
          <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
          <div className="form-group"><label>Max Amount ($)</label><input type="number" step="0.01" value={form.max_amount} onChange={e => setForm({...form, max_amount: e.target.value})} /></div>
          <div className="form-group"><label><input type="checkbox" checked={form.requires_receipt} onChange={e => setForm({...form, requires_receipt: e.target.checked})} style={{width:'auto',marginRight:'8px'}} />Requires Receipt</label></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div></form>
      </div></div>}

      {editing && <div className="modal-overlay" onClick={() => setEditing(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Edit Category</h2><button className="btn btn-ghost" onClick={() => setEditing(null)}>{'\u2715'}</button></div>
        <form onSubmit={handleEdit}><div className="modal-body">
          <div className="form-group"><label>Name</label><input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} required /></div>
          <div className="form-group"><label>Code</label><input value={editing.code} onChange={e => setEditing({...editing, code: e.target.value})} required /></div>
          <div className="form-group"><label>Description</label><textarea value={editing.description||''} onChange={e => setEditing({...editing, description: e.target.value})} rows={2} /></div>
          <div className="form-group"><label>Max Amount ($)</label><input type="number" step="0.01" value={editing.max_amount||''} onChange={e => setEditing({...editing, max_amount: e.target.value})} /></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div></form>
      </div></div>}
    </div>
  )
}
