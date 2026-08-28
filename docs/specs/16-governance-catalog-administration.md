# SPEC-016 — Governance Catalog Administration

## Feature

**Feature 58 — Administración del Catálogo de Gobierno**

## Objective

Allow authorized members of the **Comité Operativo** to maintain the governance catalogs used by the Conversational Intake without editing Cloud Storage JSON manually.

The administration capability covers both:

- governance policies;
- approved architecture patterns.

Cloud Storage remains the authoritative runtime source. The administration experience is a governed control plane over the existing catalog, not a second source of truth.

## Product principle

> A policy or architecture version that has already been used by ATLAS must remain traceable. Removing it from future use means retiring it, not erasing its historical evidence.

## Access principle

> Governance catalog administration is an internal Comité Operativo capability and is not part of the business-user experience.

Rules:

1. Only users with role `committee_member` may access `/governance-catalog`.
2. Business-facing roles must not see the navigation entry.
3. Direct URL access by non-committee roles must be rejected with HTTP 403.
4. Catalog read/write/publish administration APIs require `committee_member` role, not only a generic permission check.
5. `data_owner`, `data_steward`, `data_architect`, `executive` and other business-facing users cannot list, create, edit, activate, retire or inspect catalog administration history through this module.
6. Business-facing users may learn about existing governance policies only through the ATLAS Conversational Intake. They do not receive a direct policy-catalog browser or policy-list API.
7. The Conversational Intake and its specialist agents continue to consume only the active catalog through the existing read-only runtime service; this does not grant end users access to the administration screen.
8. A technical `platform_admin` does not obtain catalog-maintenance capability merely because of the wildcard permission model; Feature 58 must enforce the explicit `committee_member` role for this route and mutation boundary. If a technical administrator needs to operate this module, that identity must also be assigned `committee_member` according to governance procedure.

## Business-user policy consultation

Business users interact with governance policy knowledge exclusively through the ATLAS conversational experience.

Allowed interaction:

```text
Business user
    -> ATLAS Conversational Intake
        -> Policy & Controls Agent
            -> active governance policy catalog
```

The conversational agent may answer questions such as:

- "¿Qué políticas aplican a mi iniciativa?"
- "¿Qué exige la política de Machine Learning?"
- "¿Qué controles de seguridad debo considerar?"
- "¿Existe alguna política para agentes de IA?"
- "¿Qué políticas están vigentes para este caso?"

Rules:

1. The conversational agent may expose only policy records with `status=active` to business-facing users.
2. Responses must be grounded in the deterministic governance catalog and must not invent policy requirements.
3. When useful, the response should preserve traceability using `id@version`, policy name, applicable mandatory controls and the catalog recommendation in business language.
4. Draft policies are internal working material of the Comité Operativo and must never be disclosed to business-facing users through the conversational agent.
5. Retired policies and catalog administration history are not part of the normal business-user conversational experience.
6. Business users cannot request the agent to create, modify, activate, retire, delete or publish a policy or architecture definition.
7. Requests such as "cambia esta política", "crea una nueva política" or "elimina este patrón" must be rejected as unauthorized governance mutations and, when appropriate, direct the user to the Comité Operativo process.
8. Business-facing users must not receive direct access to `GET /policies`, `/governance/catalog/*` or equivalent raw-catalog endpoints.
9. Business-facing users must not receive direct access to the governance-catalog diagnostic payload if it exposes catalog-management information not needed for the conversational business experience.
10. The Policy & Controls Agent is the business-facing policy consultation boundary; the governance catalog itself remains an internal governed asset.

## Lifecycle

Catalog records use the following lifecycle:

```text
Draft -> Active -> Retired
```

Rules:

1. Draft records are not visible to the conversational governance runtime.
2. Draft records may be edited or deleted by an authorized Comité Operativo member.
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

## Permissions and role enforcement

Feature 58 uses explicit Comité Operativo role enforcement.

Administration read:

```text
governance:catalog:read
```

Mutation:

```text
governance:catalog:write
governance:catalog:publish
```

All three permissions are granted only in the Feature 58 administration boundary to authenticated identities with:

```text
committee_member
```

The API must verify the role explicitly and must not authorize this module solely because another role has broad or wildcard permissions.

Business-facing roles do not receive Feature 58 catalog administration permissions or direct raw-policy catalog read access. Policy consultation for those roles occurs through `/intake/conversation` and the Policy & Controls Agent.

Existing generic `policy:read` behavior must be reviewed during Feature 58 implementation so that it cannot expose `GET /policies` or equivalent raw catalog data to business-facing roles contrary to this boundary.

## Security boundary

The stable conversational API must remain read-only against the governance bucket.

Catalog writes should be executed through an administration boundary with a service identity that has write access only to the configured governance bucket/prefix. The public conversational runtime service account must not gain broad Cloud Storage write permissions merely to support catalog maintenance.

The administration boundary must fail closed when authenticated Comité Operativo context is unavailable.

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

