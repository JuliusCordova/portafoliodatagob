# ATLAS DataGob Web

Frontend MVP for ATLAS DataGob.

## Sprint 05 focus

The current UI is an executive intake cockpit for the Policy RAG and architecture validation flow.

It provides:

- Business requirement capture.
- Target consumption selection: BI, ML, GenAI/RAG or streaming.
- Policy gap visualization.
- Architecture gap visualization.
- FinOps gap visualization.
- End-to-end architecture rail from sources to consumption.
- Operative Committee routing summary.
- Explicit Data Architect final validation.

## API integration

By default the UI runs in demo mode using local sample data.

To connect it to the backend endpoint, configure:

```bash
NEXT_PUBLIC_ATLAS_API_BASE=http://localhost:8000
```

The UI will call:

```text
POST /intake/policy-architecture-validate
```

If the API is not available, it gracefully falls back to demo mode.
