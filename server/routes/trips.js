const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT tp.*, e.full_name as employee_name
      FROM trip_plans tp
      LEFT JOIN employees e ON tp.employee_id = e.id
      ORDER BY tp.start_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT tp.*, e.full_name as employee_name
      FROM trip_plans tp
      LEFT JOIN employees e ON tp.employee_id = e.id
      WHERE tp.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { employee_id, destination, purpose, start_date, end_date, estimated_budget } = req.body;
    const result = await db.query(`
      INSERT INTO trip_plans (employee_id, destination, purpose, start_date, end_date, estimated_budget)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [employee_id || 1, destination, purpose, start_date, end_date, estimated_budget]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { destination, purpose, start_date, end_date, estimated_budget, status, daily_breakdown, ai_suggestions } = req.body;
    const result = await db.query(`
      UPDATE trip_plans SET destination = COALESCE($1, destination), purpose = COALESCE($2, purpose),
      start_date = COALESCE($3, start_date), end_date = COALESCE($4, end_date),
      estimated_budget = COALESCE($5, estimated_budget), status = COALESCE($6, status),
      daily_breakdown = COALESCE($7, daily_breakdown), ai_suggestions = COALESCE($8, ai_suggestions)
      WHERE id = $9 RETURNING *
    `, [destination, purpose, start_date, end_date, estimated_budget, status,
        daily_breakdown ? JSON.stringify(daily_breakdown) : null,
        ai_suggestions ? JSON.stringify(ai_suggestions) : null, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM trip_plans WHERE id = $1', [req.params.id]);
    res.json({ message: 'Trip plan deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
