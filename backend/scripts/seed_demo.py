"""Populate the real database with mock data (demo users + simulated matches) for the dashboard."""
import random

from app.config import Settings
from app.db import Repository
from app.errors import Conflict
from app.services.game_service import GameService
from app.core.simulator import choose_target, sample_dart, target_xy
from app.core.board import classify_point

NAMES = ["Alice", "Bob", "Chloe", "Dev", "Esme", "Farai"]


def main(matches: int = 12, seed: int = 7) -> None:
    rng = random.Random(seed)
    svc = GameService(Repository(Settings().db_path), Settings())
    try:
        user = svc.register("demo", "demo-password")["user"]
    except Conflict:
        user = svc.login("demo", "demo-password")["user"]
    skill = {n: rng.uniform(7, 22) for n in NAMES}            # sigma in mm - lower is better
    for _ in range(matches):
        a, b = rng.sample(NAMES, 2)
        game = svc.create_game(user, [a, b], rng.choice([301, 501]))
        while True:
            row, g = svc._load(user, game["id"])
            who = g.players[g.current]["name"]
            x, y = sample_dart(rng, target_xy(choose_target(g)), skill[who])
            res = svc.throw_manual(user, game["id"], x_mm=x, y_mm=y)
            if res["game"]["status"] == "finished":
                break
    print(f"Seeded {matches} matches. Login: demo / demo-password")


if __name__ == "__main__":
    main()
