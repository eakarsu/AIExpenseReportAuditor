const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT e.*, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      ORDER BY e.full_name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT e.*, d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

    const reports = await db.query(`
      SELECT * FROM expense_reports WHERE employee_id = $1 ORDER BY created_at DESC
    `, [req.params.id]);

    res.json({ ...result.rows[0], reports: reports.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { employee_id, full_name, email, department_id, title, hire_date } = req.body;
    const result = await db.query(`
      INSERT INTO employees (employee_id, full_name, email, department_id, title, hire_date)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [employee_id, full_name, email, department_id, title, hire_date]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { full_name, email, department_id, title } = req.body;
    const result = await db.query(`
      UPDATE employees SET full_name = COALESCE($1, full_name), email = COALESCE($2, email),
      department_id = COALESCE($3, department_id), title = COALESCE($4, title)
      WHERE id = $5 RETURNING *
    `, [full_name, email, department_id, title, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
