# Improvements & Next Steps  *(Rubric: Improvements & Next Steps 3)*

| Priority | Item | Why / how | Owner | Target |
|----------|------|-----------|-------|--------|
| P1 | Fix the YOLO class list and retrain | Add the missing classes (`single_2`, `single_19`, `triple_4/10/11/14`, outer bull), remove the `tdouble_19` typo class, add photos for classes with <10 examples (current mAP50 0.44, recall 0.41). | Vision | Sprint 3 |
| P1 | Reproducible training | Make `Train.py` match the committed run (model size, epochs, patience), remove the hardcoded Windows path, report per-class metrics on a held-out test set. | Vision | Sprint 3 |
| P1 | Real-board accuracy study | Log every YOLO throw (source + confidence are already stored) against what actually landed; report segment accuracy from 200+ throws; tune `--conf` and `--stable`. | Vision + QA | Sprint 3 |
| P1 | Second camera / stereo view | Removes depth ambiguity and handles overlapping darts; triangulate tip. | Hardware + Vision | Sprint 3 |
| P1 | Tip-level detector | Train a keypoint/tip model on the collected frames (more precise than segment regions); keep the OpenCV geometry path as fallback. | Vision | Sprint 4 |
| P2 | Persist vision baselines + auto re-baseline | Survive restarts; re-capture empty board after take-out. | Backend | Sprint 3 |
| P2 | More game modes | Cricket, Around the Clock, Shanghai (engine already strategy-shaped). | Backend | Sprint 4 |
| P2 | Hardening | Rate limiting, refresh tokens, HTTPS reverse proxy, Postgres option. | Backend | Sprint 4 |
| P3 | Live camera preview + "tap to correct" in UI | Uses `needs_review` flag already returned by the API. | Frontend | Sprint 4 |
| P3 | Tournament mode, player profiles linked to user accounts | Dashboard growth. | Backend + Frontend | Final |

**Definition of done for final submission:** full match played on the physical board with >= 90 % correct segment scoring (measured from the stored throw log), two game modes, deployed Docker image, 80 %+ test coverage of `core/` and `vision/`.
