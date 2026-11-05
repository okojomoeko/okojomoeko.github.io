# great-expectations リファレンス

公式ドキュメント: https://docs.greatexpectations.io/

データパイプライン・ETL での**データ品質の宣言的テスト**フレームワーク。
「このデータはこうあるべき」という期待値（Expectation）を定義し、実際のデータと照合する。

## インストール

```bash
uv add great-expectations
```

## 主要コンセプト

- **Expectation**: データに対する検証ルール（例：「この列は null を含まない」）
- **Suite**: 複数の Expectation をまとめたもの
- **Checkpoint**: Suite を特定データソースに対して実行する設定
- **Data Source**: pandas DataFrame, SQL, ファイルなど

## 基本的な使い方（pandas）

```python
import pandas as pd
import great_expectations as gx

# コンテキスト作成（ファイルシステム不要）
context = gx.get_context(mode="ephemeral")

# データソース登録
data_source = context.data_sources.add_pandas("my_datasource")
data_asset = data_source.add_dataframe_asset("my_df")

# バッチ定義
batch_definition = data_asset.add_batch_definition_whole_dataframe("batch")

# Expectation Suite 作成
suite = context.suites.add(gx.ExpectationSuite(name="my_suite"))

# Expectation 追加
suite.add_expectation(
    gx.expectations.ExpectColumnToExist(column="user_id")
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToNotBeNull(column="user_id")
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeBetween(
        column="age", min_value=0, max_value=150
    )
)
suite.add_expectation(
    gx.expectations.ExpectColumnValuesToBeInSet(
        column="status", value_set=["active", "inactive", "pending"]
    )
)

# 検証実行
df = pd.read_csv("data.csv")
batch = batch_definition.get_batch(batch_parameters={"dataframe": df})
results = batch.validate(suite)

if not results.success:
    raise ValueError(f"Data validation failed: {results}")
```

## よく使う Expectation

```python
# カラムの存在
gx.expectations.ExpectColumnToExist(column="col_name")

# Null チェック
gx.expectations.ExpectColumnValuesToNotBeNull(column="col_name")

# 型チェック
gx.expectations.ExpectColumnValuesToBeOfType(column="col_name", type_="int64")

# 値の範囲
gx.expectations.ExpectColumnValuesToBeBetween(
    column="price", min_value=0.0, max_value=1_000_000.0
)

# 許可値リスト
gx.expectations.ExpectColumnValuesToBeInSet(
    column="country_code", value_set=["JP", "US", "UK"]
)

# 正規表現
gx.expectations.ExpectColumnValuesToMatchRegex(
    column="email", regex=r"^[^@]+@[^@]+\.[^@]+$"
)

# 一意性
gx.expectations.ExpectColumnValuesToBeUnique(column="user_id")

# 行数
gx.expectations.ExpectTableRowCountToBeBetween(min_value=1, max_value=10_000)

# カラム数
gx.expectations.ExpectTableColumnCountToEqual(value=10)
```

## pytest との統合

```python
# tests/data/test_pipeline_output.py
import pytest
import pandas as pd
import great_expectations as gx

@pytest.fixture
def pipeline_output() -> pd.DataFrame:
    return run_my_pipeline()

def test_pipeline_output_quality(pipeline_output: pd.DataFrame) -> None:
    context = gx.get_context(mode="ephemeral")
    ds = context.data_sources.add_pandas("test")
    asset = ds.add_dataframe_asset("output")
    batch_def = asset.add_batch_definition_whole_dataframe("batch")

    suite = gx.ExpectationSuite(name="output_suite")
    suite.add_expectation(
        gx.expectations.ExpectColumnValuesToNotBeNull(column="id")
    )
    # ... 他の Expectation

    batch = batch_def.get_batch(batch_parameters={"dataframe": pipeline_output})
    result = batch.validate(suite)
    assert result.success, f"Data quality check failed:\n{result}"
```

## ユースケース

| 場面 | 適用例 |
|------|--------|
| ETL パイプライン出力の検証 | スキーマ・型・null 率・範囲チェック |
| 機械学習データの前処理 | 特徴量の分布・外れ値検出 |
| API レスポンスのスキーマ検証 | フィールドの存在・型確認 |
| DB マイグレーション後の確認 | レコード数・整合性チェック |
