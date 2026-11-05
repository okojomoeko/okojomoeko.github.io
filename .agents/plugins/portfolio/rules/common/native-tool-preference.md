---
title: Native Tool Preference & Self-Tampering Prevention
---

# Native Tool Preference & Self-Tampering Prevention

全コーディングエージェント（Antigravity, OpenAI Codex, Claude Code, Pi）に共通して適用される、ファイルアクセス・メタデータ検査・設定保護に関する最優先行動規範。

---

## 1. ネイティブ読み取りツールの最優先使用 (Native Read Tool Preference)

ファイル内容や設定データの確認において、シェルコマンド経由の即席ワンライナースクリプト（`python -c`, `python3 -c`, `node -e`, `ruby -e` 等）による読み取りを**厳格に禁止**する。

- **原則**: ファイル内容・設定データ（JSON, YAML, TOML, Markdown, ソースコード等）を閲覧・検査する際は、各ハーネスが提供するネイティブ読み取りツール（`read_file`, `view_file` 等）を必ず使用せよ。
- **背景とセキュリティ境界**:
  - シェル経由のスクリプト実行はサンドボックスや権限制御の意図せぬバイパスを引き起こし、プロファイル監査ログの透明性を損なう。
  - ネイティブ読み取りツールは、エージェント環境のセキュリティ機構（macOS Seatbelt、読み取り専用制御、監査フック）と正しく連携して動作する。
- **禁忌**:
  - `python3 -c "import json; open('...').read()"` や `python -c "print(Path('...').read_text())"` 等のワンライナーによるファイル読取。
  - 権限エラーや制約を回避する目的でシェルスクリプトを実行すること。

---

## 2. メタデータ・属性検査における標準コマンドの利用 (Standard Metadata Inspection)

シンボリックリンクの実体先、ファイル種別、パーミッション、タイムスタンプ、ディレクトリ構造などのメタデータ確認には、言語スクリプトではなくOS標準の検査コマンドを使用せよ。

- **標準検査コマンド**:
  - `readlink <path>` または `readlink -f <path>`: シンボリックリンクのリンク先実体の確認
  - `file <path>`: ファイル種別・バイナリ形式・エンコーディングの判定
  - `stat <path>`: ファイル属性、パーミッション、サイズ、更新日時の取得
  - `ls <path>` / `ls -la <path>`: ディレクトリ構成・一覧の確認
- **許可ポリシーとの整合**:
  - 上記4つのコマンド（`readlink`, `file`, `stat`, `ls`）はファイル本文を読まない安全なメタデータ検査コマンドとして、全ハーネスの権限ポリシーにおいて事前に明示許可されている。
  - `python3 -c "import os; print(os.path.realpath(...))"` や `python3 -c "import os; print(os.stat(...))"` による代替実行は不要であり、標準コマンドを用いよ。

---

## 3. ハーネス設定への自己改ざんの禁止 (Prohibition of Self-Tampering)

エージェント自身を制御・統制するハーネス設定領域に対する自己改ざん（書き込み・編集・権限緩和）を**物理的・論理的に固く禁ずる**。

- **保護対象領域**:
  - `~/.gemini`（Antigravity / Gemini CLI）
  - `~/.codex`（OpenAI Codex）
  - `~/.claude`（Claude Code）
  - `~/.pi`（Pi Agent）
  - およびワークスペース内のハーネス制御設定（`.agents/settings.json`, `.claude/`, `.codex/` 等）
- **Read/Write 分離の原則**:
  - **読み取り（Read）の許可**: 安全な設定ファイル（`settings.json`, `config.toml`, `<appDataDir>/brain/` 配下のログ等）の内容参照は、エージェントが自己のコンテキストや診断情報を把握するために正常に許可されている。
  - **変更（Write/Edit）の禁止**: ハーネス設定領域への `write_file`, `edit_file`, およびシェル（`echo >`, `sed`, `cp` 等）による直接改ざんは固く禁じられており、セキュリティアダプターにより恒久的に拒否（`deny` / `protectedPaths`）される。
- **設定変更の正当な経路**:
  - ハーネス設定や権限ポリシーの変更は、ユーザーによる直接編集、または正規のデプロイツール（`xhs build` / `xhs deploy`）経由でのみ実行されなければならない。エージェント自身による自律的な設定自己承認・自己変更は許されない。
