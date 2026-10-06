# System Architecture  *(Rubric: System Architecture 5 · Technology Stack 5)*

Render any diagram below at <https://mermaid.live> (or the GitHub/VS Code Mermaid preview) and export PNG/SVG for the slides/video.

**Two detection paths feed the same backend.** The *live hardware path* (diagrams 1, 2, 4a) uses the team's trained YOLOv8 model on a webcam: it recognises which board segment each dart is in and reports it to the API. The *geometry path* (diagram 4b) uses OpenCV background subtraction + a homography; it powers the hardware-free simulator, CI and the benchmark. Both end in the same X01 engine, database and WebSocket scoreboard.

## 1. Network schematic (physical + logical)

```mermaid
flowchart LR
    subgraph HW["Hardware - at the board"]
        BOARD["Dart board<br/>(standard 18 in)"]
        CAM["Webcam (USB or built-in)<br/>beside the board, angled view<br/>as in the training photos"]
        PC["Laptop / PC with the webcam<br/>yolo_bridge.py<br/>OpenCV capture + YOLOv8 inference<br/>+ stability tracker"]
        BOARD --- CAM
        CAM -- "USB / built-in" --> PC
    end
    NET(("localhost or<br/>Wi-Fi / LAN"))
    subgraph SRV["Backend server (Docker or uvicorn, port 8000)"]
        API["FastAPI + Uvicorn<br/>REST + WebSocket"]
        ENG["X01 game engine<br/>+ checkout + stats"]
        VIS["OpenCV geometry pipeline<br/>calibration - detect - score<br/>(simulator / fallback)"]
        DB[("SQLite<br/>users - games - throws - calibrations")]
        API --> ENG --> DB
        API -.-> VIS -.-> ENG
    end
    subgraph CLIENTS["Clients"]
        WEB["Web / tablet scoreboard<br/>(React - frontend team)"]
        PM["Postman / Newman<br/>integration tests"]
    end
    PC -- "HTTP POST /throws/detected and /takeout<br/>JSON + Bearer JWT" --> NET
    NET --> API
    API -- "WebSocket push<br/>(live scores)" --> WEB
    WEB -- "REST (auth, games, manual fix, stats)" --> API
    PM -.-> API
```

## 2. Technology stack (hardware + software)

```mermaid
flowchart TB
    subgraph H["Hardware components"]
        H1["Dart board"]
        H2["Webcam (USB or built-in)"]
        H3["Laptop / PC<br/>(runs the bridge; can also host the server)"]
        H4["Network: localhost or Wi-Fi / LAN"]
    end
    subgraph E["Edge software (on the laptop)"]
        E1["Python + OpenCV<br/>frame capture, preview"]
        E2["YOLOv8 (Ultralytics, PyTorch)<br/>custom weights, 57 segment classes"]
        E3["yolo_bridge.py<br/>confidence filter + stability tracker"]
        E4["Roboflow dataset v5<br/>507 images (training only)"]
    end
    subgraph S["Backend software"]
        S1["Python 3.12"]
        S2["FastAPI, Uvicorn, Pydantic v2"]
        S3["OpenCV 4, NumPy<br/>(geometry pipeline / simulator)"]
        S4["PyJWT, PBKDF2-HMAC-SHA256"]
        S5["SQLite (WAL mode)"]
        S6["WebSockets"]
        S7["pytest/unittest, Postman/Newman, GitHub Actions CI"]
        S8["Docker, Git/GitHub"]
    end
    H1 --> H2 --> H3
    H3 --> E1 --> E2 --> E3
    E4 -. "trains" .-> E2
    E3 -- "REST + JWT" --> H4
    H4 --> S2
    S2 --> S3
    S2 --> S4
    S2 --> S5
    S2 --> S6
```

## 3. UML class diagram (backend + bridge)

```mermaid
classDiagram
    class Throw { +Ring ring +int sector +int multiplier +int points +label() +is_double() }
    class X01Game {
        +X01Config config
        +list players
        +throw(Throw) ThrowOutcome
        +undo() str
        +end_turn()
        +checkout_hint() list
        +to_dict() / from_dict()
    }
    class X01Config { +int start +bool double_out +bool double_in }
    class ThrowOutcome { +int scored +bool bust +bool winner +bool turn_complete +list checkout_hint }
    class Calibration { +pixel_to_board(px,py) +board_to_pixel(x,y) +center_px }
    class DartDetector { +detect(before, after) Detection +board_is_clear() bool }
    class VisionPipeline { +set_baseline(frame) +process(frame) PipelineResult }
    class GameService {
        +create_game()
        +throw_manual()
        +throw_detected()
        +takeout()
        +vision_frame()
        +simulate()
        +undo()
        +dashboard()
        +leaderboard()
    }
    class Repository { +create_game() +add_throw() +list_throws() +save_calibration() }
    class ConnectionHub { +connect() +broadcast() }
    class SyntheticCamera { +capture() +add_dart() +calibration() }
    class YoloBridge {
        +class_to_label(name)
        +dispatch(events, post, game_id)
    }
    class DartTracker {
        +float min_conf
        +int stable_frames
        +update(detections) list
        +reset()
    }
    class BridgeEvent { +str kind +str label +float confidence }
    X01Game --> X01Config
    X01Game ..> Throw
    X01Game --> ThrowOutcome
    VisionPipeline --> DartDetector
    VisionPipeline --> Calibration
    DartDetector --> Calibration
    VisionPipeline ..> Throw : classify_point()
    GameService --> X01Game
    GameService --> VisionPipeline
    GameService --> Repository
    GameService ..> SyntheticCamera : simulate
    ConnectionHub ..> GameService : events pushed by API layer
    YoloBridge --> DartTracker
    DartTracker ..> BridgeEvent
    YoloBridge ..> GameService : HTTP throws/detected and takeout
```

