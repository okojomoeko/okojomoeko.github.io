---
name: loop-patterns
description: "Autonomous engineering loop patterns (CI Sweeper, PR Babysitter, Dependency Sweeper, Daily Triage, Post-Merge Cleanup) integrated with LCGE."
---

# Loop Patterns (自律エンジニアリング・運用ループパターン集)

> **根拠憲章**: [`docs/AUTONOMOUS_LOOP_HARNESS_CHARTER.md`](docs/AUTONOMOUS_LOOP_HARNESS_CHARTER.md)  
> **参照元**: `refs/loop-engineering/patterns/` (CI Sweeper, PR Babysitter, Dependency Sweeper, etc.)

本スキルは、自律エージェントが定常タスクや監視・修復タスクを安全に自走するための運用パターン集です。
全パターンにおいて、XHS の **Loop Context Graph Engineering (LCGE)** 機構（`xhs worktree`, `xhs gate`, `xhs probe`, 結晶化）を内蔵しています。

---

## 1. コア運用パターン一覧

| パターン名 | 目的 | 典型的な実行頻度 | リスク度 | 主な人間ゲート |
| :--- | :--- | :--- | :--- | :--- |
| **CI Sweeper** | CI失敗を検知し、最小修正を施して検証・自動PR提案する | 5〜15分 / イベント駆動 | 中 | インフラ障害、5ファイル超の変更、セキュリティテスト |
| **PR Babysitter** | オープンPRのレビュー指摘、CI結果、コンフリクトを監視・解決する | 10〜30分 | 中 | 決済・認証ロジック、3回以上の修正失敗 |
| **Dependency Sweeper** | 依存関係・脆弱性パッチを検知し、テスト通過を確認してPR作成 | 6〜24時間 | 中 | メジャーバージョンアップ、API破壊的変更 |
| **Daily Triage** | Issue、PR、エラーログ、未解決タスクのスキャンと優先度付け | 1日1回（朝） | 低 | 設計判断、複数ファイルに跨るリファクタリング |
| **Post-Merge Cleanup** | main マージ後の技術的負債、未使用コード、TODO の解消 | 1日1〜2回 | 低 | アーキテクチャ変更、フィーチャーフラグ削除 |
| **Thin Loop** | 単一のタスク・バグ修正を1〜3ターンで迅速に解決する短命ループ | オンデマンド | 低〜中 | スコープ外変更 |

---

## 2. 共通 LCGE 実行ライフサイクル

すべてのループパターンは以下の標準ライフサイクルに従う：

```
1. 検知 (Discover & Triage)
   - 失敗したテスト、未解決Issue、CIエラーログを収集
   - 既知のフレーキーテストか、真の回帰（Regression）かを分類
   │
2. 物理隔離 (Worktree Isolation)
   - `uv run xhs worktree create <attempt-id> --branch fix/<topic>`
   │
3. 最小修正 (Minimal Fix & Inner Loop)
   - 原因箇所に絞った最小限のコード修正（1ファイル・数行を推奨）
   - 原因と無関係な「ついで修正」は厳禁
   │
4. 安全ゲート評価 (Loop Gate)
   - `uv run xhs gate check`
   - 禁止パス改変、最大変更ファイル数（上限5）、重要設定保護を機械的に検証
   │
5. 決定論的検証 (Done Probe)
   - `uv run xhs probe check --test "<test-cmd>" --static "<lint-cmd>"`
   - 合格時: 成功マーク ➔ 差分コミット ➔ 自動PR作成
   - 失敗時: サーキットブレーカー（同一エラー3回 / 連続失敗5回）判定
     - 限界超過時: `ESCALATION.md` 作成 ➔ 人間へエスカレーション ➔ クリーン降伏
     - 継続可能時: 失敗シグネチャを記録して Step 3 へ再試行
   │
6. 知識結晶化 (Loop Crystallization)
   - ループ結果から「成功仮説」「棄却アプローチ」を抽出し `.xhs/crystallized/` へ永続化
```

---

## 3. 各パターンの詳細プロトコル

### A. CI Sweeper (CI 修復ループ)
- **状態ファイル**: `ci-sweeper-state.md` または `STATE.md`
- **トリガー**: GitHub Actions ワークフロー失敗、またはローカルテスト失敗。
- **実行フロー**:
  1. 失敗ログのパース（スタックトレースを最大8行に要約）。
  2. 失敗種別の分類:
     - `infra`: ランナー障害・外部サービスダウン ➔ 即座に人間へ通知して停止。
     - `flake`: 過去に成功履歴がありコード差分なし ➔ クォランティン（隔離）してPR作成はスキップ。
     - `regression`: コード変更に伴う実エラー ➔ 修正ループ開始。
  3. 修正後は必ず同一テストおよび関連テストをローカル実行し、Green を証明してからPRまたはコミットを行う。

### B. PR Babysitter (PR 保育・マージ推進ループ)
- **状態ファイル**: `pr-babysitter-state.md`
- **トリガー**: レビューコメント追加、CI 終了、ベースブランチ更新。
- **実行フロー**:
  1. レビュアーのコメントが具体的・修正可能なものか確認。
  2. コンフリクト発生時は `git rebase` を試行。競合が自明でない場合は人間にエスカレーション。
  3. 指摘事項に対する最小コミットを作成。
  4. 全テスト通過を確認し、PRに「検証完了・CI Green」のコメントを投稿。

### C. Dependency Sweeper (依存関係安全更新ループ)
- **状態ファイル**: `dependency-sweeper-state.md`
- **トリガー**: Dependabot/Renovate PR、または `uv lock --upgrade` の検知。
- **実行フロー**:
  1. マイナー・パッチバージョンアップを優先処理。
  2. アップグレード後に `uv run pytest` および `uv run ruff check` を実行。
  3. テスト失敗時、Changelog / Release Notes から破壊的変更（Breaking Changes）を検索・分析。
  4. 軽微なインターフェース変更なら修正を適用し、テスト通過後にPR更新。
  5. メジャーバージョンアップや大規模移行が必要な場合は `ESCALATION.md` を作成して人間へ委ねる。

---

## 4. 人間へのエスカレーション規律 (Escalation Protocol)

自律ループが自ら停止（降伏）し、人間へ制御を委ねるべき条件：
1. **3回連続同一エラー**: アプローチを変えても同一の失敗シグネチャが解消しない。
2. **5回連続試行失敗**: 累計イテレーションが5回に達した。
3. **安全ゲート違反**: スコープ外ファイルや機密設定（`.env`, 認証鍵, ルールファイル）への変更要求。
4. **変更量上限超過**: 修正対象が5ファイルを超過、または500行以上の差分に膨らんだ。

エスカレーション時は、以下の項目を含むレポート（`ESCALATION.md`）を出力せよ：
- **Goal**: 達成しようとしていたタスク
- **Attempts**: 試行回数と各イテレーションで試した仮説
- **Root Cause**: なぜ手詰まりになったのか（根本要因の分析）
- **Recommended Action**: 人間が次にとるべき推奨アクション（設計見直し、外部依存修正等）
