# Road Quality Visualizer

A road-condition scanning system. A phone captures geo-tagged photos of the road,
the backend runs a YOLOv8 pothole detector on each photo, results are scored by
severity, paths are graded by aggregate quality, and everything is visualized in
a web dashboard and an in-app analytics screen.

## The four parts

| Part | Folder | Stack | Role |
|------|--------|-------|------|
| Detection model | `ml/` | Python, PyTorch (Ultralytics YOLO) | Train + export the pothole detector |
| Mobile app | `mobile/` | React Native 0.85 | Capture photos + GPS, buffer offline, sync |
| Backend API | `backend/` | Node.js + TypeScript + MySQL + ONNX Runtime | Receive photos, run inference, score, serve both clients |
| Web dashboard | `web/` | React (Vite) | Maps + charts + path detail + filters |
| Shared types | `shared/` | TypeScript | Data shapes used by web + backend |

## Architecture

**Phone captures photos with GPS; backend runs ONNX inference and stores the holes.**

```
[Phone camera] ── 1 photo/sec + GPS ──┐
                                       │  (buffered in AsyncStorage offline,
                                       │   synced when online — idempotent)
                                       ▼
                                [Node.js REST API]
                                 │       │       │
                       ONNX inference   MySQL   scoring + grading
                                 ▲       │
                  ┌──────────────┴───────┴──────────────┐
            [React web dashboard]              [Mobile analytics screen]
```

## Three things that drive the whole design

1. **No true depth from one camera** → score by *severity class*, not centimeters.
2. **One hole appears in multiple photos** → backend GPS-cluster-dedups holes within ~4 m.
3. **Hole count is meaningless without distance** → every photo + hole carries GPS; path score is normalized per km.

## Suggested build order (thin slice first)

1. **Backend + DB** (`backend/`) — register, auth, ingest, scoring (Phase 1).
2. **ML model** (`ml/`) — fine-tune YOLOv8n in Colab, export to both `.tflite` and `.onnx` (Phase 2).
3. **Mobile shell** (`mobile/`) — install RN, wire screens, photo capture pipeline (Phase 3a).
4. **Detection path** (`backend/`) — server-side ONNX endpoints `/scan-photo` + `/scan-finalize` (Phase 3b).
5. **Web dashboard** (`web/`) — React pages + charts + schematic (Phase 4).
6. **Integration thin slice** — phone → backend → MySQL → web, with a real scan (Phase 5).
7. **Polish & parity** — Sync the mobile app and web UI, add configurable backend server URL (Phase 6).

## Prerequisites

- **Node.js 22+** (mobile sets this via `engines`; web/backend match)
- **MySQL 8** (used by the backend; the schema is in `backend/db/migrations/`)
- **Python 3.10+** and a GPU (or Colab) for training the detector
- **Android Studio** (JDK 17 + SDK + NDK + Gradle 9) for the mobile build
- A real **Android phone** for camera+GPS testing (the emulator can't help here)
- The exported model file in two places: `mobile/assets/pothole.tflite` *(optional — kept as a fallback)* and `backend/models/pothole.onnx` (the one we actually use)