## 4a. Sequence - one dart on the live hardware path (YOLO)

```mermaid
sequenceDiagram
    participant Cam as Webcam
    participant Br as yolo_bridge.py (YOLOv8 + tracker)
    participant API as FastAPI
    participant G as X01Game
    participant DB as SQLite
    participant UI as Scoreboard (WebSocket)
    loop every frame
        Cam->>Br: frame
        Br->>Br: YOLO detects darts, class to label (triple_20 to T20)
        Br->>Br: keep conf above threshold, same picture for N frames, new darts only
    end
    Br->>API: POST /games/{id}/throws/detected {T20, confidence}
    API->>G: throw(T20)
    G-->>API: outcome (scored, bust?, win?, next player, checkout hint)
    API->>DB: INSERT throw (source=yolo, confidence), UPDATE game state
    API-->>UI: WebSocket {type: yolo, outcome, game}
    API-->>Br: 200 JSON
    Note over Br,API: board empty for N frames, so POST /games/{id}/takeout hands over to the next player
```

## 4b. Sequence - one dart on the geometry path (simulator / fallback)

```mermaid
sequenceDiagram
    participant Cam as Camera or SyntheticCamera
    participant API as FastAPI
    participant V as VisionPipeline
    participant G as X01Game
    participant DB as SQLite
    participant UI as Scoreboard (WebSocket)
    Cam->>API: POST /games/{id}/vision/frame (JPEG) or /simulate
    API->>V: process(frame)
    V->>V: diff vs baseline, find blob, tip = nearest pixel to centre
    V->>V: homography: pixel to mm, classify_point()
    V-->>API: status=ok, T20, confidence 0.96
    API->>G: throw(T20)
    G-->>API: outcome
    API->>DB: INSERT throw (source=vision), UPDATE game state
    API-->>UI: WebSocket {type: vision, outcome, game}
    API-->>Cam: 200 JSON
```

## 5. Entity-relationship diagram

```mermaid
erDiagram
    USERS ||--o{ GAMES : owns
    USERS ||--o| CALIBRATIONS : has
    GAMES ||--o{ THROWS : records
    USERS {
        int id PK
        text username UK
        text password_hash
    }
    GAMES {
        int id PK
        int owner_id FK
        text status
        text winner
        text state_json
    }
    THROWS {
        int id PK
        int game_id FK
        text player_name
        int turn_no
        text label
        int scored
        int bust
        int is_win
        text source "manual, vision or yolo"
        real confidence
        real x_mm
        real y_mm
    }
    CALIBRATIONS {
        int user_id PK
        text points_json
    }
```

## 6. Turn state machine

```mermaid
stateDiagram-v2
    [*] --> Throwing
    Throwing --> Throwing: dart 1-2, valid score
    Throwing --> NextPlayer: 3rd dart
    Throwing --> NextPlayer: bust (score reverts)
    Throwing --> Finished: reaches 0 on a double
    NextPlayer --> Throwing: darts removed (board clear, POST takeout)
    Finished --> [*]
```

## Design decisions worth stating in the video
* **Layered & modular**: `core/` (rules, pure) -> `vision/` (OpenCV + bridge logic) -> `services/` (orchestration) -> `api/` (HTTP). Each layer is unit-testable alone, and the front-end team can work against the OpenAPI docs at `/docs`.
* **Hardware and backend are decoupled by a tiny contract**: the webcam side only sends `{label, confidence}` and `takeout`. The model can be retrained or replaced without touching the game engine, database or API.
* **A live camera sees every dart in every frame**, so the bridge never scores raw detections: it requires a confidence threshold, a picture that stays identical for N frames, and reconciles each stable picture with the darts it believes are on the board (count-based): a dart re-labelled as a neighbouring segment is matched to the nearest known dart instead of being re-scored, a dart that falls out is dropped, and only the leftovers count as new throws.
* **Provenance is stored**: every throw records `source` (manual / vision / yolo) and `confidence`, so wrong detections can be audited and the model's real-world accuracy measured from the database.
* **Simulation rig**: the geometry pipeline can be fed by a synthetic camera, so the demo and CI never depend on hardware; the YOLO path is tested by replaying detection streams through the real API.
* **Graceful failure**: low-confidence detections are never auto-scored; manual correction + undo always available; an idempotent `takeout` can be retried safely.
