# Sprint 41 · Sponsor acknowledgement and review outcome capture

## Objective

Close the executive decision loop by allowing the sponsor to record a review outcome for a Committee decision packet.

## Scope delivered

- Extended `/sponsor-review` with sponsor outcome capture.
- Added supported outcomes:
  - Sponsor acknowledged.
  - Sponsor observation.
  - Sponsor adjustment requested.
  - Sponsor paused.
- Added sponsor/reviewer name input.
- Added executive comment input with minimum traceability expectation.
- Persisted sponsor outcome data through existing `PATCH /api/demands/update`.
- Stored sponsor fields in `committee_inputs` to avoid core schema changes.
- Reflected sponsor outcome inside the printable decision packet.
- Reflected sponsor outcome inside the downloadable Markdown package.
- Added operating guide for sponsor acknowledgement.

## Implementation notes

The sprint intentionally reuses the existing update flow:

```text
/sponsor-review
  -> PATCH /api/demands/update
  -> PATCH /demands/{demand_id}
  -> update_demand_record(... committee_inputs ...)
```

This keeps the increment small and avoids introducing a separate approval engine prematurely.

## Sponsor fields

```text
sponsor_review_outcome
sponsor_review_label
sponsor_review_comment
sponsor_reviewed_by
sponsor_reviewed_at
sponsor_review_version
```

## Validation expected

- API tests.
- Web build.
- Container build API/Web.
- Deploy scripts validation.

## Known boundaries

This increment does not implement:

- Server-side PDF generation.
- Sponsor-specific authorization guardrail.
- Digital signature.
- Immutable evidence repository.
- Formal workflow engine.

## Recommended next sprint

Sprint 42 · Sponsor outcome guardrails and executive decision dashboard.
