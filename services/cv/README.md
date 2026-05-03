# Cricket Vision Pipeline

FastAPI + GPU pipeline for the [cricket-vision](../..) Next.js app. Deploys to
Modal; local dev runs against the stub pipeline (no GPU required).

## Layout

```
services/cv/
├── pyproject.toml          # uv-managed
├── Makefile                # common commands
├── app.py                  # FastAPI app: /v1/jobs, /v1/downloads, /v1/images
├── modal_deploy.py         # Modal entrypoint (GPU image)
├── models.py               # Pydantic — 1:1 mirror of lib/cv/schema.ts
├── pipeline/
│   ├── __init__.py         # ordered list of stages
│   ├── state.py            # PipelineState dataclass shared between stages
│   ├── frames.py           # FFmpeg sample at 5 fps
│   ├── segment.py          # PaddleOCR scoreboard + cut detection
│   ├── detect.py           # YOLOv11
│   ├── track.py            # ByteTrack
│   ├── pose.py             # MediaPipe Pose
│   ├── homography.py       # pixel → pitch coords (m)
│   ├── phases.py           # trajectory phase segmentation (approach/bounce/…)
│   ├── derive.py           # geometric facts (line, length, speed, timing, …)
│   ├── llm.py              # Gemini 2.5 structured output (semantic labels)
│   ├── aggregate.py        # merge + signed webhook back to Next
│   ├── image_only.py       # degenerate single-image path
│   └── webhook.py          # HMAC-signed POST helper
├── stubs/                  # canned data for cv-stub-e2e
│   └── deliveries.json
└── tests/
    ├── conftest.py
    ├── fixtures/
    └── test_pipeline.py
```

## Run locally

```bash
uv sync
uv run uvicorn app:app --reload --port 8787
```

By default the pipeline returns canned data from `stubs/deliveries.json`. Set
`CV_USE_REAL_PIPELINE=1` to engage YOLO + Gemini (requires GPU + the `ml` extra
installed: `uv sync --extra ml`).

## Deploy to Modal

```bash
modal deploy modal_deploy.py
```

Modal exposes a public URL like `https://your-workspace--cricket-cv.modal.run`.
Drop that into the Next app's `CV_SERVICE_URL` env var.

## Auth & webhooks

- Inbound: every request must carry `Authorization: Bearer ${CV_SERVICE_TOKEN}`.
- Outbound: per-delivery webhooks back to the Next app are signed with HMAC
  SHA-256 in the `x-cv-signature` header. The shared secret arrives in the
  initial `POST /v1/jobs` payload.
