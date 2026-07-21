const crypto = require('node:crypto');

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/;

function problem(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function createWorkflow(config) {
  const stateSet = new Set(config.states);
  const transitionMap = new Map(config.transitions.map((item) => [`${item.from}:${item.action}`, item]));

  function context(headers, user) {
    const tenantId = String(headers['x-tenant-id'] || '');
    const idempotencyKey = String(headers['idempotency-key'] || '');
    if (!ID.test(tenantId)) throw problem('TENANT_REQUIRED', 'A valid X-Tenant-Id is required.');
    if (!ID.test(idempotencyKey)) throw problem('IDEMPOTENCY_REQUIRED', 'A valid Idempotency-Key is required.');
    if (!user?.id || !user?.role) throw problem('AUTH_CONTEXT_INVALID', 'Authenticated user context is incomplete.', 401);
    return { tenantId, idempotencyKey, actorId: String(user.id), role: user.role };
  }

  function createCase(input, ctx) {
    if (!ID.test(String(input.subjectRef || ''))) throw problem('SUBJECT_REQUIRED', 'subjectRef must be an opaque reference, not personal data.');
    if (!ID.test(String(input.policyVersion || ''))) throw problem('POLICY_VERSION_REQUIRED', 'policyVersion is required.');
    if (!input.effectiveAt || Number.isNaN(Date.parse(input.effectiveAt))) throw problem('EFFECTIVE_DATE_REQUIRED', 'effectiveAt must be an ISO date.');
    if (!config.createRoles.includes(ctx.role)) throw problem('FORBIDDEN', 'Role cannot create cases.', 403);
    return {
      id: crypto.randomUUID(), tenantId: ctx.tenantId, idempotencyKey: ctx.idempotencyKey,
      subjectRef: input.subjectRef, caseType: config.caseType, state: config.initialState,
      policyVersion: input.policyVersion, effectiveAt: new Date(input.effectiveAt).toISOString(),
      sourceSnapshot: input.sourceSnapshot || {}, retentionUntil: input.retentionUntil || null,
      createdBy: ctx.actorId,
    };
  }

  function evidence(input) {
    if (!config.evidenceKinds.includes(input.kind)) throw problem('EVIDENCE_KIND_INVALID', 'Unsupported evidence kind.');
    if (!ID.test(String(input.sourceVersion || ''))) throw problem('SOURCE_VERSION_REQUIRED', 'sourceVersion is required.');
    if (!input.capturedAt || Number.isNaN(Date.parse(input.capturedAt))) throw problem('CAPTURE_TIME_REQUIRED', 'capturedAt must be an ISO date.');
    if (input.rawContent !== undefined) throw problem('RAW_CONTENT_REJECTED', 'Raw sensitive content must remain in approved encrypted storage.');
    const digest = String(input.sha256 || '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(digest)) throw problem('DIGEST_REQUIRED', 'sha256 must be a 64-character digest.');
    return {
      id: crypto.randomUUID(), kind: input.kind, sourceRef: String(input.sourceRef || ''),
      sourceVersion: input.sourceVersion, sha256: digest,
      capturedAt: new Date(input.capturedAt).toISOString(), consentBasis: input.consentBasis || null,
      metadata: input.metadata || {},
    };
  }

  function transition(record, input, ctx) {
    if (!stateSet.has(record.state)) throw problem('STATE_CORRUPT', 'Stored case state is invalid.', 409);
    const rule = transitionMap.get(`${record.state}:${input.action}`);
    if (!rule) throw problem('TRANSITION_INVALID', `Action ${input.action} is not allowed from ${record.state}.`, 409);
    if (!rule.roles.includes(ctx.role)) throw problem('FORBIDDEN', 'Role cannot perform this transition.', 403);
    if (rule.requiresEvidence && Number(record.evidenceCount || 0) < 1) throw problem('EVIDENCE_REQUIRED', 'At least one evidence record is required.', 409);
    if (rule.dualControl && String(record.createdBy) === ctx.actorId) throw problem('DUAL_CONTROL_REQUIRED', 'A second person must perform this decision.', 409);
    if (!input.reason || String(input.reason).trim().length < 8) throw problem('REASON_REQUIRED', 'A specific decision reason is required.');
    return { to: rule.to, eventId: crypto.randomUUID(), reason: String(input.reason).trim() };
  }

  function deterministicAssessment(input) {
    const missing = config.requiredSignals.filter((key) => input[key] === undefined || input[key] === null);
    if (missing.length) return { disposition: 'insufficient_evidence', missing, automatedDecision: false };
    return { ...config.assess(input), automatedDecision: false, requiresHumanReview: true, policyVersion: input.policyVersion };
  }

  return { config, context, createCase, evidence, transition, deterministicAssessment, problem };
}

module.exports = { createWorkflow, problem };
