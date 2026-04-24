const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, COUNT(ei.id) as usage_count, COALESCE(SUM(ei.amount), 0) as total_spent
      FROM categories c
      LEFT JOIN expense_items ei ON c.id = ei.category_id
      GROUP BY c.id ORDER BY c.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const cat = await db.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (cat.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const items = await db.query(`
      SELECT ei.*, er.report_number FROM expense_items ei
      JOIN expense_reports er ON ei.report_id = er.id
      WHERE ei.category_id = $1 ORDER BY ei.expense_date DESC LIMIT 20
    `, [req.params.id]);
    res.json({ ...cat.rows[0], recent_items: items.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, code, description, max_amount, requires_receipt } = req.body;
    const result = await db.query(
      'INSERT INTO categories (name, code, description, max_amount, requires_receipt) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, code, description, max_amount, requires_receipt !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, code, description, max_amount, requires_receipt, is_active } = req.body;
    const result = await db.query(`
      UPDATE categories SET name = COALESCE($1, name), code = COALESCE($2, code),
      description = COALESCE($3, description), max_amount = COALESCE($4, max_amount),
      requires_receipt = COALESCE($5, requires_receipt), is_active = COALESCE($6, is_active)
      WHERE id = $7 RETURNING *
    `, [name, code, description, max_amount, requires_receipt, is_active, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