Every route in this administration API requires explicit `committee_member` role validation.

Raw policy-list APIs intended for internal/runtime use must not be exposed to business-facing roles. Business policy consultation is mediated by the conversational endpoint.

## User experience

New route:

```text
/governance-catalog
```

The route is rendered in navigation only when the current session includes `committee_member`.

For all other roles:

- the menu item is absent;
- direct page access returns an access-restricted experience / 403;
- administration API calls return 403;
- there is no alternate business-user catalog-list screen;
- questions about existing policies are handled conversationally by ATLAS.

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

- FR58-01: Committee member can list policy catalog with active, draft and retired versions.
- FR58-02: Committee member can create and edit policy drafts.
- FR58-03: Committee member can activate one policy version while retiring the prior active version for the same ID.
- FR58-04: Committee member can retire a policy without physically deleting historical versions.
- FR58-05: Committee member can list architecture patterns with active, draft and retired versions.
- FR58-06: Committee member can create and edit architecture-pattern drafts.
- FR58-07: Committee member can activate one architecture-pattern version while retiring the prior active version for the same ID.
- FR58-08: Committee member can retire an architecture pattern from future matching without erasing historical evidence.
- FR58-09: Validate schema and catalog invariants before any publication.
- FR58-10: Require change note and authenticated actor for mutations.
- FR58-11: Preserve an immutable audit trail for every catalog mutation.
- FR58-12: Prevent concurrent committee members from silently overwriting each other.
- FR58-13: Make newly activated definitions available to the Conversational Intake without agent redeployment.
- FR58-14: Non-committee users must not see the governance catalog navigation entry.
- FR58-15: Non-committee users must receive HTTP 403 for all Feature 58 administration routes.
- FR58-16: Business-facing users can ask ATLAS conversationally about active policies relevant to their initiative.
- FR58-17: The Policy & Controls Agent must ground business-user policy answers exclusively in active deterministic catalog records.
- FR58-18: Business-facing users cannot directly list the raw policy catalog through `GET /policies`, `/governance/catalog/*` or an equivalent endpoint.
- FR58-19: Draft and retired policies must not be exposed through normal business-user conversations.
- FR58-20: The conversational agent must reject requests from business-facing users to mutate policy or architecture definitions.

## Non-functional requirements

- NFR58-01: Cloud Storage remains the source of truth.
- NFR58-02: No LLM may create, publish, retire or delete governance catalog records autonomously.
- NFR58-03: Published historical versions remain traceable by `id@version`.
- NFR58-04: Catalog mutations use optimistic concurrency / GCS generation preconditions.
- NFR58-05: Stable Intake runtime retains read-only governance-bucket access.
- NFR58-06: Mutation APIs are disabled/fail closed without an authenticated Comité Operativo member.
- NFR58-07: Current `governance_catalog.py` read behavior remains backward compatible.
- NFR58-08: Feature 58 authorization uses explicit `committee_member` role enforcement and cannot be bypassed by business-facing roles or generic wildcard permissions.
- NFR58-09: Business policy consultation is mediated through the conversational agent and does not expose internal draft, retired or administration catalog state.

## Acceptance criteria

- AC58-01: Committee member can create a draft policy without changing current Intake behavior.
- AC58-02: Activating a new policy version makes it the only active version for that ID.
- AC58-03: Existing Business Cases referencing the old version remain auditable.
- AC58-04: Committee member can retire a policy and it no longer applies to new Intake assessments.
- AC58-05: Committee member can create, version, activate and retire architecture patterns.
- AC58-06: Retired architecture patterns are not selected for new assessments.
- AC58-07: Draft deletion is allowed; active/retired physical deletion is rejected.
- AC58-08: Every mutation records actor, timestamp, action and change note.
- AC58-09: Two concurrent updates cannot silently overwrite each other.
- AC58-10: A catalog activation becomes visible to new conversational evaluations without redeploying ATLAS.
- AC58-11: A `committee_member` sees and can access `/governance-catalog`.
- AC58-12: `data_owner`, `data_steward`, `data_architect`, `executive` and other non-committee roles do not see the route and receive 403 on direct access.
- AC58-13: `platform_admin` without `committee_member` cannot administer Feature 58 solely through wildcard permission inheritance.
- AC58-14: A business user can ask "¿Qué políticas aplican a mi iniciativa?" and receives an answer grounded only in active policy records.
- AC58-15: A business user asking for a draft or retired policy does not receive internal catalog content.
- AC58-16: A business user cannot directly call a raw policy catalog list endpoint successfully.
- AC58-17: A business user asking ATLAS to modify, create, activate or retire a policy receives a governed refusal and no catalog state changes.

## Out of scope V1

- multi-step approval workflow for catalog publication;
- automatic policy generation by Gemini;
- automatic architecture generation by Gemini;
- cross-cloud architecture catalogs beyond the existing GCP scope;
- full enterprise IAM/OIDC implementation beyond the administration security boundary required for safe writes.
