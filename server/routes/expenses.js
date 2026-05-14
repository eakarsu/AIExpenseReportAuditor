const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all expense reports (paginated)
router.get('/reports', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await db.query('SELECT COUNT(*) FROM expense_reports');
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(`
      SELECT er.*, e.full_name as employee_name, d.name as department_name
      FROM expense_reports er
      JOIN employees e ON er.employee_id = e.id
      LEFT JOIN departments d ON er.department_id = d.id
      ORDER BY er.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single report with items
router.get('/reports/:id', auth, async (req, res) => {
  try {
    const report = await db.query(`
      SELECT er.*, e.full_name as employee_name, d.name as department_name
      FROM expense_reports er
      JOIN employees e ON er.employee_id = e.id
      LEFT JOIN departments d ON er.department_id = d.id
      WHERE er.id = $1
    `, [req.params.id]);
    if (report.rows.length === 0) return res.status(404).json({ error: 'Report not found' });

    const items = await db.query(`
      SELECT ei.*, c.name as category_name, v.name as vendor_name
      FROM expense_items ei
      LEFT JOIN categories c ON ei.category_id = c.id
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      WHERE ei.report_id = $1
      ORDER BY ei.expense_date
    `, [req.params.id]);

    const approvals = await db.query(`
      SELECT aw.*, e.full_name as approver_name
      FROM approval_workflows aw
      LEFT JOIN employees e ON aw.approver_id = e.id
      WHERE aw.report_id = $1
      ORDER BY aw.level
    `, [req.params.id]);

    res.json({ ...report.rows[0], items: items.rows, approvals: approvals.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create report
router.post('/reports', auth, async (req, res) => {
  try {
    const { title, description, employee_id, department_id, trip_destination, trip_start_date, trip_end_date } = req.body;
    if (!title || !employee_id) {
      return res.status(400).json({ error: 'title and employee_id are required' });
    }
    const reportNum = `RPT-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
    const result = await db.query(`
      INSERT INTO expense_reports (report_number, employee_id, title, description, department_id, trip_destination, trip_start_date, trip_end_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [reportNum, employee_id || 1, title, description, department_id, trip_destination, trip_start_date, trip_end_date]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update report
router.put('/reports/:id', auth, async (req, res) => {
  try {
    const { title, description, status, trip_destination, trip_start_date, trip_end_date } = req.body;
    const result = await db.query(`
      UPDATE expense_reports
      SET title = COALESCE($1, title), description = COALESCE($2, description),
          status = COALESCE($3, status), trip_destination = COALESCE($4, trip_destination),
          trip_start_date = COALESCE($5, trip_start_date), trip_end_date = COALESCE($6, trip_end_date),
          submitted_date = CASE WHEN $3 = 'submitted' THEN NOW() ELSE submitted_date END,
          approved_date = CASE WHEN $3 = 'approved' THEN NOW() ELSE approved_date END
      WHERE id = $7
      RETURNING *
    `, [title, description, status, trip_destination, trip_start_date, trip_end_date, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    // Recalculate total
    await db.query(`
      UPDATE expense_reports SET total_amount = (SELECT COALESCE(SUM(amount), 0) FROM expense_items WHERE report_id = $1) WHERE id = $1
    `, [req.params.id]);
    const updated = await db.query('SELECT * FROM expense_reports WHERE id = $1', [req.params.id]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete report
router.delete('/reports/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM expense_reports WHERE id = $1', [req.params.id]);
    res.json({ message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all expense items for a report
router.get('/reports/:id/items', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ei.*, c.name as category_name, v.name as vendor_name
      FROM expense_items ei
      LEFT JOIN categories c ON ei.category_id = c.id
      LEFT JOIN vendors v ON ei.vendor_id = v.id
      WHERE ei.report_id = $1
      ORDER BY ei.expense_date
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add expense item
router.post('/items', auth, async (req, res) => {
  try {
    const { report_id, category_id, vendor_id, description, amount, expense_date, has_receipt, notes } = req.body;
    if (!report_id || amount == null || !category_id) {
      return res.status(400).json({ error: 'report_id, amount, and category are required' });
    }
    const result = await db.query(`
      INSERT INTO expense_items (report_id, category_id, vendor_id, description, amount, expense_date, has_receipt, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [report_id, category_id, vendor_id, description, amount, expense_date, has_receipt || false, notes]);
    // Update report total
    await db.query(`
      UPDATE expense_reports SET total_amount = (SELECT COALESCE(SUM(amount), 0) FROM expense_items WHERE report_id = $1) WHERE id = $1
    `, [report_id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update expense item
router.put('/items/:id', auth, async (req, res) => {
  try {
    const { category_id, vendor_id, description, amount, expense_date, has_receipt, notes } = req.body;
    const result = await db.query(`
      UPDATE expense_items
      SET category_id = COALESCE($1, category_id), vendor_id = $2,
          description = COALESCE($3, description), amount = COALESCE($4, amount),
          expense_date = COALESCE($5, expense_date), has_receipt = COALESCE($6, has_receipt),
          notes = $7
      WHERE id = $8
      RETURNING *
    `, [category_id, vendor_id, description, amount, expense_date, has_receipt, notes, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    // Update report total
    await db.query(`
      UPDATE expense_reports SET total_amount = (SELECT COALESCE(SUM(amount), 0) FROM expense_items WHERE report_id = $1) WHERE id = $1
    `, [result.rows[0].report_id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete expense item
router.delete('/items/:id', auth, async (req, res) => {
  try {
    const item = await db.query('SELECT report_id FROM expense_items WHERE id = $1', [req.params.id]);
    await db.query('DELETE FROM expense_items WHERE id = $1', [req.params.id]);
    if (item.rows.length > 0) {
      await db.query(`
        UPDATE expense_reports SET total_amount = (SELECT COALESCE(SUM(amount), 0) FROM expense_items WHERE report_id = $1) WHERE id = $1
      `, [item.rows[0].report_id]);
    }
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
