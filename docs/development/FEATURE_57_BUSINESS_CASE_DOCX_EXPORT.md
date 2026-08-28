# Feature 57 — Business Case DOCX Export

## Objective

Allow a business user to download the completed ATLAS **Canonical Business Case** as a professional Microsoft Word document after the conversational Intake reaches its Definition of Ready.

The document is an output artifact of the governed Intake. It is **not** a second LLM-generated interpretation of the conversation.

## Product rule

> The DOCX must be generated deterministically from the Canonical Business Case stored in the ADK session.

Therefore:

- no additional Gemini call is executed during export;
- the exporter cannot invent or rewrite business facts;
- architecture and policy references remain the exact values already validated by ATLAS;
- missing values are shown as `No definido` instead of being inferred;
- downloading the document does not register a demand or mutate lifecycle state.

## User experience

When `business_case.ready_to_register = true`, the Intake side panel exposes:

1. `Descargar Caso de Negocio (.docx)`
2. `Confirmar y registrar requerimiento`

The two actions are independent. A user may download and review the document before deciding whether to register the requirement.

When Definition of Ready is not complete, both actions remain disabled.

## API

### POST `/intake/business-case/document`

Payload:

```json
{
  "session_id": "intake-..."
}
```

Authorization: `intake:validate`.

Behavior:

- loads the authoritative ADK session state;
- materializes the current Canonical Business Case;
- rejects export with HTTP 409 when `ready_to_register != true`;
- renders a DOCX in memory using `python-docx`;
- returns the official Office Open XML MIME type and `Content-Disposition: attachment`;
- does not persist a new demand and does not change the session state.

### Backward-compatible API contract

Feature 57 extends the existing Feature 54 API without changing its global API version. `API_VERSION` and the OpenAPI `info.version` remain `0.8.0` so the established Feature 54 runtime and contract tests stay valid. The DOCX endpoint is an additive, backward-compatible capability and does not alter existing conversational, registration, scoring, committee or lifecycle semantics.

Regression checkpoint: the initial Feature 57 draft changed the global version to `0.8.1`, which caused three established Feature 54 contract tests to fail. The fix preserves the existing `0.8.0` contract rather than weakening or rewriting those tests.

## Word document structure

The generated document follows an executive Business Case structure:

1. Executive summary
2. Business problem or opportunity
3. Objective and expected outcome
4. Stakeholders and organizational scope
5. Data and Data Readiness
6. Initiative classification
7. Recommended GCP architecture
8. Governance, policies and controls
9. Risks, gaps and considerations
10. Next steps
11. Artifact traceability

The cover also includes:

- completeness percentage;
- Definition of Ready status;
- session ID;
- initiative type/subtype;
- preliminary risk;
- generation timestamp.

## Governance disclaimer

Every generated document states that it is produced from the Canonical Business Case and does not constitute:

- Committee approval;
- investment authorization;
- production approval.

## Technical implementation

Backend:

```text
apps/api/src/atlas_datagob/services/business_case_document.py
apps/api/src/atlas_datagob/api/feature54_app.py
```

Web:

```text
apps/web/src/app/api/intake/business-case/document/route.ts
apps/web/src/app/components/ConversationalIntake.tsx
```

Dependency:

```text
python-docx>=1.1,<2.0
```

## Isolated Cloud Run preview

Preview deployment is implemented by:

```text
scripts/cloud_run/deploy_feature57_preview.sh
```

The preview follows the same isolation principle used by prior ATLAS feature previews:

- API service: `atlas-datagob-api-f57-preview`;
- Web service: `atlas-datagob-web-f57-preview`;
- demand collection: `atlas_demands_f57_preview`;
- stable services `atlas-datagob-api` and `atlas-datagob-web` are not redeployed or modified;
- the preview reuses only the already-approved stable configuration required for durable ADK sessions and the governed Cloud Storage catalog;
- the preview uses a dedicated static preview identity;
- API health must continue reporting `0.8.0`;
- `/intake` and Web → API governance proxy must return successfully before the preview is considered conformant.

This isolation allows a real Gemini ADK conversation and DOCX download test without risking demand writes to the stable Firestore backlog.

## Acceptance criteria

- AC57-01: export is disabled while the Business Case is incomplete.
- AC57-02: a ready Business Case can be downloaded as `.docx` before registration.
- AC57-03: export does not invoke Gemini.
- AC57-04: export does not create/update a demand.
- AC57-05: document content comes only from the canonical Business Case and deterministic metadata.
- AC57-06: architecture pattern IDs/versions and policy references are preserved.
- AC57-07: missing values are not invented.
- AC57-08: the generated file opens as a valid Office Open XML Word document.
- AC57-09: the document includes an explicit governance disclaimer and traceability metadata.
- AC57-10: existing registration and committee behavior remains unchanged.
- AC57-11: Feature 54 API version remains `0.8.0`; Feature 57 is additive and backward compatible.
- AC57-12: preview demand persistence is isolated in `atlas_demands_f57_preview` and stable Cloud Run services remain unchanged.

## Local validation checkpoint — 2026-08-28

Validated from Cloud Shell on the Feature 57 branch after the backward-compatibility fix:

```text
Ran 145 tests in 0.343s
OK
contract artifacts OK
policy architecture smoke OK
Python compileall PASS
Cloud Run deploy-script syntax PASS
Next.js production build PASS
TypeScript PASS
git diff --check PASS
```

GitHub Actions were not used as the authoritative gate for this checkpoint because all four workflows were terminating before executing steps. The repository owner indicated that the monthly GitHub Actions minutes quota may be exhausted. Local gates provide the functional evidence for the feature branch until hosted CI capacity is restored.

## Current status

```text
Implementation              COMPLETE
DOCX unit/contract tests     PASS
Full API regression suite    145/145 PASS
Web production build         PASS
Deploy-script syntax         PASS
Backward compatibility       PASS — API 0.8.0 preserved
Isolated preview script      READY
Cloud Run preview            PENDING
Real conversational DOCX E2E PENDING
Merge                        NOT AUTHORIZED
Production promotion         NOT AUTHORIZED
```

## Visual QA baseline

A representative 100%-complete ML/forecasting Business Case was rendered through the project DOCX QA workflow. The validated baseline is a clean three-page document with no clipping or broken tables.
