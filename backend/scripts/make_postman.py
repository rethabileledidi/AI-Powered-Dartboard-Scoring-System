"""Generates docs/postman_collection.json (integration tests runnable in Postman / Newman)."""
import json
import pathlib


def req(name, method, path, body=None, tests=None, auth=True, raw=None):
    r = {"method": method, "header": [], "url": {"raw": "{{baseUrl}}" + path,
                                                 "host": ["{{baseUrl}}"], "path": path.strip("/").split("/")}}
    if auth:
        r["auth"] = {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]}
    if body is not None:
        r["header"].append({"key": "Content-Type", "value": "application/json"})
        r["body"] = {"mode": "raw", "raw": json.dumps(body, indent=2)}
    item = {"name": name, "request": r}
    if tests:
        item["event"] = [{"listen": "test", "script": {"type": "text/javascript", "exec": tests}}]
    return item


status = lambda code: [f"pm.test('status is {code}', () => pm.response.to.have.status({code}));"]
items = [
    req("Health", "GET", "/health", auth=False, tests=status(200)),
    req("Register", "POST", "/api/auth/register", {"username": "postman_user", "password": "password123"}, auth=False,
        tests=["pm.test('201 or 409 (already exists)', () => pm.expect([201, 409]).to.include(pm.response.code));",
               "if (pm.response.code === 201) pm.collectionVariables.set('token', pm.response.json().access_token);"]),
    req("Login", "POST", "/api/auth/login", {"username": "postman_user", "password": "password123"}, auth=False,
        tests=status(200) + ["pm.collectionVariables.set('token', pm.response.json().access_token);"]),
    req("Create game", "POST", "/api/games", {"players": ["Alice", "Bob"], "start": 301, "double_out": True},
        tests=status(201) + ["pm.collectionVariables.set('gameId', pm.response.json().id);"]),
    req("Manual throw T20", "POST", "/api/games/{{gameId}}/throws", {"label": "T20"},
        tests=status(200) + ["pm.test('301-60=241', () => pm.expect(pm.response.json().outcome.remaining).to.eql(241));"]),
    req("Simulate vision dart", "POST", "/api/games/{{gameId}}/simulate", {"x_mm": 0, "y_mm": 103},
        tests=status(200) + ["pm.test('vision scored T20', () => pm.expect(pm.response.json().outcome.throw.label).to.eql('T20'));"]),
    req("YOLO detected dart", "POST", "/api/games/{{gameId}}/throws/detected", {"label": "S20", "confidence": 0.9},
        tests=status(200) + ["pm.test('scored', () => pm.expect(pm.response.json().outcome.throw.label).to.eql('S20'));"]),
    req("Takeout (hand over)", "POST", "/api/games/{{gameId}}/takeout", tests=status(200)),
    req("Detected invalid label -> 400", "POST", "/api/games/{{gameId}}/throws/detected", {"label": "Z99"}, tests=status(400)),
    req("Checkout hint", "GET", "/api/games/{{gameId}}/checkout", tests=status(200)),
    req("Undo", "POST", "/api/games/{{gameId}}/undo", tests=status(200)),
    req("Invalid label -> 400", "POST", "/api/games/{{gameId}}/throws", {"label": "Z99"}, tests=status(400)),
    req("No token -> 401", "GET", "/api/games", auth=False, tests=status(401)),
    req("Dashboard", "GET", "/api/stats/me", tests=status(200)),
    req("Leaderboard", "GET", "/api/leaderboard", auth=False, tests=status(200)),
]
col = {"info": {"name": "AI Dart Board API - integration tests",
                "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"},
       "variable": [{"key": "baseUrl", "value": "http://localhost:8000"}, {"key": "token", "value": ""},
                    {"key": "gameId", "value": ""}], "item": items}
out = pathlib.Path(__file__).resolve().parent.parent / "docs" / "postman_collection.json"
out.write_text(json.dumps(col, indent=2))
print("wrote", out)
