# POLICY-004 · Governance, Quality, Lineage and Access

## Purpose

Ensure that each data initiative defines minimum governance controls before execution or production readiness.

## Policy

A request is not governance-ready unless it identifies ownership, quality expectations, lineage needs, access conditions and operational expectations.

## Minimum Governance Checks

### Ownership

- Business sponsor.
- Data owner or candidate owner.
- Data steward or candidate steward.
- Technical owner when applicable.

### Quality

- Critical fields.
- Completeness checks.
- Validity checks.
- Duplicate checks.
- Business rule checks.
- Exception owner.

### Lineage and Metadata

- Source systems.
- Transformations.
- Target datasets.
- Consumer assets.
- Catalog description.
- Business glossary terms.

### Access and Privacy

- Consumer roles.
- Sensitive data identification.
- Access approval path.
- Required restrictions.
- Audit expectation.

### SLA and Retention

- Refresh frequency.
- Expected availability.
- Retention period.
- Support model.
- Incident handling.

## Validation Status

- `ready`: governance controls are sufficiently defined.
- `needs_clarification`: one or more governance roles or controls are incomplete.
- `policy_gap`: ownership, access or quality controls are missing.

## Common Gaps

- No data owner.
- No steward.
- Sensitive data without access rule.
- No catalog or lineage requirement.
- No retention or SLA expectation.
- Quality rules are mentioned but not measurable.
