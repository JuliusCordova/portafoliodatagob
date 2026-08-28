# SPEC-016 — Governance Catalog Administration

## Feature

**Feature 58 — Administración del Catálogo de Gobierno**

## Objective

Allow authorized ATLAS administrators to maintain the governance catalogs used by the Conversational Intake without editing Cloud Storage JSON manually.

The administration capability covers both:

- governance policies;
- approved architecture patterns.

Cloud Storage remains the authoritative runtime source. The administration experience is a governed control plane over the existing catalog, not a second source of truth.

## Product principle

> A policy or architecture version that has already been used by ATLAS must remain traceable. Removing it from future use means retiring it, not erasing its historical evidence.

## Lifecycle

Catalog records use the following lifecycle:

```text
Draft -> Active -> Retired
```

Rules:

1. Draft records are not visible to the conversational governance runtime.
2. Draft records may be edited or deleted by an authorized administrator.
3. Active records are immutable in place for business semantics. A material change requires a new version.
4. Activating a new version of an existing ID retires the previously active version in the same catalog update.
5. Retired records remain queryable for audit and historical Business Case traceability.
6. Only one active version per catalog ID is allowed.
7. Physical deletion of an active or retired record is prohibited.

The existing runtime behavior remains compatible because only records with `status=active` are loaded by `governance_catalog.py`.

## Catalogs

### Policies

Current canonical fields:

```json
{
  "id": "ML-001",
  "version": "1.0",
  "status": "active",
  "name": "Machine Learning production readiness",
  "applies_to": {
    "project_types": ["machine_learning"]
  },
  "mandatory_controls": ["model_registry", "drift_monitoring"],
  "recommendation": "..."
}
```

Administration must support:

- create policy draft;
- edit draft;
- clone an active version into a new draft version;
- change applicability;
- add/remove mandatory controls;
- update recommendation and descriptive metadata;
- activate a version;
- retire an active version;
- inspect version history.

### Architecture patterns

Current canonical fields:

```json
{
  "id": "GCP-ML-001",
  "version": "1.0",
  "status": "active",
  "project_types": ["machine_learning"],
  "name": "Governed Machine Learning Lifecycle",
  "required_components": ["sources", "silver", "gold", "model_registry"],
  "gcp_services": ["Cloud Storage", "BigQuery", "Vertex AI"],
  "principle": "..."
}
```

Administration must support:

- create architecture-pattern draft;
- edit draft;
- clone an active version into a new version;
- add/remove project types;
- add/remove required components;
- add/remove GCP services;
- update architectural principle and descriptive metadata;
- activate a version;
- retire an active version;
- inspect version history.

## Storage contract

Runtime source remains:

```text
gs://<ATLAS_GOVERNANCE_BUCKET>/<ATLAS_GOVERNANCE_PREFIX>/
  policies/
  architecture_patterns/
```

The first implementation remains backward-compatible with the current `catalog.json` aggregate files. A catalog update must:

1. read the current object generation;
2. validate the complete proposed catalog;
3. enforce one-active-version-per-ID;
4. write using a Cloud Storage generation precondition to prevent lost updates;
5. preserve the previous catalog as immutable audit evidence before publication;
6. emit an audit event containing actor, timestamp, catalog kind, record ID/version, action and change note.

No LLM is involved in catalog mutation.

## Runtime impact

The Conversational Intake continues to call the deterministic governance catalog loader. It immediately sees the newly active catalog version on the next evaluation without redeploying the agent.

Historical Business Cases keep their original `id@version` references and therefore remain reproducible even after a newer version becomes active.

## Permissions

Read:

```text
governance:catalog:read
```

Mutation:

```text
governance:catalog:write
governance:catalog:publish
```

V1 mutation is restricted to `platform_admin`.

Data Stewards and Data Architects may receive read access, but cannot publish catalog changes in V1.

## Security boundary

The stable conversational API must remain read-only against the governance bucket.

Catalog writes should be executed through an administration boundary with a service identity that has write access only to the configured governance bucket/prefix. The public conversational runtime service account must not gain broad Cloud Storage write permissions merely to support catalog maintenance.

