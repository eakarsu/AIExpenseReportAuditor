const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT aw.*, er.report_number, er.title as report_title, er.total_amount,
      e.full_name as approver_name, emp.full_name as submitter_name
      FROM approval_workflows aw
      JOIN expense_reports er ON aw.report_id = er.id
      LEFT JOIN employees e ON aw.approver_id = e.id
      LEFT JOIN employees emp ON er.employee_id = emp.id
      ORDER BY aw.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT aw.*, er.report_number, er.title as report_title, er.total_amount, er.description as report_description,
      e.full_name as approver_name, emp.full_name as submitter_name
      FROM approval_workflows aw
      JOIN expense_reports er ON aw.report_id = er.id
      LEFT JOIN employees e ON aw.approver_id = e.id
      LEFT JOIN employees emp ON er.employee_id = emp.id
      WHERE aw.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { report_id, approver_id, level } = req.body;
    const result = await db.query(
      'INSERT INTO approval_workflows (report_id, approver_id, level) VALUES ($1, $2, $3) RETURNING *',
      [report_id, approver_id, level || 1]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { status, comments } = req.body;
    const result = await db.query(`
      UPDATE approval_workflows SET status = COALESCE($1, status), comments = COALESCE($2, comments),
      action_date = CASE WHEN $1 IS NOT NULL THEN NOW() ELSE action_date END
      WHERE id = $3 RETURNING *
    `, [status, comments, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    // Update report status to match
    if (status === 'approved' || status === 'rejected') {
      await db.query('UPDATE expense_reports SET status = $1 WHERE id = $2', [status, result.rows[0].report_id]);
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM approval_workflows WHERE id = $1', [req.params.id]);
    res.json({ message: 'Approval deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
