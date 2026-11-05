---
name: python-quality-guardian
description: |
  A skill for designing, implementing, and ensuring the quality of professional-grade Python projects.
  Defines a modern Python development workflow leveraging uv, ruff, pyrefly, pytest,
  hypothesis, great-expectations, and lizard.

  This skill must always be referenced in the following scenarios:
  - Setting up and scaffolding new Python projects
  - Creating and editing pyproject.toml
  - Managing packages and dependencies (uv)
  - Applying type annotations and performing type checking (pyrefly)
  - Configuring linting and formatting (ruff)
  - Designing and implementing tests (pytest, hypothesis)
  - Validating data quality (great-expectations)
  - Measuring code complexity and guiding refactoring decisions (lizard)
  - Consulting on Python architecture, design patterns, and anti-patterns
  - Designing repository structure
  - Defining Python quality gates in CI/CD pipelines
---

# Python Professional Skill

Pythonプロフェッショナルとして、このスキルに従い一貫した高品質なコードを生成する。

## ツールチェーン概要

| 役割 | ツール | コマンド |
|------|--------|---------|
| パッケージ・環境管理 | uv | `uv add`, `uv run`, `uv sync` |
| linting・フォーマット | ruff | `uv run ruff check --fix`, `uv run ruff format` |
| 型チェック | pyrefly | `uv run pyrefly check` |
| テスト | pytest | `uv run pytest` |
| プロパティベーステスト | hypothesis | pytest と組み合わせて使用 |
| データ品質検証 | great-expectations | `uv run great_expectations` |
| 複雑度計測 | lizard | `uv run lizard -l python -C 10 src/` |

---

## 1. プロジェクト初期化 (uv)

新規プロジェクトは必ず uv で作成する。

```bash
# アプリケーション
uv init my-project
cd my-project
uv python pin 3.12

# ライブラリ
uv init --lib my-lib

# 依存関係追加
uv add requests pydantic
uv add --dev pytest hypothesis ruff pyrefly lizard great-expectations

# スクリプト実行（venv アクティベート不要）
uv run python main.py
uv run pytest
```

**鉄則:**
- `pip install` は使わない → `uv add`
- `python script.py` は使わない → `uv run python script.py`
- `uv.lock` は必ずコミットする
- `.python-version` ファイルで Python バージョンを固定する

---

## 2. 標準リポジトリ構造

```
my-project/
├── pyproject.toml          # 唯一の設定ファイル（全ツール統合）
├── uv.lock                 # ロックファイル（コミット必須）
├── .python-version         # Python バージョン固定
├── README.md
├── src/
│   └── my_project/
│       ├── __init__.py
│       ├── py.typed        # 型情報を公開するマーカー
│       ├── models/
│       ├── services/
│       └── utils/
├── tests/
│   ├── conftest.py
│   ├── unit/
│   ├── integration/
│   └── property/           # hypothesis テスト
├── docs/
└── .github/
    └── workflows/
        └── ci.yml
```

src レイアウトを採用する（`src/` 配下にパッケージを置く）。これにより未インストール状態のコードを誤って import するバグを防ぐ。

---

## 3. pyproject.toml テンプレート

```toml
[project]
name = "my-project"
version = "0.1.0"
description = "..."
readme = "README.md"
requires-python = ">=3.12"
dependencies = []

[project.optional-dependencies]
dev = [
    "hypothesis>=6.100.0",
    "lizard>=1.17.0",
    "pytest>=8.0.0",
    "pytest-cov>=5.0.0",
    "pyrefly>=0.42.0",
    "ruff>=0.4.0",
]

[build-system]
requires = ["uv_build"]
build-backend = "uv_build"

# ── Ruff ──────────────────────────────────────────
[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "F",   # pyflakes
    "I",   # isort
    "B",   # flake8-bugbear
    "UP",  # pyupgrade
    "N",   # pep8-naming
    "ANN", # flake8-annotations
    "S",   # flake8-bandit (security)
    "C90", # mccabe complexity
]
ignore = ["ANN101", "ANN102"]

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["S101", "ANN"]  # assert・型注釈省略を許可

[tool.ruff.format]
quote-style = "double"
indent-style = "space"

# ── Pyrefly ───────────────────────────────────────
[tool.pyrefly]
# pyrefly check コマンドが参照する設定
# 詳細は references/pyrefly.md を参照

# ── Pytest ────────────────────────────────────────
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "--cov=src --cov-report=term-missing --cov-fail-under=80"

# ── Coverage ──────────────────────────────────────
[tool.coverage.run]
source = ["src"]
omit = ["tests/*"]
```

---

## 4. コーディング規約

### 型注釈
- **すべての関数・メソッドに型注釈を付ける**（パラメータと戻り値）
- `Any` は最終手段。使う場合はコメントで理由を明記する
- `Optional[X]` より `X | None`（Python 3.10+）を優先
- Pydantic モデルでデータ検証を行う

