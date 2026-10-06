"""SQLite persistence (stdlib sqlite3). Thread-safe via a single guarded connection."""
from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime, timezone

SCHEMA = """
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL,
    status TEXT NOT NULL,
    winner TEXT,
    state_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_games_owner ON games(owner_id);
CREATE TABLE IF NOT EXISTS throws (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_index INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    turn_no INTEGER NOT NULL,
    dart_no INTEGER NOT NULL,
    label TEXT NOT NULL,
    points INTEGER NOT NULL,
    scored INTEGER NOT NULL,
    bust INTEGER NOT NULL DEFAULT 0,
    is_win INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL,
    confidence REAL,
    x_mm REAL,
    y_mm REAL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_throws_game ON throws(game_id);
CREATE TABLE IF NOT EXISTS calibrations (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    points_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Repository:
    def __init__(self, path: str = ":memory:"):
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        if path != ":memory:":
            self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.executescript(SCHEMA)

    def _one(self, sql, args=()):
        with self._lock:
            row = self._conn.execute(sql, args).fetchone()
        return dict(row) if row else None

    def _all(self, sql, args=()):
        with self._lock:
            return [dict(r) for r in self._conn.execute(sql, args).fetchall()]

    def _exec(self, sql, args=()):
        with self._lock:
            cur = self._conn.execute(sql, args)
            self._conn.commit()
            return cur

    # -------------------------------------------------------------- users
    def create_user(self, username: str, password_hash: str) -> dict:
        try:
            cur = self._exec("INSERT INTO users(username,password_hash,created_at) VALUES(?,?,?)",
                             (username, password_hash, _now()))
        except sqlite3.IntegrityError as exc:
            raise ValueError("username_taken") from exc
        return self.get_user(cur.lastrowid)

    def get_user(self, user_id: int):
        return self._one("SELECT * FROM users WHERE id=?", (user_id,))

    def get_user_by_name(self, username: str):
        return self._one("SELECT * FROM users WHERE username=?", (username,))

    # -------------------------------------------------------------- games
    def create_game(self, owner_id: int, mode: str, state: dict) -> dict:
        now = _now()
        cur = self._exec("INSERT INTO games(owner_id,mode,status,winner,state_json,created_at,updated_at)"
                         " VALUES(?,?,?,?,?,?,?)",
                         (owner_id, mode, state["status"], None, json.dumps(state), now, now))
        return self.get_game(cur.lastrowid)

    def get_game(self, game_id: int):
        return self._one("SELECT * FROM games WHERE id=?", (game_id,))

    def update_game(self, game_id: int, state: dict, winner: str | None) -> None:
        self._exec("UPDATE games SET status=?, winner=?, state_json=?, updated_at=? WHERE id=?",
                   (state["status"], winner, json.dumps(state), _now(), game_id))

    def list_games(self, owner_id: int, limit: int = 50):
        return self._all("SELECT id,mode,status,winner,created_at,updated_at FROM games "
                         "WHERE owner_id=? ORDER BY id DESC LIMIT ?", (owner_id, limit))

    # ------------------------------------------------------------- throws
    def add_throw(self, game_id: int, **f) -> int:
        cur = self._exec(
            "INSERT INTO throws(game_id,player_index,player_name,turn_no,dart_no,label,points,scored,"
            "bust,is_win,source,confidence,x_mm,y_mm,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (game_id, f["player_index"], f["player_name"], f["turn_no"], f["dart_no"], f["label"],
             f["points"], f["scored"], int(f["bust"]), int(f["is_win"]), f["source"],
             f.get("confidence"), f.get("x_mm"), f.get("y_mm"), _now()))
        return cur.lastrowid

    def delete_last_throw(self, game_id: int) -> bool:
        row = self._one("SELECT id FROM throws WHERE game_id=? ORDER BY id DESC LIMIT 1", (game_id,))
        if not row:
            return False
        self._exec("DELETE FROM throws WHERE id=?", (row["id"],))
        return True

    def list_throws(self, game_id: int):
        return self._all("SELECT * FROM throws WHERE game_id=? ORDER BY id", (game_id,))

    def throws_for_owner(self, owner_id: int):
        return self._all("SELECT t.* FROM throws t JOIN games g ON g.id=t.game_id "
                         "WHERE g.owner_id=? ORDER BY t.id", (owner_id,))

    def all_throws(self):
        return self._all("SELECT * FROM throws ORDER BY id")

    def finished_games(self, owner_id: int | None = None):
        if owner_id is None:
            return self._all("SELECT id,winner,state_json FROM games WHERE status='finished'")
        return self._all("SELECT id,winner,state_json FROM games WHERE status='finished' AND owner_id=?",
                         (owner_id,))

    # -------------------------------------------------------- calibration
    def save_calibration(self, user_id: int, points: list) -> None:
        self._exec("INSERT INTO calibrations(user_id,points_json,updated_at) VALUES(?,?,?) "
                   "ON CONFLICT(user_id) DO UPDATE SET points_json=excluded.points_json, "
                   "updated_at=excluded.updated_at", (user_id, json.dumps(points), _now()))

    def get_calibration(self, user_id: int):
        row = self._one("SELECT * FROM calibrations WHERE user_id=?", (user_id,))
        return json.loads(row["points_json"]) if row else None
