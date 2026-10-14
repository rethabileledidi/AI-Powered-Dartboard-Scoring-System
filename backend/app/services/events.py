"""WebSocket hub: pushes live game events to every connected scoreboard."""
from __future__ import annotations

import asyncio
from collections import defaultdict


class ConnectionHub:
    def __init__(self):
        self._rooms: dict[int, set] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, game_id: int, ws) -> None:
        await ws.accept()
        async with self._lock:
            self._rooms[game_id].add(ws)

    async def disconnect(self, game_id: int, ws) -> None:
        async with self._lock:
            self._rooms[game_id].discard(ws)

    async def broadcast(self, game_id: int, message: dict) -> None:
        for ws in list(self._rooms.get(game_id, ())):
            try:
                await ws.send_json(message)
            except Exception:                      # dead socket - drop it
                await self.disconnect(game_id, ws)
