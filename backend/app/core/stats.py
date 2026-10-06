"""Player statistics computed from persisted throw rows."""
from __future__ import annotations

from collections import Counter, defaultdict


def summarise(rows: list[dict]) -> dict:
    """`rows` = throw rows of ONE player (any number of games), ordered by id."""
    visits: dict[tuple, dict] = defaultdict(lambda: {"score": 0, "darts": 0, "win": False, "bust": False})
    per_game_turns: dict[int, dict[int, dict]] = defaultdict(dict)
    for r in rows:
        v = visits[(r["game_id"], r["turn_no"])]
        v["score"] += r["scored"]
        v["darts"] += 1
        v["win"] = v["win"] or bool(r["is_win"])
        v["bust"] = v["bust"] or bool(r["bust"])
        per_game_turns[r["game_id"]][r["turn_no"]] = v

    darts = len(rows)
    total = sum(r["scored"] for r in rows)
    ok = [v["score"] for v in visits.values() if not v["bust"]]
    first9_score = first9_darts = 0
    for turns in per_game_turns.values():
        for turn_no in sorted(turns)[:3]:
            first9_score += turns[turn_no]["score"]
            first9_darts += turns[turn_no]["darts"]
    segments = Counter(r["label"] for r in rows if r["label"] != "MISS")
    return {
        "darts_thrown": darts,
        "visits": len(visits),
        "three_dart_average": round(total / darts * 3, 2) if darts else 0.0,
        "first_nine_average": round(first9_score / first9_darts * 3, 2) if first9_darts else 0.0,
        "highest_visit": max(ok, default=0),
        "count_180": sum(1 for s in ok if s == 180),
        "count_140_plus": sum(1 for s in ok if 140 <= s < 180),
        "count_100_plus": sum(1 for s in ok if 100 <= s < 140),
        "busts": sum(1 for v in visits.values() if v["bust"]),
        "best_checkout": max((v["score"] for v in visits.values() if v["win"]), default=0),
        "favourite_segments": [{"label": k, "count": c} for k, c in segments.most_common(5)],
    }
