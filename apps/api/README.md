# ATLAS DataGob API

Backend MVP for the ATLAS DataGob product.

## Local test

```bash
PYTHONPATH=apps/api/src python -m unittest discover -s apps/api/tests -p 'test_*.py'
```

## Local API run

```bash
pip install -r apps/api/requirements.txt
PYTHONPATH=apps/api/src uvicorn atlas_datagob.api.main:app --reload --port 8080
```

## ADK note

`apps/api/src/atlas_datagob/agents/intake_agent.py` exposes an ADK-compatible `root_agent` when `google-adk` is installed. In minimal environments the deterministic tools remain importable and testable without ADK.
