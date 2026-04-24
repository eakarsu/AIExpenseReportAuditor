import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function Employees() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState({ employee_id: '', full_name: '', email: '', department_id: '', title: '', hire_date: '' })

  const load = () => api.getEmployees().then(setItems).finally(() => setLoading(false))
  useEffect(() => { load(); api.getDepartments().then(setDepartments).catch(() => {}) }, [])

  const handleCreate = async (e) => { e.preventDefault(); await api.createEmployee(form); setShowModal(false); setForm({ employee_id: '', full_name: '', email: '', department_id: '', title: '', hire_date: '' }); load() }
  const handleEdit = async (e) => { e.preventDefault(); await api.updateEmployee(editing.id, editing); setEditing(null); load() }
  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await api.deleteEmployee(id); setSelected(null); load() }

  if (loading) return <div className="loading"><div className="spinner"></div> Loading...</div>

  return (
    <div>
      <div className="page-header"><div><h1>Employees</h1><div className="breadcrumb">Manage employee profiles</div></div><button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Employee</button></div>
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Department</th><th>Title</th><th>Hire Date</th></tr></thead>
          <tbody>{items.map(i => (
            <tr key={i.id} onClick={() => setSelected(i)}><td><strong>{i.employee_id}</strong></td><td>{i.full_name}</td><td>{i.email}</td><td>{i.department_name||'-'}</td><td>{i.title||'-'}</td><td>{i.hire_date ? new Date(i.hire_date).toLocaleDateString() : '-'}</td></tr>
          ))}</tbody>
        </table>
        {items.length === 0 && <div className="empty-state"><h3>No employees</h3></div>}
      </div>

      {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>{selected.full_name}</h2><button className="btn btn-ghost" onClick={() => setSelected(null)}>{'\u2715'}</button></div>
        <div className="modal-body"><div className="detail-grid">
          <div className="detail-field"><label>Employee ID</label><div className="value">{selected.employee_id}</div></div>
          <div className="detail-field"><label>Email</label><div className="value">{selected.email}</div></div>
          <div className="detail-field"><label>Department</label><div className="value">{selected.department_name||'-'}</div></div>
          <div className="detail-field"><label>Title</label><div className="value">{selected.title||'-'}</div></div>
          <div className="detail-field"><label>Hire Date</label><div className="value">{selected.hire_date ? new Date(selected.hire_date).toLocaleDateString() : '-'}</div></div>
        </div></div>
        <div className="modal-footer"><button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected.id)}>Delete</button><button className="btn btn-primary btn-sm" onClick={() => { setEditing({...selected}); setSelected(null) }}>Edit</button></div>
      </div></div>}

      {showModal && <div className="modal-overlay" onClick={() => setShowModal(false)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>New Employee</h2><button className="btn btn-ghost" onClick={() => setShowModal(false)}>{'\u2715'}</button></div>
        <form onSubmit={handleCreate}><div className="modal-body">
          <div className="form-group"><label>Employee ID</label><input value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} required placeholder="EMP019" /></div>
          <div className="form-group"><label>Full Name</label><input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required /></div>
          <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
          <div className="form-group"><label>Department</label><select value={form.department_id} onChange={e => setForm({...form, department_id: e.target.value})}><option value="">Select...</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div className="form-group"><label>Title</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
          <div className="form-group"><label>Hire Date</label><input type="date" value={form.hire_date} onChange={e => setForm({...form, hire_date: e.target.value})} /></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create</button></div></form>
      </div></div>}

      {editing && <div className="modal-overlay" onClick={() => setEditing(null)}><div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2>Edit Employee</h2><button className="btn btn-ghost" onClick={() => setEditing(null)}>{'\u2715'}</button></div>
        <form onSubmit={handleEdit}><div className="modal-body">
          <div className="form-group"><label>Full Name</label><input value={editing.full_name} onChange={e => setEditing({...editing, full_name: e.target.value})} required /></div>
          <div className="form-group"><label>Email</label><input type="email" value={editing.email} onChange={e => setEditing({...editing, email: e.target.value})} required /></div>
          <div className="form-group"><label>Department</label><select value={editing.department_id||''} onChange={e => setEditing({...editing, department_id: e.target.value})}><option value="">Select...</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div className="form-group"><label>Title</label><input value={editing.title||''} onChange={e => setEditing({...editing, title: e.target.value})} /></div>
        </div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div></form>
      </div></div>}
    </div>
  )
}
