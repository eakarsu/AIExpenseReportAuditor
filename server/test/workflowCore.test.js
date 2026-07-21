const test = require('node:test');
const assert = require('node:assert/strict');
const { createWorkflow } = require('../governance/workflowCore');
const config = require('../governance/config');

const workflow = createWorkflow(config);
const headers = { 'x-tenant-id': 'tenant-demo', 'idempotency-key': 'request-001' };
const actor = { id: 'actor-1', role: config.createRoles[0] };

test('creates a tenant-scoped versioned case without personal content', () => {
  const ctx = workflow.context(headers, actor);
  const item = workflow.createCase({
    subjectRef: 'subject-opaque-01',
    policyVersion: 'policy-2026-01',
    effectiveAt: '2026-07-18T00:00:00.000Z',
    sourceSnapshot: { digest: 'abc', version: '2026-01' },
  }, ctx);
  assert.equal(item.tenantId, 'tenant-demo');
  assert.equal(item.state, config.initialState);
  assert.equal(item.createdBy, 'actor-1');
});

test('rejects raw evidence and accepts digest-only provenance', () => {
  assert.throws(() => workflow.evidence({
    kind: config.evidenceKinds[0], sourceVersion: 'source-v1',
    capturedAt: '2026-07-18T00:00:00.000Z', sha256: 'a'.repeat(64), rawContent: 'private',
  }), { code: 'RAW_CONTENT_REJECTED' });
  const item = workflow.evidence({
    kind: config.evidenceKinds[0], sourceVersion: 'source-v1', sourceRef: 'vault:item-1',
    capturedAt: '2026-07-18T00:00:00.000Z', sha256: 'b'.repeat(64),
  });
  assert.equal(item.sha256.length, 64);
});

test('deterministic assessment is triage and never a final automated decision', () => {
  const missing = workflow.deterministicAssessment({ policyVersion: 'policy-v1' });
  assert.equal(missing.automatedDecision, false);
  assert.equal(missing.disposition, 'insufficient_evidence');
  const complete = Object.fromEntries(config.requiredSignals.map((key) => [key, key.includes('Count') ? 0 : key.includes('Score') ? 0.4 : key.includes('Minor') ? 100 : key === 'width' || key === 'height' || key === 'latencyMs' ? 100 : key === 'deviceAuthenticated' || key === 'licenseVerified' || key === 'consentRecorded' ? true : key === 'moderationStatus' ? 'passed' : key === 'measurementQuality' ? 'validated' : 'value']));
  assert.equal(workflow.deterministicAssessment(complete).automatedDecision, false);
  assert.equal(workflow.deterministicAssessment(complete).requiresHumanReview, true);
});

test('state machine enforces evidence, roles, reason, and dual control', () => {
  const first = config.transitions[0];
  const goodActor = { tenantId: 'tenant-demo', idempotencyKey: 'transition-1', actorId: 'actor-2', role: first.roles[0] };
  assert.throws(() => workflow.transition({ state: first.from, evidenceCount: 0, createdBy: 'actor-1' }, { action: first.action, reason: 'specific reason' }, goodActor), first.requiresEvidence ? { code: 'EVIDENCE_REQUIRED' } : undefined);
  const decision = workflow.transition({ state: first.from, evidenceCount: 1, createdBy: 'actor-1' }, { action: first.action, reason: 'specific governed reason' }, goodActor);
  assert.equal(decision.to, first.to);

  const dual = config.transitions.find((item) => item.dualControl);
  assert.throws(() => workflow.transition(
    { state: dual.from, evidenceCount: 1, createdBy: 'actor-1' },
    { action: dual.action, reason: 'specific governed reason' },
    { tenantId: 'tenant-demo', idempotencyKey: 'transition-2', actorId: 'actor-1', role: dual.roles[0] }
  ), { code: 'DUAL_CONTROL_REQUIRED' });
});

