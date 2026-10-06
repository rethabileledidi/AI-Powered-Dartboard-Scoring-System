"""X01 (301/501...) game engine: pure, deterministic and fully serialisable.

Rules implemented: 3 darts per visit, optional double-in, double-out (default),
bust handling (below zero / leaving 1 / finishing on a non-double) that reverts the
score to the start of the visit, undo, early end-of-turn, and win detection.
"""
from __future__ import annotations

import copy
from dataclasses import dataclass

from ..errors import Conflict, DomainError
from .board import Throw, throw_from_label
from .checkout import suggest_checkout

VALID_STARTS = (101, 201, 301, 401, 501, 601, 701, 801, 901, 1001)
MAX_PLAYERS = 8
DARTS_PER_TURN = 3
HISTORY_LIMIT = 300


@dataclass
class X01Config:
    start: int = 501
    double_out: bool = True
    double_in: bool = False

    def validate(self) -> None:
        if self.start not in VALID_STARTS:
            raise DomainError(f"start must be one of {VALID_STARTS}")

    def to_dict(self) -> dict:
        return {"start": self.start, "double_out": self.double_out, "double_in": self.double_in}


@dataclass
class ThrowOutcome:
    player_index: int
    player_name: str
    round: int
    dart_number: int
    throw: Throw
    scored: int
    bust: bool
    bust_reason: str | None
    remaining: int
    winner: bool
    turn_complete: bool
    next_player: str | None
    checkout_hint: list[str] | None = None

    def to_dict(self) -> dict:
        return {"player": self.player_name, "player_index": self.player_index,
                "round": self.round, "dart_number": self.dart_number,
                "throw": self.throw.to_dict(), "scored": self.scored,
                "bust": self.bust, "bust_reason": self.bust_reason,
                "remaining": self.remaining, "winner": self.winner,
                "turn_complete": self.turn_complete, "next_player": self.next_player,
                "checkout_hint": self.checkout_hint}


class X01Game:
    def __init__(self, players: list[str], config: X01Config | None = None):
        self.config = config or X01Config()
        self.config.validate()
        names = [p.strip() for p in players]
        if not 1 <= len(names) <= MAX_PLAYERS:
            raise DomainError(f"A game needs 1-{MAX_PLAYERS} players")
        if any(not n for n in names) or len({n.lower() for n in names}) != len(names):
            raise DomainError("Player names must be non-empty and unique")
        self.players = [{"name": n, "remaining": self.config.start,
                         "started": not self.config.double_in} for n in names]
        self.current = 0
        self.round = 1
        self.darts_in_turn = 0
        self.turn_start = self.config.start
        self.turn_throws: list[str] = []
        self.status = "in_progress"
        self.winner: int | None = None
        self._history: list[dict] = []

    # ------------------------------------------------------------ core rules
    def throw(self, t: Throw) -> ThrowOutcome:
        if self.status != "in_progress":
            raise Conflict("Game is already finished")
        self._push("throw")
        p = self.players[self.current]
        dart_no = self.darts_in_turn + 1
        scored, bust, reason, win = 0, False, None, False

        if not p["started"] and t.is_double:
            p["started"] = True
        if p["started"]:
            new = p["remaining"] - t.points
            if new < 0:
                bust, reason = True, "score_exceeded"
            elif new == 1 and self.config.double_out:
                bust, reason = True, "left_on_one"
            elif new == 0:
                if self.config.double_out and not t.is_double:
                    bust, reason = True, "must_finish_on_double"
                else:
                    win = True
            if not bust:
                scored, p["remaining"] = t.points, new

        self.turn_throws.append(t.label)
        self.darts_in_turn += 1
        if bust:
            p["remaining"] = self.turn_start
        turn_complete = bust or win or self.darts_in_turn >= DARTS_PER_TURN

        outcome = ThrowOutcome(self.current, p["name"], self.round, dart_no, t, scored,
                               bust, reason, p["remaining"], win, turn_complete, None)
        if win:
            self.status, self.winner = "finished", self.current
        elif turn_complete:
            self._advance()
        if self.status == "in_progress":
            outcome.next_player = self.players[self.current]["name"]
            outcome.checkout_hint = self.checkout_hint()
        return outcome

    def end_turn(self) -> None:
        """Darts were removed before three were thrown: hand over to the next player."""
        if self.status != "in_progress":
            raise Conflict("Game is already finished")
        if self.darts_in_turn == 0:
            raise Conflict("No darts thrown in this turn yet")
        self._push("end_turn")
        self._advance()

    def undo(self) -> str | None:
        """Revert the last action. Returns its kind ('throw'/'end_turn') or None."""
        if not self._history:
            return None
        snap = self._history.pop()
        self.players, self.current, self.round = snap["players"], snap["current"], snap["round"]
        self.darts_in_turn, self.turn_start = snap["darts_in_turn"], snap["turn_start"]
        self.turn_throws, self.status, self.winner = snap["turn_throws"], snap["status"], snap["winner"]
        return snap["kind"]

    def checkout_hint(self) -> list[str] | None:
        if self.status != "in_progress":
            return None
        p = self.players[self.current]
        if not p["started"]:
            return None
        return suggest_checkout(p["remaining"], DARTS_PER_TURN - self.darts_in_turn,
                                self.config.double_out)

    # ------------------------------------------------------------- internals
    def _advance(self) -> None:
        self.current = (self.current + 1) % len(self.players)
        if self.current == 0:
            self.round += 1
        self.darts_in_turn = 0
        self.turn_throws = []
        self.turn_start = self.players[self.current]["remaining"]

    def _push(self, kind: str) -> None:
        self._history.append({"kind": kind, **self._snapshot()})
        del self._history[:-HISTORY_LIMIT]

    def _snapshot(self) -> dict:
        return {"players": copy.deepcopy(self.players), "current": self.current,
                "round": self.round, "darts_in_turn": self.darts_in_turn,
                "turn_start": self.turn_start, "turn_throws": list(self.turn_throws),
                "status": self.status, "winner": self.winner}

    # --------------------------------------------------------- serialisation
    def to_dict(self) -> dict:
        return {"config": self.config.to_dict(), **self._snapshot(), "history": self._history}

    @classmethod
    def from_dict(cls, data: dict) -> "X01Game":
        game = cls([p["name"] for p in data["players"]], X01Config(**data["config"]))
        game.players, game.current, game.round = data["players"], data["current"], data["round"]
        game.darts_in_turn, game.turn_start = data["darts_in_turn"], data["turn_start"]
        game.turn_throws, game.status, game.winner = data["turn_throws"], data["status"], data["winner"]
        game._history = data.get("history", [])
        return game

    def view(self) -> dict:
        """Client-facing state."""
        return {"config": self.config.to_dict(), "status": self.status, "round": self.round,
                "players": [dict(p) for p in self.players],
                "current_player": self.players[self.current]["name"],
                "current_player_index": self.current,
                "darts_in_turn": self.darts_in_turn, "turn_throws": list(self.turn_throws),
                "winner": self.players[self.winner]["name"] if self.winner is not None else None,
                "checkout_hint": self.checkout_hint(), "can_undo": bool(self._history)}


def parse_throw(label: str) -> Throw:
    try:
        return throw_from_label(label)
    except ValueError as exc:
        raise DomainError(str(exc)) from exc
