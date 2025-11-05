.PHONY: llm-validate llm-test

ENV ?=.env
export $(shell sed 's/=.*//' $(ENV) 2>/dev/null)

llm-validate:
	@python scripts/llm_validation_runner.py

llm-test:
	@pytest -q tests/test_llm_validation.py
