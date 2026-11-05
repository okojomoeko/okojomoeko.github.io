# pyproject.toml & uv.lock Configuration Reference (Python 3.14+)

## 1. `pyproject.toml` ベストプラクティス構成例

```toml
[project]
name = "my-app"
version = "0.1.0"
description = "A modern Python CLI application"
readme = "README.md"
requires-python = ">=3.14"
dependencies = [
    "duckdb>=1.1.0",
    "pydantic>=2.10.0",
    "python-frontmatter>=3.1.0",
    "textual>=1.0.0",
]

[project.scripts]
my-app = "my_app.app:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[dependency-groups]
dev = [
    "mypy>=1.14.0",
    "pytest>=8.3.0",
    "pytest-asyncio>=0.25.0",
    "ruff>=0.9.0",
]

[tool.uv]
default-groups = ["dev"]

[tool.ruff]
line-length = 100
target-version = "py314"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

## 2. CI/CD GitHub Actions ワークフローの標準テンプレート

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v4
        with:
          enable-cache: true

      - name: Set up Python
        run: uv python install 3.14

      - name: Pin Python version
        run: uv python pin 3.14

      - name: Install dependencies (Strict Lock Check)
        run: uv sync --locked

      - name: Run Linters & Tests
        run: |
          uv run ruff check .
          uv run mypy src
          uv run pytest
```
