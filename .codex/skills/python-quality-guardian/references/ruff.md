# ruff リファレンス

公式ドキュメント: https://docs.astral.sh/ruff/

## 主要コマンド

```bash
uv run ruff check .              # lint チェック
uv run ruff check --fix .        # 自動修正
uv run ruff format .             # フォーマット
uv run ruff format --check .     # フォーマットチェックのみ（CI向け）
uv run ruff check --watch .      # ファイル変更監視
```

## 推奨 pyproject.toml 設定

```toml
[tool.ruff]
line-length = 88
target-version = "py312"
exclude = [".venv", "dist", "build", "__pycache__"]

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "I",    # isort
    "B",    # flake8-bugbear (一般的なバグパターン)
    "UP",   # pyupgrade (最新構文への移行)
    "N",    # pep8-naming
    "ANN",  # flake8-annotations (型注釈の強制)
    "S",    # flake8-bandit (セキュリティ)
    "C90",  # mccabe 複雑度
    "RUF",  # Ruff 固有ルール
    "SIM",  # flake8-simplify
    "PTH",  # pathlib の使用推進
    "ERA",  # コメントアウトコードの検出
]
ignore = [
    "ANN101",  # self の型注釈（不要）
    "ANN102",  # cls の型注釈（不要）
    "E501",    # 行長（ruff format に任せる）
]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = [
    "S101",   # assert の使用を許可（pytest）
    "ANN",    # テストでの型注釈省略を許可
]
"**/migrations/**" = ["ALL"]  # DBマイグレーションは除外

[tool.ruff.lint.mccabe]
max-complexity = 10

[tool.ruff.lint.isort]
known-first-party = ["my_project"]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
skip-magic-trailing-comma = false
line-ending = "auto"
docstring-code-format = true
```

## ルールコード早見表

| コード | 説明 |
|--------|------|
| `E`/`W` | PEP8 スタイル |
| `F` | 未使用変数・import |
| `I` | import ソート |
| `B` | バグになりやすいパターン |
| `UP` | 古い構文 → 新しい構文 |
| `N` | 命名規則 |
| `ANN` | 型注釈の欠如 |
| `S` | セキュリティリスク |
| `C90` | 複雑度 |
| `SIM` | 簡略化できるコード |
| `PTH` | `os.path` → `pathlib` |

## インライン抑制

```python
x = 1  # noqa: F841          # 特定ルールを無効化
x = 1  # noqa                 # その行の全ルールを無効化（非推奨）
```

`# noqa` の乱用はアンチパターン。根本的な修正を優先する。

## pre-commit 連携

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.0
    hooks:
      - id: ruff-check
        args: [--fix]
      - id: ruff-format
```
