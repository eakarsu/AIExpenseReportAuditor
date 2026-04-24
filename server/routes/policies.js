const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM policy_rules ORDER BY severity DESC, name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM policy_rules WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, category, rule_type, condition_field, condition_operator, condition_value, action_type, severity, description } = req.body;
    const result = await db.query(`
      INSERT INTO policy_rules (name, category, rule_type, condition_field, condition_operator, condition_value, action_type, severity, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [name, category, rule_type, condition_field, condition_operator, condition_value, action_type, severity || 'warning', description]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, category, rule_type, condition_field, condition_operator, condition_value, action_type, severity, is_active, description } = req.body;
    const result = await db.query(`
      UPDATE policy_rules SET name = COALESCE($1, name), category = COALESCE($2, category),
      rule_type = COALESCE($3, rule_type), condition_field = COALESCE($4, condition_field),
      condition_operator = COALESCE($5, condition_operator), condition_value = COALESCE($6, condition_value),
      action_type = COALESCE($7, action_type), severity = COALESCE($8, severity),
      is_active = COALESCE($9, is_active), description = COALESCE($10, description)
      WHERE id = $11 RETURNING *
    `, [name, category, rule_type, condition_field, condition_operator, condition_value, action_type, severity, is_active, description, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await db.query('DELETE FROM policy_rules WHERE id = $1', [req.params.id]);
    res.json({ message: 'Policy deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
