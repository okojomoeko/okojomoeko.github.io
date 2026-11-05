---
name: uv-workflow-expert
description: Expert skill for managing Python projects using uv (Project mode, pyproject.toml, uv.lock, uv add/sync/run, locked & frozen CI workflows, Python version pinning).
---

# Modern Python & uv Workflow Expert Skill

高速かつ再現可能な Modern Python パッケージ管理ツール **`uv`** の設計・運用専門スキルです。

## コア原則 (Core Principles)

1. **Project Mode 準拠**:
   - `requirements.txt` や手動仮想環境の作成ではなく、`pyproject.toml` を Single Source of Truth とし、`uv.lock` で完全に環境を固定する。
2. **`uv.lock` のバージョン管理へのコミット**:
   - 開発・本番・CIでの依存関係のサイレントドリフトを防ぐため、`uv.lock` は必ず Git の管理対象に含める。
3. **`uv run` によるコマンド実行**:
   - `source .venv/bin/activate` による手動アクティベートは行わず、常に `uv run python main.py` や `uv run pytest` でコマンドを実行する。
4. **CI/CD でのロック同期原則**:
   - CI環境では `uv sync --locked` または `uv sync --frozen` を使用し、ロックファイルが最新でない場合に即時ビルドエラーとする。

## 開発コマンドコマンドフロー

```bash
# 1. プロジェクト初期化 (src/ レイアウト自動設定)
uv init --app my-app

# 2. 依存関係の追加 (最新安定版の自動解決と pyproject.toml & uv.lock のアトミック更新)
uv add textual duckdb pydantic python-frontmatter

# 3. 開発用依存関係の追加
uv add --dev pytest pytest-asyncio ruff mypy

# 4. 依存関係のアップグレード
uv lock --upgrade

# 5. ローカル仮想環境への完全完全完全同期 (不要なパッケージは自動削除)
uv sync

# 6. スクリプト・テスト実行
uv run my-app
uv run pytest
```

詳細な `pyproject.toml` 設定および CI/CD 設定例は `references/pyproject-lockfile.md` を参照してください。
