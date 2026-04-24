const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM vendors ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const vendor = await db.query('SELECT * FROM vendors WHERE id = $1', [req.params.id]);
    if (vendor.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const items = await db.query(`
      SELECT ei.*, er.report_number, e.full_name as employee_name
      FROM expense_items ei
      JOIN expense_reports er ON ei.report_id = er.id
      JOIN employees e ON er.employee_id = e.id
      WHERE ei.vendor_id = $1 ORDER BY ei.expense_date DESC LIMIT 20
    `, [req.params.id]);
    res.json({ ...vendor.rows[0], recent_transactions: items.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, category, is_preferred, address, contact_email } = req.body;
    const result = await db.query(
      'INSERT INTO vendors (name, category, is_preferred, address, contact_email) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, category, is_preferred || false, address, contact_email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, category, is_preferred, is_flagged, address, contact_email } = req.body;
    const result = await db.query(`
      UPDATE vendors SET name = COALESCE($1, name), category = COALESCE($2, category),
      is_preferred = COALESCE($3, is_preferred), is_flagged = COALESCE($4, is_flagged),
      address = COALESCE($5, address), contact_email = COALESCE($6, contact_email)
      WHERE id = $7 RETURNING *
    `, [name, category, is_preferred, is_flagged, address, contact_email, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM vendors WHERE id = $1', [req.params.id]);
    res.json({ message: 'Vendor deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
