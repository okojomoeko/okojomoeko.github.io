# pyrefly リファレンス

公式ドキュメント: https://pyrefly.org/
GitHub: https://github.com/facebook/pyrefly

Meta が開発した Rust 製の高速型チェッカー。1.85 百万行/秒のチェック速度を誇る。

## インストールと実行

```bash
uv add --dev pyrefly

# チェック
uv run pyrefly check
uv run pyrefly check src/my_project/

# uvx で試す（インストールなし）
uvx pyrefly check
```

## pyproject.toml 設定

```toml
[tool.pyrefly]
# チェック対象
include = ["src"]
exclude = ["tests", "dist"]

# 厳格度（段階的に引き上げる）
# pyrefly は型推論が強力なので注釈なしコードでも動作する
```

## 型注釈ベストプラクティス

### 基本

```python
# Python 3.12 推奨スタイル
def greet(name: str) -> str:
    return f"Hello, {name}"

# Optional の書き方（3.10+）
def find_user(user_id: int) -> User | None:
    ...

# Union（3.10+）
def parse(value: str | int | float) -> float:
    ...
```

### ジェネリクス（3.12+ 構文）

```python
# 新しい構文（3.12+）
def first[T](items: list[T]) -> T:
    return items[0]

# 旧構文（3.11以前との互換性が必要な場合）
from typing import TypeVar
T = TypeVar("T")
def first(items: list[T]) -> T:
    return items[0]
```

### Protocol（構造的部分型）

```python
from typing import Protocol

class Drawable(Protocol):
    def draw(self) -> None: ...

def render(obj: Drawable) -> None:  # Duck typing を型安全に
    obj.draw()
```

### TypedDict

```python
from typing import TypedDict

class UserConfig(TypedDict):
    name: str
    age: int
    email: str | None
```

### dataclass と型

```python
from dataclasses import dataclass, field

@dataclass
class Point:
    x: float
    y: float
    tags: list[str] = field(default_factory=list)

    def distance_from_origin(self) -> float:
        return (self.x**2 + self.y**2) ** 0.5
```

## 型推論の活用

pyrefly はローカル変数と戻り値の型を自動推論できる。
IDE 上でホバーすると推論された型が表示される。
推論結果が意図と異なる場合のみ明示的に型注釈を追加する。

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| `bad-argument-type` | 引数の型不一致 | 呼び出し側か定義側の型を修正 |
| `bad-return-type` | 戻り値の型不一致 | 戻り値の型注釈を確認 |
| `missing-attribute` | 存在しない属性へのアクセス | 型を確認・isinstance ガードを追加 |
| `undefined-name` | 未定義の変数 | import 漏れ・スコープを確認 |

## mypy/pyright からの移行

pyrefly は mypy と pyright の設定を読み取れる。

```bash
# 既存設定を pyrefly 形式に移行
pyrefly migrate-config
```
