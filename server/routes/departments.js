const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT d.*, COUNT(e.id) as employee_count,
      COALESCE(SUM(er.total_amount), 0) as total_spent
      FROM departments d
      LEFT JOIN employees e ON d.id = e.department_id
      LEFT JOIN expense_reports er ON d.id = er.department_id
      GROUP BY d.id ORDER BY d.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const dept = await db.query('SELECT * FROM departments WHERE id = $1', [req.params.id]);
    if (dept.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const employees = await db.query('SELECT * FROM employees WHERE department_id = $1', [req.params.id]);
    const reports = await db.query('SELECT * FROM expense_reports WHERE department_id = $1 ORDER BY created_at DESC', [req.params.id]);
    res.json({ ...dept.rows[0], employees: employees.rows, reports: reports.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, code, budget, manager } = req.body;
    const result = await db.query(
      'INSERT INTO departments (name, code, budget, manager) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, code, budget || 0, manager]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, code, budget, manager } = req.body;
    const result = await db.query(`
      UPDATE departments SET name = COALESCE($1, name), code = COALESCE($2, code),
      budget = COALESCE($3, budget), manager = COALESCE($4, manager)
      WHERE id = $5 RETURNING *
    `, [name, code, budget, manager, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
