BEGIN;

CREATE TABLE IF NOT EXISTS governed_tenant_memberships (
  tenant_id VARCHAR(128) NOT NULL,
  actor_id VARCHAR(128) NOT NULL,
  role VARCHAR(80) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by VARCHAR(128) NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, actor_id)
);

CREATE TABLE IF NOT EXISTS governed_cases (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  case_type VARCHAR(80) NOT NULL,
  subject_ref VARCHAR(128) NOT NULL,
  state VARCHAR(64) NOT NULL,
  policy_version VARCHAR(128) NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  retention_until TIMESTAMPTZ,
  created_by VARCHAR(128) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS governed_evidence (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL,
  case_id UUID NOT NULL REFERENCES governed_cases(id) ON DELETE RESTRICT,
  kind VARCHAR(80) NOT NULL,
  source_ref TEXT NOT NULL DEFAULT '',
  source_version VARCHAR(128) NOT NULL,
  sha256 CHAR(64) NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  captured_at TIMESTAMPTZ NOT NULL,
  consent_basis VARCHAR(160),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, case_id, sha256)
);

CREATE TABLE IF NOT EXISTS governed_events (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL,
  case_id UUID NOT NULL REFERENCES governed_cases(id) ON DELETE RESTRICT,
  event_type VARCHAR(40) NOT NULL,
  from_state VARCHAR(64) NOT NULL,
  to_state VARCHAR(64) NOT NULL,
  reason TEXT NOT NULL,
  actor_id VARCHAR(128) NOT NULL,
  actor_role VARCHAR(80) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS governed_connector_failures (
  id UUID PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL,
  provider VARCHAR(128) NOT NULL,
  operation VARCHAR(128) NOT NULL,
  error_code VARCHAR(128) NOT NULL,
  retryable BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts > 0),
  actor_id VARCHAR(128) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS governed_cases_tenant_state_idx ON governed_cases(tenant_id, state, updated_at DESC);
CREATE INDEX IF NOT EXISTS governed_evidence_case_idx ON governed_evidence(tenant_id, case_id, captured_at);
CREATE INDEX IF NOT EXISTS governed_events_case_idx ON governed_events(tenant_id, case_id, created_at);

CREATE OR REPLACE FUNCTION reject_governance_history_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'governance history is append-only';
END;
$$;

DROP TRIGGER IF EXISTS governed_evidence_immutable ON governed_evidence;
CREATE TRIGGER governed_evidence_immutable
BEFORE UPDATE OR DELETE ON governed_evidence
FOR EACH ROW EXECUTE FUNCTION reject_governance_history_mutation();

DROP TRIGGER IF EXISTS governed_events_immutable ON governed_events;
CREATE TRIGGER governed_events_immutable
BEFORE UPDATE OR DELETE ON governed_events
FOR EACH ROW EXECUTE FUNCTION reject_governance_history_mutation();

COMMIT;
