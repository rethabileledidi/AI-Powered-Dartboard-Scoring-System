"""Terminal demo (no web server needed): a full 301 match where every dart is
rendered by the synthetic camera, detected by OpenCV, scored and fed to the game engine.

    python -m scripts.demo_match            # random seed
    python -m scripts.demo_match --seed 4 --sigma 10
"""
import argparse
import random

from app.config import Settings
from app.db import Repository
from app.services.game_service import GameService, SimRig


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--sigma", type=float, default=11.0, help="throwing inaccuracy in mm")
    ap.add_argument("--start", type=int, default=301)
    args = ap.parse_args()

    svc = GameService(Repository(), Settings(pbkdf2_iterations=1000))
    user = svc.register("demo", "demo-password")["user"]
    game = svc.create_game(user, ["Alice", "Bob"], args.start)
    gid = game["id"]
    svc._rigs[gid] = SimRig(args.seed)
    print(f"\n=== {args.start} double-out | Alice vs Bob | sigma={args.sigma}mm ===\n")

    for _ in range(400):
        res = svc.simulate(user, gid, sigma_mm=args.sigma)
        o, v = res["outcome"], res["vision"]
        x, y = res["simulated_dart_mm"]
        flag = "  BUST (%s)" % o["bust_reason"] if o["bust"] else ""
        print(f"R{o['round']} {o['player']:<5} dart {o['dart_number']}: {o['throw']['label']:<4}"
              f" ({x:7.1f},{y:7.1f})mm conf={v['confidence']:.2f}  -> {o['remaining']:>3} left{flag}")
        if o["turn_complete"] and not o["winner"]:
            nxt = res["game"]
            hint = nxt["checkout_hint"]
            print(f"   next: {nxt['current_player']}" + (f"  | checkout: {' '.join(hint)}" if hint else ""))
        if res["game"]["status"] == "finished":
            print(f"\n*** {res['game']['winner']} wins in round {o['round']}! ***\n")
            break

    for p in svc.dashboard(user)["players"]:
        print(f"{p['player']:<6} avg {p['three_dart_average']:>6}  first-9 {p['first_nine_average']:>6}  "
              f"highest {p['highest_visit']:>3}  100+: {p['count_100_plus']}  140+: {p['count_140_plus']}  "
              f"180s: {p['count_180']}  busts: {p['busts']}")


if __name__ == "__main__":
    main()
