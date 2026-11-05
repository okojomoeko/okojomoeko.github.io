# hypothesis リファレンス

公式ドキュメント: https://hypothesis.readthedocs.io/

プロパティベーステスト：手書きのテストケースではなく、**「この関数が満たすべき性質」**を定義し、hypothesis がランダムな入力を自動生成して検証する。

## インストール

```bash
uv add --dev hypothesis pytest
```

## 基本パターン

```python
from hypothesis import given, assume, settings
from hypothesis import strategies as st

# 基本的な使い方
@given(st.integers(), st.integers())
def test_addition_is_commutative(a: int, b: int) -> None:
    assert a + b == b + a

# assume で前提条件を絞る
@given(st.integers())
def test_positive_sqrt(n: int) -> None:
    assume(n >= 0)
    assert my_sqrt(n) ** 2 == n
```

## 主要ストラテジー

```python
st.integers(min_value=0, max_value=100)
st.floats(allow_nan=False, allow_infinity=False)
st.text(alphabet=st.characters(whitelist_categories=("Lu", "Ll")))
st.booleans()
st.none()
st.lists(st.integers(), min_size=1, max_size=10)
st.dictionaries(st.text(), st.integers())
st.tuples(st.integers(), st.text())
st.one_of(st.integers(), st.text())   # 複数型のUnion

# 日付・時刻
from hypothesis.extra.pytz import timezones
st.datetimes(timezones=timezones())

# Pydantic モデル（hypothesis-jsonschema 等）
from hypothesis import given
from pydantic import BaseModel

class User(BaseModel):
    name: str
    age: int

# pydantic の任意モデルから自動生成
from hypothesis_pydantic import from_schema
@given(from_schema(User))
def test_user_validation(user: User) -> None:
    assert user.age >= 0 or ...
```

## よく使うプロパティパターン

```python
# 1. ラウンドトリップ（シリアライズ/デシリアライズ）
@given(st.binary())
def test_encode_decode_roundtrip(data: bytes) -> None:
    assert decode(encode(data)) == data

# 2. 冪等性
@given(st.lists(st.integers()))
def test_sort_is_idempotent(xs: list[int]) -> None:
    assert sorted(xs) == sorted(sorted(xs))

# 3. 逆関数
@given(st.integers())
def test_negate_is_its_own_inverse(n: int) -> None:
    assert negate(negate(n)) == n

# 4. モノトニック性
@given(st.integers(0, 100), st.integers(0, 100))
def test_larger_input_gives_larger_output(a: int, b: int) -> None:
    assume(a <= b)
    assert process(a) <= process(b)
```

## settings 設定

```python
from hypothesis import settings, HealthCheck

@settings(max_examples=500, suppress_health_check=[HealthCheck.too_slow])
@given(st.text())
def test_heavy_computation(s: str) -> None:
    ...
```

```toml
# pyproject.toml でプロジェクト全体に設定
[tool.hypothesis]
max_examples = 100
deadline = 500  # ミリ秒
```

## データベース（失敗例の再現）

hypothesis はバグを見つけた入力を `.hypothesis/` に保存し、次回以降必ず再現する。このディレクトリは **コミットする**。

```gitignore
# .gitignore に追加しない
# .hypothesis/  ← コミット対象
```
