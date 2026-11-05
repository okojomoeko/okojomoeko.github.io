# lizard リファレンス

GitHub: https://github.com/terryyin/lizard

循環的複雑度（CCN）などのメトリクスでコードの複雑さを計測する静的解析ツール。

## インストールと基本コマンド

```bash
uv add --dev lizard

# Python コードの複雑度チェック
uv run lizard -l python src/

# CCN 閾値を 10 に設定（超えた関数を警告）
uv run lizard -l python -C 10 src/

# パラメータ数も制限（5 を超えると警告）
uv run lizard -l python -C 10 -a 5 src/

# 警告のみ表示
uv run lizard -l python -C 10 -w src/

# HTML レポート生成
uv run lizard -l python -H -o complexity_report.html src/

# CSV 出力（スプレッドシート分析向け）
uv run lizard -l python --csv -o report.csv src/

# ソート表示（複雑度順）
uv run lizard -l python -s cyclomatic_complexity src/
```

## 出力の読み方

```
================================================
  NLOC    CCN   token  PARAM  length  location
------------------------------------------------
    15      3     89      2      18   get_user@45-62@src/users.py
    42     12    310      4      55   process_order@10-64@src/orders.py
    ^^      ^^
    |       └── 循環的複雑度（Cyclomatic Complexity Number）
    └── コメント除いた実行行数
```

| メトリクス | 意味 | 推奨閾値 |
|-----------|------|---------|
| `NLOC` | コメント除くコード行数 | 関数 50 行以下 |
| `CCN` | 循環的複雑度（分岐数+1） | 10 以下 |
| `token` | トークン数 | 参考値 |
| `PARAM` | パラメータ数 | 5 以下 |
| `length` | 関数の全行数 | 参考値 |

## CCN の意味と対処

| CCN | リスク | アクション |
|-----|--------|----------|
| 1–5 | 低 | 問題なし |
| 6–10 | 中 | 監視・テスト充実 |
| 11–15 | 高 | リファクタリング計画 |
| 16–25 | 非常に高 | 優先リファクタリング |
| 26+ | 危険 | 即対応必須 |

## CI での使い方

```bash
# 終了コードが非ゼロ → CI 失敗
uv run lizard -l python -C 10 -a 5 -w src/
echo "Exit: $?"
```

GitHub Actions:
```yaml
- name: Complexity check
  run: uv run lizard -l python -C 10 -a 5 -w src/
```

## ホワイトリスト（除外）

どうしても複雑度が高い関数（生成コード・レガシーコードなど）:

```
# whitelizard.txt
my_complex_function
LegacyParser.parse_old_format
```

```bash
uv run lizard -l python -C 10 -W whitelizard.txt src/
```

## Python API

```python
import lizard

# ファイル解析
result = lizard.analyze_file("src/my_module.py")
for func in result.function_list:
    if func.cyclomatic_complexity > 10:
        print(f"High CCN: {func.name} = {func.cyclomatic_complexity}")
        print(f"  at {func.filename}:{func.start_line}")
```

## リファクタリングのヒント

CCN が高い関数への対処パターン：

1. **早期リターン（ガード節）**: ネストされた if を早期 return で平坦化
2. **Extract Method**: 論理的なまとまりを別関数に抽出
3. **Strategy パターン**: 条件分岐を多態性に置き換え
4. **辞書ディスパッチ**: `if/elif` の連鎖を dict + 関数で置き換え

```python
# Before: CCN=8
def process(action: str, data: dict) -> str:
    if action == "create":
        if data.get("name"):
            if data.get("email"):
                ...

# After: CCN=1 per function（辞書ディスパッチ）
HANDLERS: dict[str, Callable] = {
    "create": handle_create,
    "update": handle_update,
    "delete": handle_delete,
}

def process(action: str, data: dict) -> str:
    handler = HANDLERS.get(action)
    if handler is None:
        raise ValueError(f"Unknown action: {action}")
    return handler(data)
```
