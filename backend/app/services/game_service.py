"""Application service: orchestrates engine + vision + persistence. Framework-agnostic."""
from __future__ import annotations

import json
import random
from collections import defaultdict

import cv2
import numpy as np

from ..auth import hash_password, issue_token, validate_credentials, verify_password, decode_token
from ..config import Settings
from ..core.board import Throw, classify_point, make_throw
from ..core.game import X01Config, X01Game, parse_throw
from ..core.simulator import choose_target, sample_dart, target_xy
from ..core.stats import summarise
from ..db import Repository
from ..errors import AuthError, Conflict, DomainError, Forbidden, NotFound
from ..vision.calibration import Calibration, CalibrationError
from ..vision.pipeline import PipelineResult, VisionPipeline
from ..vision.synthetic import SyntheticCamera


class SimRig:
    """A virtual camera + pipeline pair so a game can be demoed with no hardware."""

    def __init__(self, seed: int | None = None):
        self.camera = SyntheticCamera(seed=seed)
        self.pipeline = VisionPipeline(self.camera.calibration())
        self.pipeline.set_baseline(self.camera.capture())
        self.rng = random.Random(seed)

    def reset_board(self) -> None:
        self.camera.clear()
        self.pipeline.process(self.camera.capture())      # registers the take-out


class GameService:
    def __init__(self, repo: Repository, settings: Settings):
        self.repo, self.settings = repo, settings
        self._pipelines: dict[int, tuple[int, VisionPipeline]] = {}
        self._rigs: dict[int, SimRig] = {}

    # ------------------------------------------------------------------ auth
    def register(self, username: str, password: str) -> dict:
        validate_credentials(username, password)
        try:
            user = self.repo.create_user(username, hash_password(password, self.settings.pbkdf2_iterations))
        except ValueError as exc:
            raise Conflict("Username is already taken") from exc
        return self._token_response(user)

    def login(self, username: str, password: str) -> dict:
        user = self.repo.get_user_by_name(username)
        if not user or not verify_password(password, user["password_hash"]):
            raise AuthError("Invalid username or password")
        return self._token_response(user)

    def user_from_token(self, token: str) -> dict:
        claims = decode_token(token, self.settings.jwt_secret)
        user = self.repo.get_user(int(claims["sub"]))
        if not user:
            raise AuthError("User no longer exists")
        return {"id": user["id"], "username": user["username"]}

    def _token_response(self, user: dict) -> dict:
        token = issue_token(user["id"], user["username"], self.settings.jwt_secret,
                            self.settings.jwt_ttl_minutes)
        return {"access_token": token, "token_type": "bearer",
                "user": {"id": user["id"], "username": user["username"]}}

    # ----------------------------------------------------------------- games
    def create_game(self, user: dict, players: list[str], start: int = 501,
                    double_out: bool = True, double_in: bool = False) -> dict:
        game = X01Game(players, X01Config(start, double_out, double_in))
        row = self.repo.create_game(user["id"], "x01", game.to_dict())
        return self._view(row, game)

    def get_game(self, user: dict, game_id: int) -> dict:
        row, game = self._load(user, game_id)
        return self._view(row, game)

    def list_games(self, user: dict) -> list[dict]:
        return self.repo.list_games(user["id"])

    def list_throws(self, user: dict, game_id: int) -> list[dict]:
        self._load(user, game_id)
        return self.repo.list_throws(game_id)

    def checkout(self, user: dict, game_id: int) -> dict:
        _, game = self._load(user, game_id)
        return {"player": game.players[game.current]["name"],
                "remaining": game.players[game.current]["remaining"],
                "darts_left": 3 - game.darts_in_turn, "route": game.checkout_hint()}

    def throw_manual(self, user: dict, game_id: int, *, label: str | None = None,
                     multiplier: int | None = None, sector: int | None = None,
                     x_mm: float | None = None, y_mm: float | None = None) -> dict:
        row, game = self._load(user, game_id)
        if label is not None:
            throw, x, y = parse_throw(label), None, None
        elif multiplier is not None and sector is not None:
            try:
                throw, x, y = make_throw(multiplier, sector), None, None
            except ValueError as exc:
                raise DomainError(str(exc)) from exc
        elif x_mm is not None and y_mm is not None:
            throw, x, y = classify_point(x_mm, y_mm), x_mm, y_mm
        else:
            raise DomainError("Provide label, (multiplier and sector) or (x_mm and y_mm)")
        return self._apply(row, game, throw, "manual", None, x, y)

    def throw_detected(self, user: dict, game_id: int, *, label: str, confidence: float = 1.0,
                       source: str = "yolo") -> dict:
        """Score a dart reported by an external detector; stored with its source and confidence."""
        row, game = self._load(user, game_id)
        return self._apply(row, game, parse_throw(label), source, confidence, None, None)

    def takeout(self, user: dict, game_id: int) -> dict:
        """Board cleared (darts pulled): hand over to the next player. Safe to call repeatedly."""
        row, game = self._load(user, game_id)
        if game.status == "in_progress" and game.darts_in_turn > 0:
            game.end_turn()
            self._persist(row, game)
            row = self.repo.get_game(game_id)
            return {"handed_over": True, "game": self._view(row, game)}
        return {"handed_over": False, "game": self._view(row, game)}

    def undo(self, user: dict, game_id: int) -> dict:
        row, game = self._load(user, game_id)
        kind = game.undo()
        if kind is None:
            raise Conflict("Nothing to undo")
        if kind == "throw":
            self.repo.delete_last_throw(game_id)
        self._persist(row, game)
        return {"undone": kind, "game": self._view(self.repo.get_game(game_id), game)}

    def next_turn(self, user: dict, game_id: int) -> dict:
        row, game = self._load(user, game_id)
        game.end_turn()
        self._persist(row, game)
        self._reset_rig(game_id)
        return {"game": self._view(self.repo.get_game(game_id), game)}

    # ---------------------------------------------------------------- vision
    def save_calibration(self, user: dict, points: list[list[float]]) -> dict:
        try:
            Calibration([tuple(p) for p in points])
        except CalibrationError as exc:
            raise DomainError(str(exc)) from exc
        self.repo.save_calibration(user["id"], points)
        for gid in [g for g, (owner, _) in self._pipelines.items() if owner == user["id"]]:
            del self._pipelines[gid]
        return {"points": points, "order": ["20|1", "6|10", "3|19", "11|14"]}

    def get_calibration(self, user: dict) -> dict:
        pts = self.repo.get_calibration(user["id"])
        if pts is None:
            raise NotFound("No calibration stored - PUT /api/vision/calibration first")
        return {"points": pts, "order": ["20|1", "6|10", "3|19", "11|14"]}

    def vision_baseline(self, user: dict, game_id: int, image: bytes) -> dict:
        self._load(user, game_id)
        pipe = self._pipeline_for(user, game_id)
        return pipe.set_baseline(self._decode(image)).to_dict()

    def vision_frame(self, user: dict, game_id: int, image: bytes) -> dict:
        row, game = self._load(user, game_id)
        pipe = self._pipeline_for(user, game_id)
        result = pipe.process(self._decode(image))
        return self._handle_vision(row, game, result)

    def simulate(self, user: dict, game_id: int, target: str = "auto", sigma_mm: float = 12.0,
                 x_mm: float | None = None, y_mm: float | None = None) -> dict:
        if not self.settings.allow_simulation:
            raise Forbidden("Simulation is disabled on this server")
        row, game = self._load(user, game_id)
        if game.status != "in_progress":
            raise Conflict("Game is already finished")
        rig = self._rigs.setdefault(game_id, SimRig())
        if x_mm is None or y_mm is None:
            aim = target_xy(choose_target(game) if target == "auto" else target)
            x_mm, y_mm = sample_dart(rig.rng, aim, sigma_mm)
        rig.camera.add_dart(x_mm, y_mm)
        result = rig.pipeline.process(rig.camera.capture())
        payload = self._handle_vision(row, game, result, rig=rig)
        payload["simulated_dart_mm"] = [round(x_mm, 2), round(y_mm, 2)]
        return payload

    # ----------------------------------------------------------------- stats
    def dashboard(self, user: dict) -> dict:
        rows = self.repo.throws_for_owner(user["id"])
        by_player: dict[str, list] = defaultdict(list)
        for r in rows:
            by_player[r["player_name"]].append(r)
        finished = self.repo.finished_games(user["id"])
        wins: dict[str, int] = defaultdict(int)
        for g in finished:
            if g["winner"]:
                wins[g["winner"]] += 1
        players = []
        for name, prows in by_player.items():
            s = summarise(prows)
            s.update(player=name, wins=wins.get(name, 0))
            players.append(s)
        players.sort(key=lambda p: p["three_dart_average"], reverse=True)
        return {"games_total": len(self.repo.list_games(user["id"], 10_000)),
                "games_finished": len(finished), "darts_total": len(rows), "players": players,
                "recent_games": self.repo.list_games(user["id"], 5)}

    def leaderboard(self, limit: int = 10) -> list[dict]:
        wins: dict[str, int] = defaultdict(int)
        for g in self.repo.finished_games():
            if g["winner"]:
                wins[g["winner"]] += 1
        by_player: dict[str, list] = defaultdict(list)
        for r in self.repo.all_throws():
            by_player[r["player_name"]].append(r)
        board = [{"player": n, "wins": wins.get(n, 0), "darts_thrown": len(rs),
                  "three_dart_average": summarise(rs)["three_dart_average"],
                  "best_checkout": summarise(rs)["best_checkout"]} for n, rs in by_player.items()]
        board.sort(key=lambda b: (b["wins"], b["three_dart_average"]), reverse=True)
        return board[:limit]

    # -------------------------------------------------------------- internals
    def _load(self, user: dict, game_id: int) -> tuple[dict, X01Game]:
        row = self.repo.get_game(game_id)
        if not row:
            raise NotFound("Game not found")
        if row["owner_id"] != user["id"]:
            raise Forbidden("You do not own this game")
        return row, X01Game.from_dict(json.loads(row["state_json"]))

    def _persist(self, row: dict, game: X01Game) -> None:
        winner = game.players[game.winner]["name"] if game.winner is not None else None
        self.repo.update_game(row["id"], game.to_dict(), winner)

    def _view(self, row: dict, game: X01Game) -> dict:
        return {"id": row["id"], "mode": row["mode"], "created_at": row["created_at"], **game.view()}

    def _apply(self, row, game, throw: Throw, source: str, confidence, x, y) -> dict:
        outcome = game.throw(throw)
        self.repo.add_throw(row["id"], player_index=outcome.player_index, player_name=outcome.player_name,
                            turn_no=outcome.round, dart_no=outcome.dart_number, label=throw.label,
                            points=throw.points, scored=outcome.scored, bust=outcome.bust,
                            is_win=outcome.winner, source=source, confidence=confidence, x_mm=x, y_mm=y)
        self._persist(row, game)
        if outcome.turn_complete:
            self._reset_rig(row["id"])
        return {"outcome": outcome.to_dict(), "game": self._view(self.repo.get_game(row["id"]), game)}

    def _handle_vision(self, row, game, result: PipelineResult, rig: SimRig | None = None) -> dict:
        payload: dict = {"vision": result.to_dict()}
        if result.status == "ok":
            payload.update(self._apply(row, game, result.throw, "vision", result.confidence,
                                       result.x_mm, result.y_mm))
        elif result.status == "takeout" and game.status == "in_progress" and game.darts_in_turn > 0:
            game.end_turn()
            self._persist(row, game)
            payload["game"] = self._view(self.repo.get_game(row["id"]), game)
        else:
            payload["game"] = self._view(row, game)
        return payload

    def _reset_rig(self, game_id: int) -> None:
        rig = self._rigs.get(game_id)
        if rig:
            rig.reset_board()

    def _pipeline_for(self, user: dict, game_id: int) -> VisionPipeline:
        entry = self._pipelines.get(game_id)
        if entry:
            return entry[1]
        pts = self.repo.get_calibration(user["id"])
        if pts is None:
            raise Conflict("Camera not calibrated - PUT /api/vision/calibration first")
        pipe = VisionPipeline(Calibration([tuple(p) for p in pts]))
        self._pipelines[game_id] = (user["id"], pipe)
        return pipe

    @staticmethod
    def _decode(image: bytes) -> np.ndarray:
        frame = cv2.imdecode(np.frombuffer(image, np.uint8), cv2.IMREAD_COLOR) if image else None
        if frame is None:
            raise DomainError("Request body is not a valid JPEG/PNG image")
        return frame
