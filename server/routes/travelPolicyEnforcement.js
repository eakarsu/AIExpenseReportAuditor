// Travel policy enforcement: preferred hotel / airline, auto-approve/reject
// per policy.
const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const router = express.Router();

// POST /api/travel-policy/enforce { trip_id }
router.post('/enforce', auth, async (req, res) => {
  try {
    const { trip_id } = req.body || {};
    if (!trip_id) return res.status(400).json({ error: 'trip_id required' });
    const trip = await db.query(`SELECT * FROM trips WHERE id = $1`, [trip_id]).catch(() => ({ rows: [] }));
    if (!trip.rows[0]) return res.status(404).json({ error: 'trip not found' });
    const t = trip.rows[0];

    const preferredAirlines = (process.env.PREFERRED_AIRLINES || 'Delta,United,AA').split(',');
    const preferredHotels = (process.env.PREFERRED_HOTELS || 'Marriott,Hilton,Hyatt').split(',');
    const maxPerNight = Number(process.env.HOTEL_MAX_PER_NIGHT || 250);

    const violations = [];
    if (t.airline && !preferredAirlines.includes(t.airline)) violations.push(`Non-preferred airline: ${t.airline}`);
    if (t.hotel && !preferredHotels.some(h => (t.hotel || '').includes(h))) violations.push(`Non-preferred hotel: ${t.hotel}`);
    if (Number(t.hotel_rate_per_night) > maxPerNight) violations.push(`Hotel rate $${t.hotel_rate_per_night} > $${maxPerNight} max`);

    const decision = violations.length === 0 ? 'auto_approve' : violations.length <= 1 ? 'manager_review' : 'reject';
    try {
      await db.query(`UPDATE trips SET enforcement_status = $1, enforcement_notes = $2 WHERE id = $3`, [decision, JSON.stringify(violations), trip_id]);
    } catch {}
    return res.json({ trip_id, decision, violations });
  } catch (e) {
    return res.status(500).json({ error: 'enforce failed' });
  }
});

module.exports = router;
