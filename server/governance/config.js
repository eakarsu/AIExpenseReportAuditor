module.exports = {
  caseType: 'expense_report_audit', initialState: 'ingested',
  states: ['ingested', 'policy_checked', 'exception_review', 'approved', 'rejected', 'reconciled'],
  createRoles: ['submitter', 'employee', 'admin', 'finance'],
  evidenceKinds: ['receipt_digest', 'card_feed_record', 'policy_snapshot', 'ocr_result', 'approval_note', 'ledger_entry'],
  requiredSignals: ['amountMinor', 'currency', 'policyLimitMinor', 'duplicateDigestCount', 'policyVersion'],
  transitions: [
    { from: 'ingested', action: 'check_policy', to: 'policy_checked', roles: ['auditor', 'finance', 'admin'], requiresEvidence: true },
    { from: 'policy_checked', action: 'route_exception', to: 'exception_review', roles: ['auditor', 'finance'], requiresEvidence: true },
    { from: 'policy_checked', action: 'approve', to: 'approved', roles: ['approver', 'finance'], requiresEvidence: true, dualControl: true },
    { from: 'exception_review', action: 'approve', to: 'approved', roles: ['approver', 'finance'], requiresEvidence: true, dualControl: true },
    { from: 'exception_review', action: 'reject', to: 'rejected', roles: ['approver', 'finance'], requiresEvidence: true, dualControl: true },
    { from: 'approved', action: 'reconcile', to: 'reconciled', roles: ['finance'], requiresEvidence: true, dualControl: true },
  ],
  assess: (x) => ({ disposition: x.duplicateDigestCount > 0 || x.amountMinor > x.policyLimitMinor ? 'exception_review' : 'policy_clear', rules: { duplicate: x.duplicateDigestCount > 0, overLimit: x.amountMinor > x.policyLimitMinor } }),
};
