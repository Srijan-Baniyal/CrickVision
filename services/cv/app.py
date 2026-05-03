"""FastAPI entrypoint. Endpoints:

- POST /v1/jobs       — kick off a video job, returns jobId, runs async
- POST /v1/downloads  — yt-dlp a URL, return Blob URL + metadata
- POST /v1/images     — synchronous single-image inference
- GET  /v1/jobs/{id}  — current status of a job
- GET  /healthz       — liveness

Auth: every request must carry `Authorization: Bearer ${CV_SERVICE_TOKEN}`.
"""

from __future__ import annotations

import asyncio
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from models import (
    DownloadRequest,
    DownloadResponse,
    ImageRequest,
    JobStatusResponse,
    StartJobRequest,
    StartJobResponse,
)
from pipeline import IMAGE_PIPELINE, VIDEO_PIPELINE, run_pipeline
from pipeline.image_only import run_image
from pipeline.state import PipelineState
from pipeline.webhook import send

DOWNLOAD_DIR = Path(os.environ.get("CV_DATA_DIR", "/tmp/cricket-cv"))
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

bearer = HTTPBearer(auto_error=True)
EXPECTED_TOKEN = os.environ.get("CV_SERVICE_TOKEN", "")

# In-process job registry. For Modal multi-replica deployment swap to a
# Modal Volume-backed sqlite or external store.
JOBS: dict[str, JobStatusResponse] = {}

executor = ThreadPoolExecutor(max_workers=4)


def _auth(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> None:
    if not EXPECTED_TOKEN or creds.credentials != EXPECTED_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")


@asynccontextmanager
async def lifespan(_app: FastAPI):  # type: ignore[no-untyped-def]
    yield
    executor.shutdown(wait=False)


app = FastAPI(title="Cricket CV", version="0.1.0", lifespan=lifespan)


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/jobs", response_model=StartJobResponse, dependencies=[Depends(_auth)])
async def start_job(req: StartJobRequest, bg: BackgroundTasks) -> StartJobResponse:
    job_id = str(uuid.uuid4())
    JOBS[job_id] = JobStatusResponse(
        jobId=job_id,
        matchId=req.matchId,
        status="queued",
    )
    bg.add_task(_run_video_job, job_id, req)
    return StartJobResponse(jobId=job_id)


def _run_video_job(job_id: str, req: StartJobRequest) -> None:
    """Synchronous wrapper around the pipeline. Runs in a worker thread so
    BackgroundTasks doesn't block the FastAPI event loop."""
    try:
        JOBS[job_id] = JobStatusResponse(
            jobId=job_id, matchId=req.matchId, status="running"
        )
        # Real impl downloads req.videoUrl into a tmp file. Stub mode reuses
        # an empty path because frames.py does no real work in that mode.
        video_path = DOWNLOAD_DIR / f"{job_id}.mp4"
        if os.environ.get("CV_USE_REAL_PIPELINE") == "1":
            with httpx.stream("GET", req.videoUrl, follow_redirects=True) as r:
                r.raise_for_status()
                with video_path.open("wb") as fp:
                    for chunk in r.iter_bytes():
                        fp.write(chunk)
        else:
            video_path.touch()

        state = PipelineState(
            job_id=job_id,
            match_id=req.matchId,
            video_path=video_path,
            callback_url=req.callbackUrl,
            hmac_secret=req.hmacSecret,
        )
        run_pipeline(state, VIDEO_PIPELINE)

        JOBS[job_id] = JobStatusResponse(
            jobId=job_id,
            matchId=req.matchId,
            status="completed",
            progress=1.0,
            deliveriesEmitted=len(state.segments),
        )
    except Exception as e:  # noqa: BLE001
        JOBS[job_id] = JobStatusResponse(
            jobId=job_id,
            matchId=req.matchId,
            status="failed",
            error=str(e),
        )
        try:
            import asyncio
            from models import JobFailedEvent

            payload = JobFailedEvent(
                jobId=job_id,
                matchId=req.matchId,
                error={"message": str(e)},
            ).model_dump(mode="json")
            asyncio.run(send(req.callbackUrl, req.hmacSecret, payload))
        except Exception:
            pass


@app.get("/v1/jobs/{job_id}", response_model=JobStatusResponse, dependencies=[Depends(_auth)])
async def get_job(job_id: str) -> JobStatusResponse:
    if job_id not in JOBS:
        raise HTTPException(status_code=404, detail="job not found")
    return JOBS[job_id]


@app.post(
    "/v1/downloads", response_model=DownloadResponse, dependencies=[Depends(_auth)]
)
async def download_url(req: DownloadRequest) -> DownloadResponse:
    """Stub mode echoes the URL as the blob URL with synthetic dimensions.
    Real mode shells out to yt-dlp and uploads the result to Vercel Blob."""
    if os.environ.get("CV_USE_REAL_PIPELINE") != "1":
        return DownloadResponse(
            blobUrl=req.url,
            byteSize=10_000_000,
            durationSec=120.0,
            widthPx=1920,
            heightPx=1080,
            fps=30.0,
        )
    from pipeline.downloader import download

    return await asyncio.to_thread(download, req.url, req.matchId)


@app.post("/v1/images", dependencies=[Depends(_auth)])
async def process_image(req: ImageRequest) -> dict:
    state = PipelineState(
        job_id=str(uuid.uuid4()),
        match_id=req.matchId,
        video_path=Path("/dev/null"),
        callback_url=req.callbackUrl,
        hmac_secret=req.hmacSecret,
    )
    # Run the (currently no-op) image pipeline to keep the registration
    # discoverable, then call the synchronous single-frame inference.
    run_pipeline(state, IMAGE_PIPELINE)
    delivery = run_image(state)
    return delivery.model_dump(mode="json")
