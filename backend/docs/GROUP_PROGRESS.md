# Group Progress  *(Rubric: Group Progress 4)*

> Fill in the real names, dates and links before the video - lecturers want **evidence**, so screenshot the Git graph, board and issues.

## Team & shared responsibilities
| Member | Role | Owns |
|--------|------|------|
| _name_ | Backend / API | `app/`, tests, Docker |
| _name_ | Computer vision | `app/vision/`, calibration, benchmark |
| _name_ | Hardware | camera, lighting, Pi setup, `edge_camera_client.py` |
| _name_ | Frontend | scoreboard UI consuming `/docs` + WebSocket |
| _name_ | QA / docs | Postman, usability tests, report, video |

## Process
* **Git workflow:** `main` (protected) <- `feature/*` branches via pull requests with 1 review; commit style `feat: / fix: / test: / docs:`.
* **Agile:** 1-week sprints, Monday planning, Wednesday stand-up, Friday review + retrospective; Kanban board (Trello/Jira/GitHub Projects) with columns Backlog - In progress - Review - Done.
* **Decoupling:** backend published mock-friendly endpoints (`/simulate`, `/api/board/classify`) on day 1, so the frontend never waited for hardware.

## Sprint log (replace with your real data)
| Sprint | Goal | Delivered | Retro note |
|--------|------|-----------|-----------|
| 1 | Board geometry + game engine | scoring, X01, tests | lock rules before UI |
| 2 | Vision pipeline + API + auth | calibration, detector, REST/WS | synthetic camera unblocked everyone |
| 3 | Hardware integration | edge client, real-frame tests | lighting is critical |

## Evidence checklist
- [ ] Screenshot of GitHub commit graph / contributors
- [ ] Screenshot of Kanban board
- [ ] Merged pull requests with review comments
- [ ] Meeting notes / stand-up log
