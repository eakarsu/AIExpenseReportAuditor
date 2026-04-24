import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function Departments() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', budget: '', manager: '' })

  const load = () => api.getDepartments().then(setItems).finally(() => setLoading(false))
  useEffect(() => { load() }, [])
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)

  const handleCreate = async (e) => { e.preventDefault(); await api.createDepartment(form); setShowModal(false); setForm({ name: '', code: '', budget: '', manager: '' }); load() }
  const handleEdit = async (e) => { e.preventDefault(); await api.updateDepartment(editing.id, editing); setEditing(null); load() }
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await api.deleteDepartment(id); setSelected(null); load() }

  if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>

  return (
    <div>
      <div className="page-header"><div><h1>Departments</h1><div className="breadcrumb">Manage departments and budgets</div></div><button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Department</button></div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Code</th><th>Budget</th><th>Manager</th><th>Employees</th><th>Total Spent</th></tr></thead>
          <tbody>{items.map(i => (
            <tr key={i.id} onClick={() => setSelected(i)}><td><strong>{i.name}</strong></td><td>{i.code}</td><td className="amount">{fmt(i.budget)}</td><td>{i.manager||'-'}</td><td>{i.employee_count}</td><td className="amount">{fmt(i.total_spent)}</td></tr>
          ))}</tbody>
        </table>
      </div>

      {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>{selected.name}</h2><button className="btn btn-ghost" onClick={() => setSelected(null)}>{'\u2715'}</button></div>
        <div className="modal-body"><div className="detail-grid">
          <div className="detail-field"><label>Code</label><div className="value">{selected.code}</div></div>
          <div className="detail-field"><label>Budget</label><div className="value amount">{fmt(selected.budget)}</div></div>
          <div className="detail-field"><label>Manager</label><div className="value">{selected.manager||'-'}</div></div>
          <div className="detail-field"><label>Employees</label><div className="value">{selected.employee_count}</div></div>
          <div className="detail-field"><label>Total Spent</label><div className="value amount">{fmt(selected.total_spent)}</div></div>
        </div>
        {parseFloat(selected.budget) > 0 && <div style={{marginTop:'16px'}}><label style={{fontSize:'12px',fontWeight:600,color:'#64748b'}}>BUDGET UTILIZATION</label>
          <div className="progress-bar" style={{height:'12px'}}><div className={`fill ${parseFloat(selected.total_spent)/parseFloat(selected.budget)*100>90?'red':parseFloat(selected.total_spent)/parseFloat(selected.budget)*100>70?'yellow':'green'}`} style={{width:`${Math.min(parseFloat(selected.total_spent)/parseFloat(selected.budget)*100,100)}%`}}></div></div>
          <div style={{fontSize:'13px',color:'#64748b',marginTop:'4px'}}>{(parseFloat(selected.total_spent)/parseFloat(selected.budget)*100).toFixed(1)}% used</div></div>}
        </div>
        <div className="modal-footer"><button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button><button className="btn btn-primary btn-sm" onClick={() => { setEditing({...selected}); setSelected(null) }}>Edit</button></div>
      </div></div>}

      {showModal && <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>New Department</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}>{'\u2715'}</button></div>
        <form onSubmit={handleCreate}><div className="modal-body">
          <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div className="form-group"><label>Code</label><input value={form.code} onChange={e => setForm({...form, code: e.target.value})} required placeholder="e.g. ENG" /></div>
          <div className="form-group"><label>Budget ($)</label><input type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} /></div>
          <div className="form-group"><label>Manager</label><input value={form.manager} onChange={e => setForm({...form, manager: e.target.value})} /></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div></form>
      </div></div>}

      {editing && <div className="modal-overlay" onClick={() => setEditing(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Edit Department</h2><button className="btn btn-ghost" onClick={() => setEditing(null)}>{'\u2715'}</button></div>
        <form onSubmit={handleEdit}><div className="modal-body">
          <div className="form-group"><label>Name</label><input value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} required /></div>
          <div className="form-group"><label>Code</label><input value={editing.code} onChange={e => setEditing({...editing, code: e.target.value})} required /></div>
          <div className="form-group"><label>Budget ($)</label><input type="number" value={editing.budget} onChange={e => setEditing({...editing, budget: e.target.value})} /></div>
          <div className="form-group"><label>Manager</label><input value={editing.manager||''} onChange={e => setEditing({...editing, manager: e.target.value})} /></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div></form>
      </div></div>}
    </div>
  )
}
