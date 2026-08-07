.PHONY: test test-api lint-local

test: test-api

test-api:
	PYTHONPATH=apps/api/src python -m unittest discover -s apps/api/tests -p 'test_*.py'

lint-local:
	python -m compileall apps/api/src apps/api/tests
