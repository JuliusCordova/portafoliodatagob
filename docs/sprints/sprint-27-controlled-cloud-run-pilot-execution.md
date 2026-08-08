# Sprint 27 · Controlled Cloud Run pilot execution

## Goal

Move from deployment preparation to controlled pilot execution by adding a single orchestrated command that can validate configuration, optionally deploy Cloud Run services, run standard and authenticated smoke checks, and produce the operational evidence package.

## Scope

- Add controlled pilot execution orchestrator.
- Keep deployment disabled by default.
- Resolve Cloud Run service URLs.
- Run standard smoke checks.
- Run authenticated smoke checks.
- Generate evidence package using the Sprint 26 collector.
- Add Makefile target.
- Add Cloud Run env variables for execution control.
- Add operational runbook.

## Artifacts

- `scripts/cloud_run/run_controlled_pilot_execution.sh`
- `make controlled-pilot-execution`
- `docs/deployment/cloud-run.env.example`
- `docs/deployment/controlled-cloud-run-pilot-execution.md`

## Safety decisions

The orchestrator does not deploy by default.

```bash
export ATLAS_PILOT_EXECUTE_DEPLOY=false
```

Deployment must be explicitly enabled:

```bash
export ATLAS_PILOT_EXECUTE_DEPLOY=true
```

The script writes evidence under:

```text
docs/deployment/evidence/generated/<timestamp>/
```

## Validation

Expected CI gates:

- API tests.
- Web build.
- Container build API.
- Container build Web.
- Deploy scripts syntax.
- Standard smoke script compile.
- Authenticated smoke script compile.
- Pilot evidence collector compile.

## Next sprint

Sprint 28 · Pilot dashboard polish and executive demo readiness.
