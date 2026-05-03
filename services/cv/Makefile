.PHONY: install dev test deploy lint

install:
	uv sync

install-ml:
	uv sync --extra ml --extra dev

dev:
	uv run uvicorn app:app --reload --port 8787

test:
	uv run pytest -q

lint:
	uv run ruff check .

format:
	uv run ruff format .

deploy:
	uv run modal deploy modal_deploy.py