```python
# ✅ Good
def process(items: list[str], limit: int = 100) -> dict[str, int]:
    ...

# ❌ Bad
def process(items, limit=100):
    ...
```

### 命名規則
| 対象 | スタイル | 例 |
|------|---------|-----|
| 変数・関数 | snake_case | `user_count`, `get_user()` |
| クラス | PascalCase | `UserService` |
| 定数 | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| プライベート | `_prefix` | `_internal_helper()` |
| モジュール | snake_case | `data_loader.py` |

### 設計原則
- **単一責任**: 1クラス・1関数 = 1つの責務
- **依存性注入**: テスタビリティのため具象クラスではなく抽象を注入
- **純粋関数優先**: 副作用を最小化し、I/O を境界に押し込む
- **早期リターン**: ネストを浅くするためガード節を使う
- **定数化**: マジックナンバー・マジック文字列を定数に抽出する

```python
# ✅ Good: 早期リターン
def validate_user(user: User) -> str | None:
    if not user.email:
        return "Email is required"
    if not user.name:
        return "Name is required"
    return None

# ❌ Bad: 深いネスト
def validate_user(user: User) -> str | None:
    if user.email:
        if user.name:
            return None
        else:
            return "Name is required"
    else:
        return "Email is required"
```

---

## 5. テスト戦略

### pytest 基本
```bash
uv run pytest                        # 全テスト
uv run pytest tests/unit/            # ユニットテストのみ
uv run pytest -k "test_login"        # 名前フィルタ
uv run pytest --cov=src -v           # カバレッジ付き
```

テストの AAA パターン（Arrange / Act / Assert）を遵守する。

### hypothesis によるプロパティベーステスト
詳細は `references/hypothesis.md` を参照。エッジケースを自動探索するため、特に以下に適用する：
- 数値計算・変換関数
- シリアライズ/デシリアライズ
- データのバリデーションロジック

```python
from hypothesis import given, strategies as st

@given(st.lists(st.integers()))
def test_sort_is_idempotent(xs: list[int]) -> None:
    assert sorted(sorted(xs)) == sorted(xs)
```

### great-expectations によるデータ品質
詳細は `references/great-expectations.md` を参照。データパイプラインや ETL 処理に適用する。

---

## 6. 複雑度管理 (lizard)

```bash
# CCN(循環的複雑度) 10 を超える関数を警告
uv run lizard -l python -C 10 -a 5 src/

# HTML レポート生成
uv run lizard -l python -H -o report.html src/
```

**閾値の目安:**
| CCN | 評価 | アクション |
|-----|------|-----------|
| 1–5 | 優良 | そのまま |
| 6–10 | 許容 | 監視対象 |
| 11–15 | 要注意 | リファクタリング計画 |
| 16+ | 危険 | 即リファクタリング |

関数パラメータ数は 5 以下を目安にする（`-a 5`）。

---

## 7. アンチパターン一覧

以下を検出したら即座に指摘・修正する。

| アンチパターン | 症状 | 改善策 |
|--------------|------|--------|
| God Object | 1クラスに大量のメソッド | 責務を複数クラスに分割 |
| Primitive Obsession | 文字列/整数で概念を表現 | Value Object / Pydantic モデル |
| Long Method | 50行超の関数 | Extract Method リファクタリング |
| Deep Nesting | 4段以上のインデント | 早期リターン・関数抽出 |
| Mutable Default Argument | `def f(x=[])` | `def f(x=None): x = x or []` |
| Bare Except | `except:` | `except SpecificError:` |
| Magic Number | コード中の裸の数値 | 定数として定義 |
| Import * | `from module import *` | 明示的 import |
| Circular Import | モジュール間の循環依存 | 依存を整理・型のみなら TYPE_CHECKING |

---

## 8. CI/CD 品質ゲート

`.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: uv sync --all-extras
      - run: uv run ruff check .
      - run: uv run ruff format --check .
      - run: uv run pyrefly check
      - run: uv run lizard -l python -C 10 -a 5 -w src/
      - run: uv run pytest --cov=src --cov-fail-under=80
```

---

## 参照ファイル

詳細なリファレンスが必要な場合は以下を読み込む：

- `references/uv.md` — uv の詳細コマンド・ワークスペース・Docker 対応
- `references/ruff.md` — ruff ルールセット詳細・noqa の使い方
- `references/pyrefly.md` — pyrefly 設定・型推論の仕組み
- `references/hypothesis.md` — hypothesis ストラテジー・設定詳細
- `references/great-expectations.md` — GE の Expectation・Checkpoint 設定
- `references/lizard.md` — lizard 高度な使い方・CI 統合
- `references/architecture.md` — Pythonアーキテクチャパターン詳細
