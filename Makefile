.PHONY: test test-api lint-local validate-contracts smoke-policy seed-demo dev-api dev-web

test: test-api validate-contracts smoke-policy

test-api:
	PYTHONPATH=apps/api/src python -m unittest discover -s apps/api/tests -p 'test_*.py'

validate-contracts:
	python -c "from pathlib import Path; required=[Path('docs/api/openapi.yaml'),Path('data/canonical/data_dictionary.json'),Path('data/canonical/entity_relationship_model.json')]; missing=[str(p) for p in required if not p.exists()]; assert not missing, f'Missing required contract artifacts: {missing}'; print('contract artifacts OK')"

smoke-policy:
	PYTHONPATH=apps/api/src python scripts/smoke_policy_architecture.py

seed-demo:
	PYTHONPATH=apps/api/src python scripts/seed_demo_backlog.py

lint-local:
	python -m compileall apps/api/src apps/api/tests scripts

dev-api:
	PYTHONPATH=apps/api/src uvicorn atlas_datagob.api.main:app --reload --host 0.0.0.0 --port 8000

dev-web:
	cd apps/web && NEXT_PUBLIC_ATLAS_API_BASE=http://localhost:8000 npm run dev
