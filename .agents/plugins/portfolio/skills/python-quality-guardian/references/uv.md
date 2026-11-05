# uv リファレンス

公式ドキュメント: https://docs.astral.sh/uv/

## インストール

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## プロジェクト管理コマンド

```bash
# プロジェクト作成
uv init my-app           # アプリ（src レイアウトなし）
uv init --lib my-lib     # ライブラリ（src レイアウト）
uv init --app my-app     # アプリ（src レイアウト）

# Python バージョン管理
uv python install 3.12
uv python pin 3.12       # .python-version 作成
uv python list           # インストール済み一覧

# 依存関係管理
uv add requests                     # 追加
uv add --dev pytest ruff pyrefly    # 開発依存
uv add "django>=5.0,<6.0"          # バージョン制約
uv remove requests                  # 削除
uv sync                            # lock から環境を同期
uv lock                            # lockfile のみ更新

# スクリプト実行（推奨）
uv run python main.py
uv run pytest
uv run ruff check .

# パッケージ情報
uv pip list
uv pip show requests
uv tree                            # 依存ツリー表示
```

## ワークスペース（モノレポ）

```toml
# 親 pyproject.toml
[tool.uv.workspace]
members = ["packages/*", "apps/*"]
```

```bash
uv sync --package my-package   # 特定パッケージのみ同期
```

## Docker での使い方

```dockerfile
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY src/ ./src/
CMD ["uv", "run", "python", "-m", "my_app"]
```

`--frozen` フラグで lock ファイルを厳密に使用する。

## インラインスクリプト依存 (PEP 723)

```python
#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.12"
# dependencies = ["requests", "rich"]
# ///
import requests
from rich import print
print(requests.get("https://example.com").status_code)
```

```bash
uv run my_script.py   # 自動で venv 作成・依存インストール
```

## よくある操作

```bash
# 全依存アップデート
uv lock --upgrade

# 特定パッケージだけアップデート
uv lock --upgrade-package requests

# キャッシュクリア
uv cache clean

# グローバルツール（pipx の代替）
uv tool install ruff
uvx ruff check .
```
