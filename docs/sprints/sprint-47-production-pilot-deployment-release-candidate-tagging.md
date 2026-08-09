# Sprint 47 · Production pilot deployment and release candidate tagging

## Executive summary

Sprint 47 prepares ATLAS DataGob for controlled production pilot execution.

The product was already completed as pilot-ready through Sprint 46. This sprint formalizes the operational path to create the release candidate tag, deploy API/Web to Cloud Run, execute smoke validations, capture evidence, and declare GO / NO-GO.

## Scope

Included:

- Production pilot deployment guide.
- Release candidate tagging plan.
- Cloud Run pilot deployment sequence.
- Validation gates.
- Evidence capture expectations.
- GO / NO-GO criteria.

Not included:

- New product functionality.
- New API endpoints.
- Backend schema changes.
- Workflow engine.
- Immutable evidence store.
- Digital signatures.
- Managed service automation.

## Files added

```text
docs/deployment/production-pilot-deployment-v1.0-rc1.md
docs/release/release-candidate-tagging-v1.0-rc1.md
docs/sprints/sprint-47-production-pilot-deployment-release-candidate-tagging.md
```

## Recommended target tag

```text
atlas-datagob-v1.0-rc1
```

The tag should be created only after this sprint is merged into `main`.

## Production pilot sequence

```text
1. Approve Sprint 47 PR.
2. Merge Sprint 47 into main.
3. Pull latest main in Cloud Shell.
4. Create tag atlas-datagob-v1.0-rc1.
5. Push tag to origin.
6. Configure pilot environment variables.
7. Execute controlled Cloud Run deployment.
8. Execute smoke tests.
9. Execute authenticated smoke if auth is enabled.
10. Execute production promotion gate.
11. Capture evidence.
12. Declare GO / NO-GO.
```

## Validation expected in CI

- API tests.
- Web build.
- Container build API.
- Container build Web.
- Deploy scripts validation.

## Acceptance criteria

Sprint 47 is accepted when:

- PR is merged into `main`.
- CI is green.
- Deployment guide exists.
- Tagging plan exists.
- GO / NO-GO criteria are documented.
- The next action is executable from Cloud Shell.

## Project status after Sprint 47

```text
Product construction:        100%
Pilot-ready package:         100%
Production pilot readiness:  100%
Actual pilot deployment:     pending execution
```

## Next operational step after merge

```bash
cd ~/portafoliodatagob
git checkout main
git pull origin main
git tag -a atlas-datagob-v1.0-rc1 -m "ATLAS DataGob v1.0 Release Candidate 1"
git push origin atlas-datagob-v1.0-rc1
```

Then continue with the Cloud Run controlled pilot deployment guide.
