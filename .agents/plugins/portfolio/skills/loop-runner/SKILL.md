---
name: loop-runner
description: "Antigravity native autonomous execution loop: Checkable Predicate definition, Episodic Roll-up context discipline, Doom Loop detection, never-block-on-the-human, and prove-it-works."
---

# Loop Runner (Antigravity 自律走行実行エンジン)

> **根拠憲章**: [`docs/AUTONOMOUS_LOOP_HARNESS_CHARTER.md`](docs/AUTONOMOUS_LOOP_HARNESS_CHARTER.md) (CHARTER-2026-XHS-LOOP-CTX)  
> **根拠仕様**: [`docs/specs/autonomous-loop-context-engineering-spec.md`](docs/specs/autonomous-loop-context-engineering-spec.md) (SPEC-2026-LOOP-CTX-01)

本スキルは、Google Antigravity (`agy`) ランタイムにおいて、外部の常駐オーケストレータに依存せず、**エージェント自身が決定論的な完了述語（Checkable Predicate）を定義し、コンテキスト窓を汚染させずに自己修復サイクルを完走するためのネイティブプロトコル**です。

---

## 1. 核心原則 (Non-Negotiable Principles)

自律走行時、エージェントは以下の原則を絶対に遵守せよ。

1. **Checkable Predicate (完了述語の自己定義)**:
   - ループ開始前に、客観的に検証可能な終了条件（スコープ、静的検証、テストコマンド、Exit Code 0）を必ず宣言する。
   - 「完了しました」「これで直ったはず」という **主観的完了申告（Early Exit Reflex）は一切信用しない**。
2. **Episodic Roll-up (文脈窓のキャッシュ保護)**:
   - 失敗したスタックトレースや長大な生ログはコンテキストに蓄積しない（即時破棄）。
   - イテレーションの末尾には、1行の構造化タプル（仮説・修正箇所・失敗シグネチャ・棄却案）のみをスタックする。
3. **Never Block on the Human (可逆作業での停止質問禁止)**:
   - 可逆な作業（コード編集、実験、テスト、リファクタリング）において、`ask_question` や「〜してよいですか？」と人間に質問して停止してはならない。
   - 自分で判断して仮説を実行し、結果を作って事後報告せよ。非可逆な操作（Git強制プッシュ、本番デプロイ、データ破壊削除）のみ人間へ確認を求める。
4. **Prove It Works (実体検証の徹底)**:
   - 「コンパイルが通った」「多分動く」は完了ではない。実際のテスト・プローブの Exit Code 0 という物理的エビデンスでのみ完了を証明する。
5. **Attack the Premise (前提疑義)**:
   - 同一の前提を持つ修正が2回連続で失敗した場合、小手先の修正を即座に停止し、根本的な前提（データモデル、インターフェース、テストの期待値妥当性）を疑え。
6. **Sequence Verifiable Units (検証可能単位の分割)**:
   - 一度に巨大な修正を行わず、最小の検証可能単位に分割せよ。失敗する再現テストを先、修正を後にコミットせよ。

---

## 2. Checkable Predicate（完了述語）定義プロトコル

ループ開始時、エージェントは以下の形式でタスクの述語を宣言する。

```yaml
predicate:
  scope: ["src/xhs/engine/*.py", "tests/test_*.py"]
  static: "uv run ruff check src/ tests/"
  test: "uv run pytest tests/test_target.py"
  audit: null # 必要に応じて独立Reviewer
  max_iterations: 10
  expected_exit_code: 0
```

### 述語の構成要素
- **Scope**: 変更を許可するファイルパス・globパターン（スコープ外ファイルの改変を機械的に防止）。
- **Static**: 静的解析・リンター・型検査コマンド（Exit Code 0 必須）。
- **Test**: 対象機能のテストコマンド（Exit Code 0 必須）。
- **Audit**: （任意）二次チェックや独立レビュアーによる承認。

---

## 3. 自律修正サイクル & Episodic Roll-up

各イテレーションは **Reason ➔ Act ➔ Observe ➔ Verify ➔ Repeat** の短命な閉ループとして回す。

```
       ┌────────────────────────────────────────────────────────┐
       ▼                                                        │
[1. Reason] 仮説立案（失敗シグネチャ・前提の再検討）           │
       │                                                        │
[2. Act] 最小限のコード修正（1ファイル・1箇所に集中）           │ (失敗時)
       │                                                        │
[3. Observe & Verify] Done Probe 実行 (`xhs probe check`)       │
       │                                                        │
       ├─► [PASSED] ➔ コミット & 完走終了                       │
       │                                                        │
       └─► [FAILED] ➔ 生ログ破棄 & Roll-up スタック ────────────┘
```

### Episodic Roll-up フォーマット
失敗したトレースバックは即座に捨て、以下の1行のみを記録する：

```markdown
- Iteration N: [Hypothesis] <立てた仮説> | [Action] <修正したファイル:行> | [Result] FAILED: <エラーシグネチャ> | [Discarded] <棄却されたアプローチ>
```

