---
name: code-review
description: Anthropic流の多層防御コードレビュー。リスク判定(Quick/Standard/Deep)、重大度タグ(Important/Nit/Pre-existing)、バグクラス特定、REVIEW.md連携、オンデマンドExplainer生成を実行します。
user_invocable: true
---

# Code Review Skill (Anthropic Multi-Tier Review Protocol)

> **思想根拠**: Anthropic Claude Code チーム論考「*How the Claude Code team does code review*」（2026年10月）  
> **準拠行動憲法**: [`@rules/common/code-review.md`](../../rules/common/code-review.md)

エージェントが大量のコードを生成する開発環境において、「人間の時間と関心（Human Time & Attention）」を守り、Revert率・インシデント率を最小化するための多層防御コードレビュー手順です。

---

## 1. Core Philosophy (二大目的と代替指標の排除)

コードレビューには2つの独立した目的があります：
1. **リリース前の不具合検出・修正 (Find & Fix Issues)**
2. **チームへの文脈・コードベース理解の共有 (Build Shared Context)**

- **Proxy Fallacyの排除**: 「人間が全行読んだか」は不完全な代替指標です。「何が壊れうるか、どのチェック（自動テスト/静的解析/AI/人間）がそれを捕らえるのに最適か」を起点として検証します。
- **補完関係**:
  - 物理実行・実機起動の動的検証は [`loop-verifier`](../loop-verifier/SKILL.md) が担当。
  - 肥大化・YAGNI違反・過剰設計の削減は [`ponytail-review`](../ponytail-review/SKILL.md) が担当。
  - セキュリティ特化監査は [`security-review`](../security-review/SKILL.md) が担当。
  - 本スキルは**「意図適合性・論理的バグ・回帰リスク・契約整合性・文脈共有」**を担当します。

---

## 2. Review Depth Tiers (リスク別3層アプローチ)

変更内容の潜在的影響度（Blast Radius）に基づき、レビュー深度を決定します。

| Tier | 対象変更例 | レビュー深度 | 必要承認基準 |
| :--- | :--- | :--- | :--- |
| **Quick** | ドキュメント、文言修正、フィーチャーフラグ裏の純粋な追加、社内ツール | 意図と差分の照合、Nitゼロ、高速通過 | 自動CI + AIレビュー通過でマージ可 |
| **Standard** | 通常のプロダクト機能、バグ修正、内部リファクタリング | 全体整合性、エラーハンドリング、回帰リスクの精査 | 1人承認（エージェント指示者等） |
| **Deep** | 認証、課金、自動更新、CI/CDワークフロー、インストーラ、コア並行処理 | 全呼び出し元の追跡、状態遷移・不変条件・障害モードの厳密検証 | 最低2人以上の承認必須 |

---

## 3. Severity Taxonomy (3段階重大度タグ)

すべての指摘には以下の重大度タグを付与し、重要度順にソートして提示します。

1. **`[Important]` (ブロッキング)**:
   - 機能欠陥、データ破損リスク、契約・型定義の不整合、未処理例外、仕様違反。
   - 修正されるか、正当な理由による解消（Resolve）がなされない限りマージをブロックする。
2. **`[Nit]` (非ブロッキング)**:
   - 軽微な可読性向上、コメントの明確化（※リンター/フォーマッターで対処可能なスタイルは指摘禁止）。
   - レビューノイズ防止のため、1回のレビューにつき**最大2〜3件**に厳格制限する。
3. **`[Pre-existing]` (非ブロッキング・別タスク化)**:
   - 今回の差分以前から存在していた既存の負債や潜在バグ。
   - 作者のPRをブロックしてはならない。別タスクまたはバックログとして記録する。

---

## 4. REVIEW.md Protocol (オーナー契約の解釈)

リポジトリまたは対象ディレクトリ内に `REVIEW.md` が存在する場合、最優先で読み込み、その指示に従います：
- **失敗の定義（What failure looks like）の確認**:
  - ドキュメントモジュール: 「嘘をつくこと（事実と異なる記述）」
  - ルーティング・設定モジュール: 「誤配送・ルーティングの不整合」
  - 共通基盤モジュール: 「後方互換性の破壊、グローバル名前空間汚染」
- **スキップ対象パスの遵守**: `REVIEW.md` で明記された除外対象はレビューしない。
- **証拠提示義務**: ファイル名からの推測ではなく、該当ファイルと正確な行番号を提示する。

---

## 5. Review Convergence (収束性プロトコル)

エージェント同士の無限レビューピンポン（Thrashing Loop）を根絶します：
- **3ラウンド上限 (Round Cap)**: 同一差分に対する修正・再レビューは最大3回。3回で解決しない場合は `ESCALATE_HUMAN` を発行し、小手先パッチを止めて設計を見直す。
- **Diff-only 再レビュー**: ラウンド2以降は直前のコミットで修正された差分のみを評価する。初回で見逃した未変更コードを後出しで指摘することを禁ずる。
- **Bug Class Grouping (根本原因のクラス指摘)**:
  - 悪い例: 「Line 45でnullチェックが漏れています」「Line 82でもnullチェックが漏れています」
  - 良い例: 「`[Important: Null Safety Class]` 複数のAPIレスポンス処理箇所でnullガードが欠落しています。以下の全箇所を同種のエラーハンドリング方針で一括是正してください: L45, L82, L104」

---

## 6. On-Demand Explainer Generation (コンテキスト共有)

全行diffを精読する認知的負荷を減らし、チームに文脈を共有するため、大規模または重要モジュールの変更時にはオンデマンドで解説（Explainer）を生成します：
- **対象スライスのメンタルモデル**: 変更されたモジュールが「今日時点でどのような設計になっているか」を要約。
- **Mermaid 図解**: コンポーネント間連携や状態遷移図を可視化。

---

## 7. Structured Review Report Format

レビュー実行時は以下の構造化フォーマットで出力します：

```markdown
## Review Verdict: APPROVE | CHANGES_REQUESTED | ESCALATE_HUMAN

### Metadata
- **Risk Tier**: Quick | Standard | Deep
- **Review Round**: Round X / 3
- **Convergence Status**: Converging | Escalated
- **REVIEW.md Applied**: YES (path/to/REVIEW.md) | NONE

### Verified Evidence (Verification-First)
- **CI / Tests**: (実行されたコマンドと Exit Code)
- **Static Checks**: (型チェック・リンター出力)
- **Runtime Verification**: (必要に応じた実機動作確認結果)

### Findings (Sorted by Severity)
- `[Important: Bug Class Name]` **path/to/file.ext:L12-L18**
  - **Problem**: (発生条件と不具合の具体的内容)
  - **Evidence**: (期待される動作と現行コードの不整合)
  - **Required Action**: (具体的な修正方針)
- `[Nit]` **path/to/file.ext:L45**
  - **Suggestion**: (可読性改善等の提案)
- `[Pre-existing]` **path/to/file.ext:L90**
  - **Note**: (既存の技術的負債としての記録、別タスク推奨)

### Module Explainer (If Context Distribution Needed)
*(変更モジュールの全体像・Mermaid図・設計意図の解説)*
```
