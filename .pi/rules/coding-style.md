# Coding Style Rules

- **言語標準ツールの尊重**: プロジェクトの主要言語に応じた公式推奨フォーマッターおよびリンター（例: Python なら `ruff`、Rust なら `cargo fmt` / `clippy`、TypeScript/JavaScript なら `biome` / `prettier` 等）を必ず適用してください。
- **命名規則**: 言語の標準イディオム（Rust/Python: スネークケース、TypeScript: キャメル/パスカルケース）に従い、汎用ドキュメントや Markdown ファイルはケバブケースを使用します。
- **コミット前の一貫性維持**: 既存コードのフォーマットスタイルを尊重し、不要な全域差分（空白変更のみの拡散）を発生させないこと。
