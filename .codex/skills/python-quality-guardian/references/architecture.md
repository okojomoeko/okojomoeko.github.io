# Python アーキテクチャパターン

## リポジトリ構造パターン

### src レイアウト（推奨）

```
my-project/
├── src/
│   └── my_project/       # パッケージ本体
│       ├── __init__.py
│       ├── py.typed       # PEP 561: 型情報公開マーカー
│       ├── models/        # データモデル（Pydantic等）
│       ├── services/      # ビジネスロジック
│       ├── repositories/  # データアクセス層
│       ├── api/           # インタフェース層（FastAPI等）
│       └── utils/         # 汎用ユーティリティ
├── tests/
│   ├── conftest.py
│   ├── unit/             # ユニットテスト
│   ├── integration/      # 統合テスト
│   └── property/         # hypothesis テスト
└── pyproject.toml
```

**src レイアウトを使う理由**: `pip install -e .` なしに `import my_project` が通らないため、開発中に未インストールのコードを誤って import するバグを防ぐ。

## レイヤードアーキテクチャ

依存の方向: `API → Services → Repositories → Models`

```python
# models/user.py（外部依存なし）
from pydantic import BaseModel, EmailStr

class User(BaseModel):
    id: int
    name: str
    email: EmailStr

# repositories/user_repo.py（DB アクセス）
class UserRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    def get_by_id(self, user_id: int) -> User | None:
        ...

# services/user_service.py（ビジネスロジック）
class UserService:
    def __init__(self, repo: UserRepository) -> None:
        self._repo = repo

    def activate_user(self, user_id: int) -> User:
        user = self._repo.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError(user_id)
        ...
```

## 依存性注入

テスタビリティのために具象クラスではなく抽象（Protocol）に依存させる。

```python
from typing import Protocol

class UserRepo(Protocol):
    def get_by_id(self, user_id: int) -> User | None: ...
    def save(self, user: User) -> User: ...

class UserService:
    def __init__(self, repo: UserRepo) -> None:  # Protocol に依存
        self._repo = repo

# テスト時はモックを注入
class FakeUserRepo:
    def __init__(self) -> None:
        self._users: dict[int, User] = {}

    def get_by_id(self, user_id: int) -> User | None:
        return self._users.get(user_id)

    def save(self, user: User) -> User:
        self._users[user.id] = user
        return user

def test_activate_user() -> None:
    repo = FakeUserRepo()
    service = UserService(repo)
    ...
```

## Result 型パターン（例外の代替）

```python
from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")
E = TypeVar("E")

@dataclass(frozen=True)
class Ok(Generic[T]):
    value: T

@dataclass(frozen=True)
class Err(Generic[E]):
    error: E

type Result[T, E] = Ok[T] | Err[E]

# 使い方
def parse_age(raw: str) -> Result[int, str]:
    try:
        age = int(raw)
        if age < 0:
            return Err("Age cannot be negative")
        return Ok(age)
    except ValueError:
        return Err(f"'{raw}' is not a valid integer")

match parse_age("25"):
    case Ok(value=age):
        print(f"Age: {age}")
    case Err(error=msg):
        print(f"Error: {msg}")
```

## カスタム例外設計

```python
# exceptions.py
class MyProjectError(Exception):
    """全例外の基底クラス"""

class NotFoundError(MyProjectError):
    def __init__(self, resource: str, identifier: str | int) -> None:
        super().__init__(f"{resource} not found: {identifier}")
        self.resource = resource
        self.identifier = identifier

class ValidationError(MyProjectError):
    def __init__(self, field: str, message: str) -> None:
        super().__init__(f"Validation error on '{field}': {message}")
        self.field = field
```

## 設定管理

```python
# config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="APP_")

    database_url: str
    redis_url: str = "redis://localhost:6379"
    debug: bool = False
    max_connections: int = 10

# シングルトンとして使用
settings = Settings()
```

## モジュール `__init__.py` の方針

パブリック API は `__init__.py` で明示的に re-export する。

```python
# my_project/__init__.py
from my_project.models.user import User
from my_project.services.user_service import UserService

__all__ = ["User", "UserService"]
```

内部実装は直接 import させない。`from my_project import User` を推奨。

## アンチパターン詳細

### Mutable Default Argument（最も多いバグ源）

```python
# ❌ Bug: リストが全呼び出し間で共有される
def append_to(item: str, lst: list[str] = []) -> list[str]:
    lst.append(item)
    return lst

# ✅ Correct
def append_to(item: str, lst: list[str] | None = None) -> list[str]:
    if lst is None:
        lst = []
    lst.append(item)
    return lst
```

### 循環 import の解決

```python
# TYPE_CHECKING を使って型注釈のみの import を遅延させる
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from my_project.models import User  # 型チェック時のみ import

def process(user: User) -> None:  # 実行時は文字列扱い
    ...
```

### Global State の回避

```python
# ❌ Bad: グローバル状態
_cache: dict = {}

def get_user(user_id: int) -> User:
    if user_id not in _cache:
        _cache[user_id] = fetch_from_db(user_id)
    return _cache[user_id]

# ✅ Good: クラスでカプセル化
class UserCache:
    def __init__(self) -> None:
        self._cache: dict[int, User] = {}

    def get(self, user_id: int) -> User:
        if user_id not in self._cache:
            self._cache[user_id] = fetch_from_db(user_id)
        return self._cache[user_id]
```
