const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authenticateToken = require('../middleware/auth');
const router = express.Router();

// Development-only demo credential bridge. It exposes only an explicitly
// configured account and verifies that the account already exists.
router.get('/demo-credentials', async (_req, res) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEMO_CREDENTIAL_AUTOFILL === 'false') {
    return res.status(404).json({ error: 'Demo credential filling is unavailable' });
  }

  const pairs = [
    [process.env.DEMO_EMAIL, process.env.DEMO_PASSWORD],
    [process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD],
    [process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD],
    [process.env.DEFAULT_EMAIL, process.env.DEFAULT_PASSWORD],
  ];
  const [email, password] = pairs.find(([candidateEmail, candidatePassword]) => candidateEmail && candidatePassword) || [];
  if (!email || !password) return res.status(404).json({ error: 'Demo credentials are not configured' });

  try {
    const existing = await db.query('SELECT 1 FROM users WHERE email = $1', [email]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Configured demo account does not exist' });
    return res.json({ email, password });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
