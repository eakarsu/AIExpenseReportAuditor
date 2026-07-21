function createGovernedRouter({ express, workflow, auth, db }) {
  const router = express.Router();
  const tenantPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/;

  function tenant(req) {
    const value = String(req.headers['x-tenant-id'] || '');
    if (!tenantPattern.test(value)) {
      const error = new Error('A valid X-Tenant-Id is required.');
      error.code = 'TENANT_REQUIRED';
      error.status = 400;
      throw error;
    }
    return value;
  }

  function respondError(res, error) {
    if (error.code === '23505') return res.status(409).json({ error: 'CONFLICT' });
    return res.status(error.status || 500).json({
      error: error.code || 'WORKFLOW_FAILURE',
      message: error.status ? error.message : 'The governed workflow could not complete.',
    });
  }

  router.use(auth);

  router.use(async (req, res, next) => {
    try {
      const tenantId = tenant(req);
      const actorId = String(req.user?.id || '');
      if (!actorId) return res.status(401).json({ error: 'AUTH_CONTEXT_INVALID' });
      const memberships = await db.query(
        'SELECT role FROM governed_tenant_memberships WHERE tenant_id=$1 AND actor_id=$2 AND active=TRUE',
        [tenantId, actorId]
      );
      if (!memberships[0]) return res.status(403).json({ error: 'TENANT_MEMBERSHIP_REQUIRED' });
      req.user = { ...req.user, role: memberships[0].role };
      next();
    } catch (error) { respondError(res, error); }
  });

  router.get('/policy', (_req, res) => {
    res.json({
      caseType: workflow.config.caseType,
      states: workflow.config.states,
      transitions: workflow.config.transitions,
      automatedFinalDecisions: false,
    });
  });

  router.get('/cases', async (req, res) => {
    try {
      const rows = await db.query(
        'SELECT id, subject_ref, case_type, state, policy_version, effective_at, version, retention_until, created_at, updated_at FROM governed_cases WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 200',
        [tenant(req)]
      );
      res.json(rows);
    } catch (error) { respondError(res, error); }
  });

  router.post('/cases', async (req, res) => {
    try {
      const ctx = workflow.context(req.headers, req.user);
      const item = workflow.createCase(req.body || {}, ctx);
      const inserted = await db.query(
        `INSERT INTO governed_cases
          (id, tenant_id, idempotency_key, case_type, subject_ref, state, policy_version, effective_at, source_snapshot, retention_until, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
         ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
         RETURNING *`,
        [item.id, item.tenantId, item.idempotencyKey, item.caseType, item.subjectRef, item.state,
          item.policyVersion, item.effectiveAt, JSON.stringify(item.sourceSnapshot), item.retentionUntil, item.createdBy]
      );
      if (inserted[0]) return res.status(201).json(inserted[0]);
      const existing = await db.query(
        'SELECT * FROM governed_cases WHERE tenant_id=$1 AND idempotency_key=$2',
        [ctx.tenantId, ctx.idempotencyKey]
      );
      return res.status(200).json({ ...existing[0], idempotentReplay: true });
    } catch (error) { respondError(res, error); }
  });

  router.get('/cases/:id', async (req, res) => {
    try {
      const rows = await db.query(
        `SELECT c.*, COALESCE(json_agg(e ORDER BY e.created_at) FILTER (WHERE e.id IS NOT NULL), '[]') AS evidence
         FROM governed_cases c LEFT JOIN governed_evidence e ON e.case_id=c.id AND e.tenant_id=c.tenant_id
         WHERE c.id=$1 AND c.tenant_id=$2 GROUP BY c.id`,
        [req.params.id, tenant(req)]
      );
      if (!rows[0]) return res.status(404).json({ error: 'CASE_NOT_FOUND' });
      res.json(rows[0]);
    } catch (error) { respondError(res, error); }
  });

  router.post('/cases/:id/evidence', async (req, res) => {
    try {
      const ctx = workflow.context(req.headers, req.user);
      const item = workflow.evidence(req.body || {});
      const rows = await db.query(
        `INSERT INTO governed_evidence
          (id, tenant_id, case_id, kind, source_ref, source_version, sha256, captured_at, consent_basis, metadata, created_by)
         SELECT $1,$2,c.id,$4,$5,$6,$7,$8,$9,$10::jsonb,$11 FROM governed_cases c
         WHERE c.id=$3 AND c.tenant_id=$2
         ON CONFLICT (tenant_id, case_id, sha256) DO NOTHING RETURNING *`,
        [item.id, ctx.tenantId, req.params.id, item.kind, item.sourceRef, item.sourceVersion,
          item.sha256, item.capturedAt, item.consentBasis, JSON.stringify(item.metadata), ctx.actorId]
      );
      if (!rows[0]) return res.status(409).json({ error: 'CASE_NOT_FOUND_OR_EVIDENCE_REPLAY' });
      res.status(201).json(rows[0]);
    } catch (error) { respondError(res, error); }
  });

  router.post('/cases/:id/assess', async (req, res) => {
    try {
      const ctx = workflow.context(req.headers, req.user);
      const assessment = workflow.deterministicAssessment(req.body || {});
      await db.query(
        `INSERT INTO governed_events
          (id, tenant_id, case_id, event_type, from_state, to_state, reason, actor_id, actor_role, details)
         SELECT $1,$2,c.id,'assessment',c.state,c.state,'Deterministic triage; no final decision',$4,$5,$6::jsonb
         FROM governed_cases c WHERE c.id=$3 AND c.tenant_id=$2`,
        [require('node:crypto').randomUUID(), ctx.tenantId, req.params.id, ctx.actorId, ctx.role, JSON.stringify(assessment)]
      );
      res.json(assessment);
    } catch (error) { respondError(res, error); }
  });

  router.post('/cases/:id/transitions', async (req, res) => {
    try {
      const ctx = workflow.context(req.headers, req.user);
      const result = await db.transaction(async (query) => {
        const cases = await query(
          `SELECT c.*, (SELECT count(*) FROM governed_evidence e WHERE e.case_id=c.id AND e.tenant_id=c.tenant_id) AS evidence_count
           FROM governed_cases c WHERE c.id=$1 AND c.tenant_id=$2 FOR UPDATE`,
          [req.params.id, ctx.tenantId]
        );
        if (!cases[0]) {
          const error = new Error('Case not found.');
          error.code = 'CASE_NOT_FOUND';
          error.status = 404;
          throw error;
        }
        const current = cases[0];
        const decision = workflow.transition({
          state: current.state, evidenceCount: current.evidence_count, createdBy: current.created_by,
        }, req.body || {}, ctx);
        const updated = await query(
          'UPDATE governed_cases SET state=$1, version=version+1, updated_at=NOW() WHERE id=$2 AND tenant_id=$3 AND version=$4 RETURNING *',
          [decision.to, current.id, ctx.tenantId, current.version]
        );
        if (!updated[0]) {
          const error = new Error('Case changed concurrently.');
          error.code = 'VERSION_CONFLICT';
          error.status = 409;
          throw error;
        }
        await query(
          `INSERT INTO governed_events
            (id, tenant_id, case_id, event_type, from_state, to_state, reason, actor_id, actor_role, details)
           VALUES ($1,$2,$3,'transition',$4,$5,$6,$7,$8,$9::jsonb)`,
          [decision.eventId, ctx.tenantId, current.id, current.state, decision.to, decision.reason,
            ctx.actorId, ctx.role, JSON.stringify({ idempotencyKey: ctx.idempotencyKey })]
        );
        return updated[0];
      });
      res.json(result);
    } catch (error) { respondError(res, error); }
  });

  router.post('/connector-failures', async (req, res) => {
    try {
      const ctx = workflow.context(req.headers, req.user);
      const { provider, operation, code, retryable = false } = req.body || {};
      if (![provider, operation, code].every((v) => tenantPattern.test(String(v || '')))) {
        return res.status(400).json({ error: 'FAILURE_RECORD_INVALID' });
      }
      const rows = await db.query(
        `INSERT INTO governed_connector_failures
          (id, tenant_id, provider, operation, error_code, retryable, actor_id, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (tenant_id, idempotency_key) DO UPDATE SET attempts=governed_connector_failures.attempts+1, last_seen_at=NOW()
         RETURNING *`,
        [require('node:crypto').randomUUID(), ctx.tenantId, provider, operation, code, Boolean(retryable), ctx.actorId, ctx.idempotencyKey]
      );
      res.status(201).json(rows[0]);
    } catch (error) { respondError(res, error); }
  });

  return router;
}

module.exports = { createGovernedRouter };
