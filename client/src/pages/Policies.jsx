import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function Policies() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', category: '', rule_type: 'amount_limit', condition_field: '', condition_operator: '', condition_value: '', action_type: 'flag', severity: 'warning', description: '' })

  const load = () => api.getPolicies().then(setItems).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleCreate = async (e) => { e.preventDefault(); await api.createPolicy(form); setShowModal(false); setForm({ name: '', category: '', rule_type: 'amount_limit', condition_field: '', condition_operator: '', condition_value: '', action_type: 'flag', severity: 'warning', description: '' }); load() }
  const handleEdit = async (e) => { e.preventDefault(); await api.updatePolicy(editing.id, editing); setEditing(null); load() }
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await api.deletePolicy(id); setSelected(null); load() }

  const sevColor = { critical: '#ef4444', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' }

  if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>
  return (
    <div>
      <div className="page-header"><div><h1>Policy Rules</h1><div className="breadcrumb">Manage compliance rules and thresholds</div></div><button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Policy</button></div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Category</th><th>Rule Type</th><th>Condition</th><th>Action</th><th>Severity</th><th>Active</th></tr></thead>
          <tbody>{items.map(i => (
            <tr key={i.id} onClick={() => setSelected(i)}>
              <td><strong>{i.name}</strong></td><td>{i.category}</td><td>{i.rule_type}</td>
              <td style={{fontSize:'13px'}}>{i.condition_field} {i.condition_operator} {i.condition_value}</td>
              <td>{i.action_type}</td>
              <td><span style={{color: sevColor[i.severity]||'#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '12px'}}>{i.severity}</span></td>
              <td>{i.is_active ? '\u2705' : '\u274C'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>{selected.name}</h2><button className="btn btn-ghost" onClick={() => setSelected(null)}>{'\u2715'}</button></div>
        <div className="modal-body"><div className="detail-grid">
          <div className="detail-field"><label>Category</label><div className="value">{selected.category}</div></div>
          <div className="detail-field"><label>Rule Type</label><div className="value">{selected.rule_type}</div></div>
          <div className="detail-field"><label>Condition</label><div className="value">{selected.condition_field} {selected.condition_operator} {selected.condition_value}</div></div>
          <div className="detail-field"><label>Action</label><div className="value">{selected.action_type}</div></div>
          <div className="detail-field"><label>Severity</label><div className="value" style={{color:sevColor[selected.severity],fontWeight:700}}>{selected.severity}</div></div>
          <div className="detail-field"><label>Active</label><div className="value">{selected.is_active?'Yes':'No'}</div></div>
        </div>{selected.description && <p style={{marginTop:'16px',color:'#64748b'}}>{selected.description}</p>}</div>
        <div className="modal-footer"><button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button><button className="btn btn-primary btn-sm" onClick={() => { setEditing({...selected}); setSelected(null) }}>Edit</button></div>
      </div></div>}

      {showModal && <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>New Policy Rule</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}>{'\u2715'}</button></div>
        <form onSubmit={handleCreate}><div className="modal-body">
          <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div className="form-group"><label>Category</label><input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="All, Meals, Hotel..." /></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            <div className="form-group"><label>Rule Type</label><select value={form.rule_type} onChange={e => setForm({...form, rule_type: e.target.value})}><option>amount_limit</option><option>receipt_check</option><option>date_check</option><option>duplicate</option><option>vendor_check</option><option>category_check</option><option>frequency_check</option><option>rate_check</option><option>approval_check</option></select></div>
            <div className="form-group"><label>Action</label><select value={form.action_type} onChange={e => setForm({...form, action_type: e.target.value})}><option>flag</option><option>block</option><option>escalate</option></select></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'16px'}}>
            <div className="form-group"><label>Field</label><input value={form.condition_field} onChange={e => setForm({...form, condition_field: e.target.value})} /></div>
            <div className="form-group"><label>Operator</label><input value={form.condition_operator} onChange={e => setForm({...form, condition_operator: e.target.value})} /></div>
            <div className="form-group"><label>Value</label><input value={form.condition_value} onChange={e => setForm({...form, condition_value: e.target.value})} /></div>
          </div>
          <div className="form-group"><label>Severity</label><select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}><option>info</option><option>warning</option><option>error</option><option>critical</option></select></div>
          <div className="form-group"><label>Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} /></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div></form>
      </div></div>}

      {editing && <div className="modal-overlay" onClick={() => setEditing(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Edit Policy</h2><button className="btn btn-ghost" onClick={() => setEditing(null)}>{'\u2715'}</button></div>
        <form onSubmit={handleEdit}><div className="modal-body">
          <div className="form-group"><label>Name</label><input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} required /></div>
          <div className="form-group"><label>Category</label><input value={editing.category||''} onChange={e => setEditing({...editing, category: e.target.value})} /></div>
          <div className="form-group"><label>Severity</label><select value={editing.severity} onChange={e => setEditing({...editing, severity: e.target.value})}><option>info</option><option>warning</option><option>error</option><option>critical</option></select></div>
          <div className="form-group"><label>Description</label><textarea value={editing.description||''} onChange={e => setEditing({...editing, description: e.target.value})} rows={2} /></div>
          <div className="form-group"><label><input type="checkbox" checked={editing.is_active} onChange={e => setEditing({...editing, is_active: e.target.checked})} style={{width:'auto',marginRight:'8px'}} />Active</label></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div></form>
      </div></div>}
    </div>
  )
}
