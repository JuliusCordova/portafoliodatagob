# Sprint 26 · Pilot operations evidence and release notes

## Objective

Formalize the operational evidence package required to review and approve a controlled ATLAS DataGob pilot after Cloud Run deployment.

## Scope delivered

- Pilot evidence collector script.
- Makefile targets for evidence generation and validation.
- CI validation for the evidence collector.
- Evidence template for deployment identifiers, runtime configuration, smoke outputs and acceptance decision.
- Release notes template for executive and operational handoff.
- Runbook for producing the pilot evidence package.

## Files added

- `scripts/cloud_run/collect_pilot_evidence.py`
- `docs/deployment/evidence/pilot-operations-evidence-template.md`
- `docs/deployment/pilot-operations-evidence-runbook.md`
- `docs/release-notes/pilot-release-notes-template.md`
- `docs/sprints/sprint-26-pilot-operations-evidence-release-notes.md`

## Files updated

- `Makefile`
- `.github/workflows/deploy-scripts.yml`

## New commands

```bash
make validate-pilot-evidence-script
make collect-pilot-evidence
```

## Governance posture

The sprint is non-invasive. It does not deploy, mutate Cloud Run, call GCP APIs, change IAM, alter Firestore or execute smoke tests. It prepares evidence capture only.

## Pilot evidence flow

1. Deploy API and Web using the existing Cloud Run scripts.
2. Capture API/Web URLs and Cloud Run revision IDs.
3. Execute standard smoke.
4. Execute authenticated smoke.
5. Generate evidence pack with `collect_pilot_evidence.py`.
6. Complete release notes and decision section.
7. Attach outputs to the pilot approval record.

## Acceptance criteria

- Evidence collector compiles successfully in CI.
- Evidence template exists and covers URLs, revision IDs, smoke, auth, persistence and release decision.
- Release notes template exists and distinguishes included capabilities, validation evidence and known limitations.
- Runbook gives a repeatable operator path without requiring manual interpretation.

## Next increment

Sprint 27 · Controlled Cloud Run pilot execution: execute the deployment/smoke sequence in GCP, capture real URLs and evidence outputs, then complete the release notes package.
