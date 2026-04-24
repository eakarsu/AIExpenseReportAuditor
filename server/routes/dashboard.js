const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/stats', auth, async (req, res) => {
  try {
    const [reports, pending, flagged, totalSpent, employees, departments] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM expense_reports'),
      db.query("SELECT COUNT(*) as count FROM expense_reports WHERE status = 'pending' OR status = 'submitted'"),
      db.query('SELECT COUNT(*) as count FROM expense_items WHERE is_flagged = true'),
      db.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM expense_reports'),
      db.query('SELECT COUNT(*) as count FROM employees'),
      db.query('SELECT COUNT(*) as count FROM departments'),
    ]);

    const recentReports = await db.query(`
      SELECT er.*, e.full_name as employee_name, d.name as department_name
      FROM expense_reports er
      JOIN employees e ON er.employee_id = e.id
      LEFT JOIN departments d ON er.department_id = d.id
      ORDER BY er.created_at DESC LIMIT 5
    `);

    const spendByDept = await db.query(`
      SELECT d.name, COALESCE(SUM(er.total_amount), 0) as total
      FROM departments d
      LEFT JOIN expense_reports er ON d.id = er.department_id
      GROUP BY d.name
      ORDER BY total DESC LIMIT 8
    `);

    const statusBreakdown = await db.query(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM expense_reports
      GROUP BY status
    `);

    res.json({
      totalReports: parseInt(reports.rows[0].count),
      pendingReports: parseInt(pending.rows[0].count),
      flaggedItems: parseInt(flagged.rows[0].count),
      totalSpent: parseFloat(totalSpent.rows[0].total),
      totalEmployees: parseInt(employees.rows[0].count),
      totalDepartments: parseInt(departments.rows[0].count),
      recentReports: recentReports.rows,
      spendByDepartment: spendByDept.rows,
      statusBreakdown: statusBreakdown.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
