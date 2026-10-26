"""REST + WebSocket layer. Deliberately thin: validate -> call service -> broadcast."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..core.board import board_spec, classify_point
from ..errors import AuthError, DomainError, PayloadTooLarge
from ..schemas import (CalibrationRequest, CreateGameRequest, Credentials, DetectedThrowRequest,
                       ManualThrowRequest, SimulateRequest)

router = APIRouter()
_bearer = HTTPBearer(auto_error=False)


def container(request: Request):
    return request.app.state.container


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer), c=Depends(container)) -> dict:
    if creds is None:
        raise AuthError("Missing bearer token")
    return c.service.user_from_token(creds.credentials)


async def _read_frame(request: Request, c) -> bytes:
    """Read an uploaded image body, rejecting anything over the configured limit."""
    limit = c.settings.max_frame_bytes
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > limit:
        raise PayloadTooLarge(f"Frame exceeds the {limit}-byte limit")
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > limit:
            raise PayloadTooLarge(f"Frame exceeds the {limit}-byte limit")
    return bytes(data)


async def _publish(c, game_id: int, kind: str, payload: dict) -> None:
    await c.hub.broadcast(game_id, {"type": kind, **payload})


# ------------------------------------------------------------------ system
@router.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "dartboard-backend", "version": "0.1.0"}


@router.get("/api/board/spec", tags=["board"])
def spec():
    return board_spec()


@router.get("/api/board/classify", tags=["board"], summary="Score a board-plane coordinate")
def classify(x_mm: float = Query(...), y_mm: float = Query(...)):
    return classify_point(x_mm, y_mm).to_dict()


# -------------------------------------------------------------------- auth
@router.post("/api/auth/register", status_code=201, tags=["auth"])
def register(body: Credentials, c=Depends(container)):
    return c.service.register(body.username, body.password)


@router.post("/api/auth/login", tags=["auth"])
def login(body: Credentials, c=Depends(container)):
    return c.service.login(body.username, body.password)


@router.get("/api/auth/me", tags=["auth"])
def me(user=Depends(current_user)):
    return user


# ------------------------------------------------------------------- games
@router.post("/api/games", status_code=201, tags=["games"])
def create_game(body: CreateGameRequest, user=Depends(current_user), c=Depends(container)):
    return c.service.create_game(user, body.players, body.start, body.double_out, body.double_in)


@router.get("/api/games", tags=["games"])
def list_games(user=Depends(current_user), c=Depends(container)):
    return c.service.list_games(user)


@router.get("/api/games/{game_id}", tags=["games"])
def get_game(game_id: int, user=Depends(current_user), c=Depends(container)):
    return c.service.get_game(user, game_id)


@router.get("/api/games/{game_id}/throws", tags=["games"])
def list_throws(game_id: int, user=Depends(current_user), c=Depends(container)):
    return c.service.list_throws(user, game_id)


@router.get("/api/games/{game_id}/checkout", tags=["games"])
def checkout(game_id: int, user=Depends(current_user), c=Depends(container)):
    return c.service.checkout(user, game_id)


@router.post("/api/games/{game_id}/throws", tags=["games"], summary="Manual score entry / correction")
async def manual_throw(game_id: int, body: ManualThrowRequest, user=Depends(current_user), c=Depends(container)):
    result = c.service.throw_manual(user, game_id, **body.model_dump())
    await _publish(c, game_id, "throw", result)
    return result


@router.post("/api/games/{game_id}/throws/detected", tags=["vision"],
             summary="Score a dart reported by the YOLO webcam bridge (stores source + confidence)")
async def detected_throw(game_id: int, body: DetectedThrowRequest, user=Depends(current_user), c=Depends(container)):
    result = c.service.throw_detected(user, game_id, **body.model_dump())
    await _publish(c, game_id, "yolo", result)
    return result


@router.post("/api/games/{game_id}/takeout", tags=["vision"],
             summary="Board cleared by the detector: hand over to the next player (idempotent)")
async def takeout(game_id: int, user=Depends(current_user), c=Depends(container)):
    result = c.service.takeout(user, game_id)
    await _publish(c, game_id, "takeout", result)
    return result


@router.post("/api/games/{game_id}/undo", tags=["games"])
async def undo(game_id: int, user=Depends(current_user), c=Depends(container)):
    result = c.service.undo(user, game_id)
    await _publish(c, game_id, "undo", result)
    return result


@router.post("/api/games/{game_id}/next-turn", tags=["games"])
async def next_turn(game_id: int, user=Depends(current_user), c=Depends(container)):
    result = c.service.next_turn(user, game_id)
    await _publish(c, game_id, "next_turn", result)
    return result


# ------------------------------------------------------------------ vision
@router.put("/api/vision/calibration", tags=["vision"])
def put_calibration(body: CalibrationRequest, user=Depends(current_user), c=Depends(container)):
    return c.service.save_calibration(user, body.points)


@router.get("/api/vision/calibration", tags=["vision"])
def get_calibration(user=Depends(current_user), c=Depends(container)):
    return c.service.get_calibration(user)


@router.post("/api/games/{game_id}/vision/baseline", tags=["vision"],
             summary="Upload the EMPTY board frame (raw JPEG/PNG body)")
async def vision_baseline(game_id: int, request: Request, user=Depends(current_user), c=Depends(container)):
    return c.service.vision_baseline(user, game_id, await _read_frame(request, c))


@router.post("/api/games/{game_id}/vision/frame", tags=["vision"],
             summary="Upload a camera frame (raw JPEG/PNG body) - detects and scores a new dart")
async def vision_frame(game_id: int, request: Request, user=Depends(current_user), c=Depends(container)):
    result = c.service.vision_frame(user, game_id, await _read_frame(request, c))
    await _publish(c, game_id, "vision", result)
    return result


@router.post("/api/games/{game_id}/simulate", tags=["vision"],
             summary="Throw a virtual dart through the full vision pipeline (no hardware needed)")
async def simulate(game_id: int, body: SimulateRequest | None = None, user=Depends(current_user), c=Depends(container)):
    body = body or SimulateRequest()
    result = c.service.simulate(user, game_id, body.target, body.sigma_mm, body.x_mm, body.y_mm)
    await _publish(c, game_id, "vision", result)
    return result


# ------------------------------------------------------------------- stats
@router.get("/api/stats/me", tags=["stats"], summary="Dashboard data")
def dashboard(user=Depends(current_user), c=Depends(container)):
    return c.service.dashboard(user)


@router.get("/api/leaderboard", tags=["stats"])
def leaderboard(limit: int = Query(10, ge=1, le=100), c=Depends(container)):
    return c.service.leaderboard(limit)


# --------------------------------------------------------------- websocket
@router.websocket("/ws/games/{game_id}")
async def game_socket(ws: WebSocket, game_id: int, token: str = Query(...)):
    c = ws.app.state.container
    try:
        user = c.service.user_from_token(token)
        state = c.service.get_game(user, game_id)
    except DomainError:
        await ws.close(code=4401)
        return
    await c.hub.connect(game_id, ws)
    await ws.send_json({"type": "snapshot", "game": state})
    try:
        while True:
            await ws.receive_text()          # keep-alive; the server only pushes
    except WebSocketDisconnect:
        await c.hub.disconnect(game_id, ws)
