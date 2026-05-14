const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT bl.*, d.name as department_name, c.name as category_name
      FROM budget_limits bl
      LEFT JOIN departments d ON bl.department_id = d.id
      LEFT JOIN categories c ON bl.category_id = c.id
      ORDER BY d.name, c.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT bl.*, d.name as department_name, c.name as category_name
      FROM budget_limits bl
      LEFT JOIN departments d ON bl.department_id = d.id
      LEFT JOIN categories c ON bl.category_id = c.id
      WHERE bl.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { department_id, category_id, period, limit_amount, alert_threshold, fiscal_year } = req.body;
    const result = await db.query(`
      INSERT INTO budget_limits (department_id, category_id, period, limit_amount, alert_threshold, fiscal_year)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [department_id, category_id, period || 'monthly', limit_amount, alert_threshold || 80, fiscal_year || 2024]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { limit_amount, spent_amount, alert_threshold, period } = req.body;
    const result = await db.query(`
      UPDATE budget_limits SET limit_amount = COALESCE($1, limit_amount),
      spent_amount = COALESCE($2, spent_amount), alert_threshold = COALESCE($3, alert_threshold),
      period = COALESCE($4, period)
      WHERE id = $5 RETURNING *
    `, [limit_amount, spent_amount, alert_threshold, period, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM budget_limits WHERE id = $1', [req.params.id]);
    res.json({ message: 'Budget limit deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Budget auto-reconciliation: recompute spent_amount from approved expense items
router.post('/:id/reconcile', auth, async (req, res) => {
  try {
    const budget = await db.query(`
      SELECT bl.*, d.name as department_name, c.name as category_name
      FROM budget_limits bl
      LEFT JOIN departments d ON bl.department_id = d.id
      LEFT JOIN categories c ON bl.category_id = c.id
      WHERE bl.id = $1
    `, [req.params.id]);

    if (budget.rows.length === 0) return res.status(404).json({ error: 'Budget not found' });

    const bl = budget.rows[0];

    // Sum all approved expense items for this budget's department + category
    const totalResult = await db.query(`
      SELECT COALESCE(SUM(ei.amount), 0) as total
      FROM expense_items ei
      JOIN expense_reports er ON ei.report_id = er.id
      WHERE er.department_id = $1
        AND ei.category_id = $2
        AND er.status = 'approved'
    `, [bl.department_id, bl.category_id]);

    const newSpent = parseFloat(totalResult.rows[0].total);

    const updated = await db.query(`
      UPDATE budget_limits SET spent_amount = $1 WHERE id = $2 RETURNING *
    `, [newSpent, req.params.id]);

    res.json({
      message: 'Budget reconciled successfully',
      budget: updated.rows[0],
      previous_spent: parseFloat(bl.spent_amount),
      new_spent: newSpent,
      variance: newSpent - parseFloat(bl.spent_amount),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