**実例**:
```markdown
- Iteration 1: [Hypothesis] Use float division fallback | [Action] Modified calc.py:L14 | [Result] FAILED: err_zero_div_15 | [Discarded] Direct float fallback without zero guard
- Iteration 2: [Hypothesis] Raise ValueError on zero denominator | [Action] Modified calc.py:L12 | [Result] PASSED | [Discarded] None
```

---

## 4. 決定論的検証プローブ (`xhs probe`) の活用

精神論（プロンプト）ではなく、XHS コアエンジン内蔵の決定論的プローブを実行して客観的合否を判定する。

### イテレーション実行コマンド
```bash
uv run xhs probe check \
  --test "uv run pytest tests/test_target.py" \
  --static "uv run ruff check src/ tests/" \
  --scope "src/xhs/engine/loop_probe.py,tests/test_loop_probe.py" \
  --hypothesis "Zero denominator handling" \
  --action "Added ValueError check at calc.py:12" \
  --discarded "Returning None on zero"
```

### プローブの動作仕様
1. **Scope Probe**: `git status` を確認し、`--scope` 外のファイル変更があれば Exit Code 1 で即座に不合格。
2. **Static Probe**: `--static` コマンドを実行。Exit Code != 0 で不合格。
3. **Test Probe**: `--test` コマンドを実行。Exit Code != 0 で不合格。
4. **Doom Loop Detector**:
   - 失敗出力から正規化エラーシグネチャ（$H_{err}$）と差分シグネチャ（$H_{diff}$）を抽出。
   - **同一エラーが3回連続** または **差分が A ➔ B ➔ A ➔ B と振動** した場合、Exit Code 2 で即時停止し、自動的に `ESCALATION.md` を生成して降伏（Surrender）。
5. **Episodic Roll-up**:
   - 成功・失敗を問わず、コンテキストに貼り付け可能な 1 行 Roll-up 文字列を出力。

---

## 5. Antigravity ランタイムでの協調手順

### A. バックグラウンド実行 & Reactive Wakeup
長時間のビルド・テスト実行は、Antigravity のバックグラウンドタスクまたは `schedule` を活用する。
- ポーリング（ループでの待機）は禁止。
- タスク完了メッセージが届いた時点で自動起床（Reactive Wakeup）し、次のイテレーションを進める。

### B. 特化サブエージェントへの探索委譲 (Tool Tiering)
メインスレッドをスリムに保つため、重い調査はサブエージェントに委譲する。
- **概念・意味探索**: `semble-search` または `zvec-search` を起動。
- **深い依存関係・影響調査**: `codegraph` / `arch-inspector` を起動し、200トークン以内の要約を受け取る。
- **過去の決定・ADR調査**: `memory-steward` を起動し、要約を受け取る。
- **メインエージェント**: 得られた要約を基に、最小限の編集と述語検証に集中する。

### C. 破滅ループ検知時のエスカレーション (`ESCALATION.md`)
Doom Loop Detector が発動した場合、または人間への確認が必要な非可逆操作に直面した場合：
1. 自動生成された `ESCALATION.md` を確認する。
2. 試行した仮説の系譜（Census）と手詰まりの根本原因を整理する。
3. 人間に判断を仰ぐべき論点を明確にして停止する。

---

## 6. TypeSafe Judgment & Jev Decision Primitives (型安全判定と遷移ガード)

エージェント自身が「できた」「直った」と主観的に自己評価（Critic）することを物理的に根絶し、三層認知分離（Tri-System Model）を適用する：

```
System 0 (物理世界): pytest, ruff, xhs gate check (Exit Code 0)
       ▲
       │ [Fail-Close 物理遮断]
System 1 (型安全判定): Jev 決定プリミティブ
  - Noul: CanPromote(True/False)
  - Choice: RETRY | ATTACK_PREMISE | ESCALATE
  - Score: RiskScore (0.0〜1.0)
       ▲
       │ [状態遷移ガード]
System 2 (生成・推論): AGY / Pi / Claude / Codex
  - コード実装と自己修復のみ担当。完了を自己申告する権限を持たない。
```

---

## 7. Project-Scoped MCP & Skill Resolution (プロジェクト別 MCP & スキル共存)

既存プロジェクトにおいて、グローバル配布された共通スキル（`loop-runner`, `zvec-search` 等）と、プロジェクト固有の MCP サーバーやスキルを共存させてループを実行する手順：

```bash
# 1. 既存プロジェクトで LCGE 自律ループ環境を初期化（言語自動検知で probe.json 生成）
xhs loop init /path/to/project

# 2. プロジェクト固有のスキル・MCP プロファイルを適用（必要に応じて）
xhs deploy --profile <profile> --scope project --target /path/to/project

# 3. プロジェクトの MCP & スキル解決状態を診断
xhs loop doctor /path/to/project

# 4. 対象エージェントで自律ループを起動
xhs loop run --agent <agy|pi|claude|codex> --target /path/to/project
```

