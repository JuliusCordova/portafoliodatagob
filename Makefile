.PHONY: test test-api lint-local validate-contracts

test: test-api validate-contracts

test-api:
	PYTHONPATH=apps/api/src python -m unittest discover -s apps/api/tests -p 'test_*.py'

validate-contracts:
	python -c "from pathlib import Path; required=[Path('docs/api/openapi.yaml'),Path('data/canonical/data_dictionary.json'),Path('data/canonical/entity_relationship_model.json')]; missing=[str(p) for p in required if not p.exists()]; assert not missing, f'Missing required contract artifacts: {missing}'; print('contract artifacts OK')"

lint-local:
	python -m compileall apps/api/src apps/api/tests
