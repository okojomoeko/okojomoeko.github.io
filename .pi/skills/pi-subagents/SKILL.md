---
name: pi-subagents
description: "Pi Subagents Orchestration & Multi-Tier Model Coordination. Enables Pi coding agent to orchestrate tasks across reasoning orchestrators, fast coding workers, and ultra-lightweight scouts."
---

# Pi Subagents Orchestration Skill

Pi Coding Agent におけるサブエージェント拡張（`npm:pi-subagents`）を活用し、**「司令塔モデル」「手を動かす軽量モデル」「細かいタスクをこなす超軽量モデル」** の3層モデル階層を協調させて効率的にタスクを完遂するための専門スキルです。

---

## 🎯 3層モデル階層の設計思想 (Multi-Tier Model Hierarchy)

コンテキストの肥大化を防ぎ、トークン効率・実行速度・推論品質を最大化するため、タスクの性質に応じてモデルを厳密に使い分けます。

```
+-----------------------------------------------------------------------------------+
|                        Tier 1: 司令塔 (Parent / Oracle / Planner)                 |
|  - モデル: qwopus3.8-27b-flash-abliterated-mxfp8-vision-mtplx (最強推論モデル)     |
|  - 役割: 要件分解、Meta-prompt生成、全体アーキテクチャ設計、意思決定、最終統合・評価 |
+-----------------------------------------+-----------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                                                   |
        v                                                                   v
+---------------------------------------+   +---------------------------------------+
|    Tier 2: 手を動かす軽量モデル        |   |    Tier 3: 細かいタスクをこなす超軽量 |
|           (Worker / Reviewer / Coder) |   |         (Scout / Researcher / Lint)   |
| - モデル: gemma-4-26B-A4B-it-qat-     |   | - モデル: Ornith-1.5-9B-MLX-6bit      |
|   uncensored-heretic-mlx-vlm-4Bit     |   | - 役割: ファイル探索、grep/AST調査、   |
| - 役割: コード実装、リファクタリング、   |   |         リンター行特定、高速要約      |
|         TDDテスト作成、コードレビュー |   |                                       |
+---------------------------------------+   +---------------------------------------+
```

> **💡 Apple Silicon Unified Memory 最適化の原則**:
> 64GB Unified Memory 等で複数モデル常駐によるスワップ遅延を防ぎたい場合、Tier 1〜3 すべてを単一の 27B モデル（`qwopus3.8-27b`）で統一し、思考レベル（`thinkingLevel: "off"` for Scout, `"medium"` for Worker, `"high"` for Oracle）のみを動的に切り替える **Single-Model Multi-Thinking** 構成を採用してください。プロンプトキャッシュ再利用率 100% とゼロ・スワッピング遅延を実現できます。

---

## 🤖 サブエージェントの役割分担 (Agent Roles & Overrides)

| エージェント種別 | 階層 | 推奨モデル種別 | 主な役割・実行内容 |
| :--- | :--- | :--- | :--- |
| **`scout`** | Tier 3 (超軽量) | `fast_model` | ローカルファイル探索、既存実装パターン・依存関係の調査、ファイルパスのピンポイント特定 |
| **`researcher`** | Tier 3 (超軽量) | `fast_model` | ドキュメント検索、外部仕様・ライブラリAPIの調査、一次情報要約 |
| **`inspector`** | Tier 3 (超軽量) | `fast_model` | リンター・型チェック（mypy/ruff）・pytest実行結果のエラー箇所特定 |
| **`worker`** | Tier 2 (軽量) | `coding_model` | 仕様書・Meta-promptに基づく具体的なコード生成、バグ修正、テストコード実装 |
| **`reviewer`** | Tier 2 (軽量) | `coding_model` | 実装された `git diff` のセキュリティ・設計・エッジケースレビュー |
| **`coder`** | Tier 2 (軽量) | `coding_model` | 単一関数・ウィジェットの局所的な高速リファクタリング |
| **`oracle`** | Tier 1 (司令塔) | `reasoning_model` | 複雑なアルゴリズムの導出、トレードオフ分析、難解なバグの根本原因究明 |
| **`planner`** | Tier 1 (司令塔) | `reasoning_model` | マイルストーン策定、フェーズごとのタスク分割（PLAN.mdの策定） |

---

## 🛡️ Clean-Slate 境界 & 有界文脈射影 (Clean-Slate & Context Subgraph Projection - ADR-0034)

親エージェントがサブエージェント（`scout`, `worker` 等）を起動する際、親の会話履歴（数万〜数十万トークン）を無秩序に引き継ぐと、推論エンジンの VRAM 圧迫（OOM）や文脈ノイズ（Context Leakage）による推論品質劣化を招きます。
`closed-loop-coordinator.ts` は `tool_call`（`spawn_agent` / `subagent`）時に以下を自動強制します：

1. **Clean-Slate 物理遮断**: `session: "isolated-${Date.now()}"`, `share_history: false`, `fresh: true` を注入し、親履歴の無秩序な継承を物理遮断。
2. **Universal Context Subgraph 射影**: タスク記述から対象ファイルパスを抽出し、主要 AST インターフェース契約（最大 500 tokens）、最新 ADR 不変条件（ADR-0028 等）、Ponytail 原則、および Checkable Predicates（検証義務）を有界サブグラフ（<= 2,000 tokens）として JIT 注入。
3. **SSoT モデル・Thinking ルーティング**: `catalog/components/settings/local_llm.json` に基づき、Scout に `fast_model` (thinking: low)、Worker に `coding_model` (thinking: high) を自動注入。

