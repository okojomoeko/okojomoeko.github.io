---
name: loop-orchestrator
description: "Skills and patterns for running autonomous self-healing loops with ephemeral Git Worktree isolation across Pi, Antigravity, Codex, and Claude Code. Enforces Objective Done Probes, automatic squash-merge on pass, and clean rollback on doom loop."
---

# Loop Orchestrator (自律ループオーケストレーター & Worktree 隔離実行)

> **根拠憲章**: [`docs/AUTONOMOUS_LOOP_HARNESS_CHARTER.md`](docs/AUTONOMOUS_LOOP_HARNESS_CHARTER.md) (CHARTER-2026-XHS-LOOP-CTX)  
> **根拠仕様**: [`docs/specs/autonomous-loop-context-engineering-spec.md`](docs/specs/autonomous-loop-context-engineering-spec.md) (SPEC-2026-LOOP-CTX-01)

本スキルは、**Pi Coding Agent、Google Antigravity (`agy`)、OpenAI Codex、Anthropic Claude Code** において、メインの作業ツリーを一切汚染せずに独立した Git Worktree サンドボックス内でエージェントをヘッドレス自律走行させ、客観テスト合格時のみ自動スカッシュマージする **Outer Loop オーケストレーション仕様** です。

---

## 🎯 なぜ Worktree 隔離自律ループが必要か？

1. **メインツリーの完全保護 (Zero Pollution)**:
   - エージェントが途中で破滅ループ（Doom Loop）や構文エラーを起こしても、孤立した Worktree 内で完結するため、開発者のローカル作業ツリーは 1 バイトも汚染されません。
2. **客観的完了検証 (Objective Done Probe)**:
   - エージェントの主観的な「修正完了しました」という申告を一切信用せず、`pytest` や `cargo test` の Exit Code 0 を物理検証するまでループを継続させます。
3. **成功時の自動マージ (Autonomous Convergence)**:
   - テスト通過が客観的に実証された場合のみ、メインブランチへ安全に `git merge --squash` され、Worktree は自動消去されます。

---

## 🚀 使い方 (Usage)

### 1. CLI からの直接実行 (`xhs loop run`)

```bash
# Pi Coding Agent による自律ループ実行 (Worktree 隔離 & 自動マージ)
uv run xhs loop run "バグ修正: ゼロ除算例外のハンドリング追加" --agent pi --test-cmd "uv run pytest tests/test_calc.py"

# Antigravity (agy) による自律ループ実行
uv run xhs loop run "リファクタリング: データモデルの pydantic v2 移行" --agent antigravity --test-cmd "cargo test"

# マージせず Worktree 内の差分を目視確認したい場合
uv run xhs loop run "実験的機能の実装" --agent pi --no-merge
```

### 2. エージェント内・スクリプトからの実行

エージェント自身が親セッションとして別エージェントに自律ループを委譲する場合、付属スクリプトを呼び出します：

```bash
python3 scripts/run_loop.py "タスクのゴール" --agent pi --test-cmd "uv run pytest"
```

---

## ⚙️ オプション仕様

| フラグ | 短縮 | デフォルト | 説明 |
| :--- | :--- | :--- | :--- |
| `goal` | (第1引数) | *(必須)* | 自律ループで達成すべきゴール・要件 |
| `--agent` | `-a` | `pi` | 実行エージェント（`pi`, `antigravity`, `codex`, `claude-code`） |
| `--test-cmd` | `-t` | 自動検出 | 完了判定に用いる客観テストコマンド（Exit Code 0 必須） |
| `--static-cmd` | `-s` | `None` | 静的解析・リンター検証コマンド（`ruff check`, `tsc` 等） |
| `--profile` | `-p` | `global-dev` | Worktree 内に JIT デプロイする XHS プロファイル |
| `--max-iterations`| `-m` | `10` | 破滅ループ検知・降伏までの最大試行回数 |
| `--merge / --no-merge` | | `True` | 合格時の自動スカッシュマージ有効化 |
| `--worktree / --no-worktree` | | `True` | 独立 Git Worktree サンドボックス分離の有効化 |

---

## 🛡️ 失敗・破滅ループ時の降伏プロトコル (Clean Surrender)

同一エラーが 3 回連続、または差分が振動した場合、ループは暴走を停止し以下のフェイルセーフを実行します：
1. Worktree 内に `ESCALATION.md` を生成。
2. 親作業ツリーに `ESCALATION_<run_id>.md` として原因と棄却されたアプローチを報告。
3. Worktree を `rejected` ステータスとして隔離保存し、メインブランチへのマージを遮断。
