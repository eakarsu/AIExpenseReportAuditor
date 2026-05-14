const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/scheduled-scans - list all scheduled scans
router.get('/', auth, async (req, res) => {
  try {
    // Ensure table exists before querying
    await db.query(`
      CREATE TABLE IF NOT EXISTS scheduled_scans (
        id SERIAL PRIMARY KEY,
        scan_type VARCHAR(100),
        frequency VARCHAR(50),
        last_run TIMESTAMP,
        next_run TIMESTAMP,
        created_by INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const result = await db.query(`
      SELECT ss.*, e.full_name as created_by_name
      FROM scheduled_scans ss
      LEFT JOIN employees e ON ss.created_by = e.id
      ORDER BY ss.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