---

## 🛠️ 基本ワークフロー (Standard Execution Cycle)

### Phase 1: 事前調査（超軽量 Scout の並列ディスパッチ）
親セッションは自ら広範なファイルを読み込まず、`scout` に具体的な調査対象を与えてディスパッチします。

```javascript
// 例: subagent ツールによる事前調査
subagent({
  action: "single",
  agent: "scout",
  task: `
# 調査タスク: データモデルとパース処理の現状把握
- 対象ファイル: <target_directory>/models.<ext>, <target_directory>/loader/
- 調査項目:
  1. ファイル読み込みのインターフェース定義
  2. モデルの必須フィールド構造
  3. 既存のテストケースの配置場所
`
})
```

### Phase 2: 設計・計画（司令塔 Oracle / Planner）
`scout` から返った要約レポートをもとに、親セッションまたは `oracle` が修正計画を決定します。

### Phase 3: 実装（軽量 Worker のディスパッチ）
明確な仕様とインターフェースを定義した Meta-prompt を渡し、`worker` に実装を依頼します。

```javascript
// 例: subagent ツールによるコード実装
subagent({
  action: "single",
  agent: "worker",
  task: `
# 実装タスク: ローダーのバリデーション強化
- 対象: <target_directory>/loader/parser.<ext>
- 要件:
  - 不正なスキーマに対する ValidationError 送出
  - TDD: テストに失敗するケースを追加してから実装
  - テストランナーを実行して全通過を確認
`
})
```

### Phase 3.5: 閉ループ自動検証 & 自己修復 (Tier 2 Worker ➔ Tier 3 Inspector 閉ループ)

Worker のコード生成が完了した後、手動でテストを打つのではなく、**Tier 3 Inspector が自動でテストコマンドを実行し、失敗時に差分エラーフィードバックを Worker へ再送する閉ループ**を回します。

```
[Tier 1 Oracle (Plan)]
       │
       ▼
[Tier 2 Worker (Code)] ◄──────────────┐
       │ (Code Done)                  │
       ▼                              │ (Tests Failed: Re-dispatch)
[Tier 3 Inspector (Test Probe)]       │
  - Run `pytest` / Check exit code    │
  - Compute Error & Diff Signatures   │
  - Generate Episodic Roll-Up ────────┘
       │ (Tests Passed: Exit Code 0)
       ▼
[Done / Reviewer Gate]
```

1. **自動検証プローブ (Objective Done Probe)**:
   - Worker 完了時、TypeScript 拡張フック (`extensions/closed-loop-coordinator.ts`) またはスクリプト (`scripts/closed_loop_coordinator.py`) が自動起動。
   - `python3 -m xhs.hooks.pi_closed_loop` を呼び出し、テストコマンド（Exit Code 0）を検証。
2. **差分エラーフィードバックの再送 (Auto-Feedback Re-dispatch)**:
   - テスト失敗時、Inspector は失敗スタックトレースから正規化エラーシグネチャを抽出。
   - 以下の構造化ロールアップ（Episodic Roll-up）を組み立てて Worker に再送:
     ```markdown
     # [Tier 3 Inspector ➔ Tier 2 Worker] Verification Feedback (Iteration N)
     Stage `test` FAILED with Exit Code 1.
     - Iteration N: [Hypothesis] ... | [Action] ... | [Result] FAILED: ZeroDivisionError at ...
     Please fix the failure above without modifying files outside allowed scope.
     ```
3. **破滅ループの機械的遮断 (Doom Loop Guard)**:
   - 同一エラーが3回連続、または差分が振動した場合、ループを強制停止し `ESCALATION.md` を生成して人間にエスカレーション（降伏）。

### Phase 4: レビュー & 検証（Reviewer & 最終判定）
Inspector の検証を全パスした後、`reviewer` で差分を監査し、親セッションが最終確認して完了とします。

---

## 🛠️ 閉ループ協調スクリプト & 拡張機能 (Closed-Loop Tooling)

- **TypeScript 拡張フック**: `catalog/components/skills/pi-subagents/extensions/closed-loop-coordinator.ts`
  - Pi のセッション内で Worker の完了を検知し、Inspector の自動プローブとフィードバック再送を実行。
  - カスタムコマンド `/verify-loop [test-cmd]` による手動プローブ実行もサポート。
- **検証スクリプト**: `catalog/components/skills/pi-subagents/scripts/closed_loop_coordinator.py`
  - CLI またはサブプロセスから独立して客観的検証を実行可能。

---

## 💡 マルチエージェント適用のベストプラクティス (Best Practices)

1. **コンポーネント・UI作成**:
   - `scout` で既存コンポーネントの CSS/レイアウトや設計パターンを調査。
   - `worker` で新しいウィジェットや画面要素を実装。
2. **データ永続化 & ロジック実装**:
   - `oracle` でクエリ設計、データスキーマ、アルゴリズムを最適化。
   - `worker` でリポジトリ層とマイグレーションを実装。
3. **CI / テスト自動化 & 自己修復**:
   - `inspector` でテストやリンターのエラーログを解析させ、修正箇所を `worker` に指示。