The administration boundary must fail closed when authenticated administrator context is unavailable.

## API contract

Proposed generic administration endpoints:

```text
GET    /governance/catalog/{kind}
GET    /governance/catalog/{kind}/{record_id}
POST   /governance/catalog/{kind}
PATCH  /governance/catalog/{kind}/{record_id}/{version}
DELETE /governance/catalog/{kind}/{record_id}/{version}        # draft only
POST   /governance/catalog/{kind}/{record_id}/{version}/clone
POST   /governance/catalog/{kind}/{record_id}/{version}/activate
POST   /governance/catalog/{kind}/{record_id}/{version}/retire
GET    /governance/catalog/audit
```

`kind` is restricted to:

```text
policies
architecture_patterns
```

Every mutation requires a human-readable `change_note`.

## User experience

New route:

```text
/governance-catalog
```

The screen contains three tabs:

1. **Políticas**
2. **Patrones de arquitectura**
3. **Historial / Auditoría**

### Policy table

Primary columns:

- ID;
- name;
- version;
- status;
- applies to;
- mandatory-control count;
- last modification;
- actions.

### Architecture table

Primary columns:

- ID;
- name;
- version;
- status;
- project types;
- required-component count;
- GCP-service count;
- last modification;
- actions.

### Actions

For drafts:

```text
Edit | Delete draft | Activate
```

For active versions:

```text
View | Create new version | Retire
```

For retired versions:

```text
View | Clone as new version
```

Destructive-looking actions require explicit confirmation and a change note.

## Functional requirements

- FR58-01: List policy catalog with active, draft and retired versions.
- FR58-02: Create and edit policy drafts.
- FR58-03: Activate one policy version while retiring the prior active version for the same ID.
- FR58-04: Retire a policy without physically deleting historical versions.
- FR58-05: List architecture patterns with active, draft and retired versions.
- FR58-06: Create and edit architecture-pattern drafts.
- FR58-07: Activate one architecture-pattern version while retiring the prior active version for the same ID.
- FR58-08: Retire an architecture pattern from future matching without erasing historical evidence.
- FR58-09: Validate schema and catalog invariants before any publication.
- FR58-10: Require change note and authenticated actor for mutations.
- FR58-11: Preserve an immutable audit trail for every catalog mutation.
- FR58-12: Prevent concurrent administrators from silently overwriting each other.
- FR58-13: Make newly activated definitions available to the Conversational Intake without agent redeployment.

## Non-functional requirements

- NFR58-01: Cloud Storage remains the source of truth.
- NFR58-02: No LLM may create, publish, retire or delete governance catalog records autonomously.
- NFR58-03: Published historical versions remain traceable by `id@version`.
- NFR58-04: Catalog mutations use optimistic concurrency / GCS generation preconditions.
- NFR58-05: Stable Intake runtime retains read-only governance-bucket access.
- NFR58-06: Mutation APIs are disabled/fail closed without an authenticated administration boundary.
- NFR58-07: Current `governance_catalog.py` read behavior remains backward compatible.

## Acceptance criteria

- AC58-01: Admin can create a draft policy without changing current Intake behavior.
- AC58-02: Activating a new policy version makes it the only active version for that ID.
- AC58-03: Existing Business Cases referencing the old version remain auditable.
- AC58-04: Admin can retire a policy and it no longer applies to new Intake assessments.
- AC58-05: Admin can create, version, activate and retire architecture patterns.
- AC58-06: Retired architecture patterns are not selected for new assessments.
- AC58-07: Draft deletion is allowed; active/retired physical deletion is rejected.
- AC58-08: Every mutation records actor, timestamp, action and change note.
- AC58-09: Two concurrent updates cannot silently overwrite each other.
- AC58-10: A catalog activation becomes visible to new conversational evaluations without redeploying ATLAS.

## Out of scope V1

- multi-step approval workflow for catalog publication;
- automatic policy generation by Gemini;
- automatic architecture generation by Gemini;
- cross-cloud architecture catalogs beyond the existing GCP scope;
- full enterprise IAM/OIDC implementation beyond the administration security boundary required for safe writes.
