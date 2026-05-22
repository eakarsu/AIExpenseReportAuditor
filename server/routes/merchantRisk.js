const router = require('express').Router();

router.post('/score', (req, res) => {
  const { newMerchant = false, policyViolations = 0, duplicateReceipts = 0, weekendSpendPct = 0, cashLikeSpend = 0 } = req.body || {};
  const score = Math.min(100, Math.round(
    (newMerchant ? 18 : 0) +
    Number(policyViolations) * 14 +
    Number(duplicateReceipts) * 16 +
    Number(weekendSpendPct) * 0.35 +
    Number(cashLikeSpend) * 0.02
  ));
  res.json({
    feature: 'merchant_risk',
    score,
    level: score >= 70 ? 'block' : score >= 35 ? 'review' : 'approve',
    actions: [
      newMerchant && 'Verify merchant before reimbursement.',
      Number(duplicateReceipts) > 0 && 'Compare receipts for duplicate image or metadata reuse.',
      Number(policyViolations) > 1 && 'Route to manager with policy exception summary.',
    ].filter(Boolean),
  });
});

module.exports = router;
