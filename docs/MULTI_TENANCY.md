# Multi-Tenancy

← [AGENTS.md](../AGENTS.md) ← [docs/README.md](./README.md)

**Phase:** always
**Owner:** cross-cutting

---

## Isolation Model

Determine tenant isolation BEFORE database schema design.

| Model | Description | Query complexity | Data safety |
|-------|-------------|-----------------|-------------|
| Shared schema + tenant_id column | Single DB, single schema, filtered by tenant_id | Low | Manual — every query MUST filter |
| Schema-per-tenant | Single DB, separate schemas per tenant | Medium | Better — Postgres RLS optional |
| Database-per-tenant | Separate database per tenant | High | Best — strongest isolation |

Default: **Shared schema with tenant_id**. Upgrade to database-per-tenant only when compliance requires it.

## Queries

Every query that touches tenant-scoped data MUST include a `tenantId` filter. Coding agents MUST NOT write queries that operate across tenant boundaries without explicit approval.

## Config

```env
MULTI_TENANT_ENABLED=true
TENANT_ISOLATION_MODEL=shared_schema
```
