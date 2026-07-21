# Governed workflow operations

The product path is `/api/governed-workflow`. It is a durable, tenant-scoped state machine; generated `batch03Gaps` routes are no longer mounted.

## Installation and database

1. Copy `.env.example` to `.env` and replace every secret.
2. Run `./scripts/bootstrap.sh` to install lockfile-pinned dependencies.
3. Run `./scripts/migrate.sh` as a deployment step.
4. Provision tenant membership out of band with least privilege:
   `INSERT INTO governed_tenant_memberships (tenant_id, actor_id, role, granted_by) VALUES (...);`
5. Run `./start.sh`. It starts only project-owned processes and never installs, seeds, migrates, creates databases, or kills ports.
6. Demo data is destructive/untrusted and requires `CONFIRM_DEMO_SEED=yes ./scripts/seed-demo.sh`; it is forbidden in production.

Every workflow mutation requires a verified bearer token, `X-Tenant-Id`, and `Idempotency-Key`. Membership role is read from the database, not trusted from request headers. Evidence stores hashes, source versions, timestamps and approved references—not raw sensitive content. Events and evidence are append-only; cases use optimistic versions and consequential transitions use dual control.

## Domain and provider boundary

Receipt content stays in approved document storage. Effective-dated policy and ledger evidence are snapshotted; submitters cannot approve their own reports and deterministic rules only route exceptions.

External adapters are disabled by default in `.env.example`. A provider is not production-ready until credentials are provisioned, request/response contracts are tested, source versions and retry/idempotency semantics are recorded, failures are written to `governed_connector_failures`, and the applicable professional owner signs off. Local code and CI do not establish licensed data, hardware, government gateway, safety, legal, clinical, or regulatory validation.
