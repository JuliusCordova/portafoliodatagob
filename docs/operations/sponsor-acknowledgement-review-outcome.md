# Sponsor acknowledgement and review outcome

Sprint 41 adds a pragmatic executive closure step to ATLAS DataGob.

## Purpose

The Sponsor Review view is no longer only a printable evidence screen. It can now capture the sponsor's review outcome against a demand that already has a formal Committee decision.

## Route

```text
/sponsor-review
```

## Supported sponsor outcomes

- `sponsor_acknowledged`: the sponsor gives executive acknowledgement and allows the demand to continue.
- `sponsor_observation`: the sponsor leaves observations without blocking the demand.
- `sponsor_adjustment_requested`: the sponsor requires adjustment before the next step.
- `sponsor_paused`: the sponsor pauses the demand pending new executive direction.

## Data captured

The review is stored inside `committee_inputs` to avoid changing the core demand schema during this increment.

Stored fields:

```text
sponsor_review_outcome
sponsor_review_label
sponsor_review_comment
sponsor_reviewed_by
sponsor_reviewed_at
sponsor_review_version
```

The backend also appends a standard `demand_updated` event through the existing demand update flow.

## Usage flow

1. Open `/sponsor-review`.
2. Select a demand with a Committee decision.
3. Review the executive decision packet.
4. Choose the sponsor outcome.
5. Add or edit the executive comment.
6. Register the sponsor result.
7. Export the refreshed package as Markdown or print/save as PDF from the browser.

## Current boundaries

This sprint does not introduce:

- Server-side PDF generation.
- Digital signature.
- Immutable evidence store.
- Formal sponsor approval workflow engine.
- Separate sponsor authorization policy.

Those remain candidates for later hardening.
