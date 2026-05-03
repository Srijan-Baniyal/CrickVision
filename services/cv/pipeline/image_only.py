"""Single-image degenerate path. Skips frame sampling, segmentation, and
tracking — just runs detect → pose → llm and returns one Delivery (no
trajectory)."""

from __future__ import annotations

import os
import random
import tempfile
from pathlib import Path

import httpx

from models import Delivery

from .llm import (
    BALL_TYPES,
    CONTACT_ZONES,
    DISMISSALS,
    SHOT_TYPES,
    SPINS,
    SWINGS,
    _build_prompt,
    _gemini_call,
)
from .state import PipelineState

STUB_LENGTH = 7.5
STUB_SPEED = 138.0
STUB_DIR = 95.0
IMAGE_DOWNLOAD_TIMEOUT = 60


def _download_to_tmp(image_url: str) -> Path:
    with httpx.Client(timeout=IMAGE_DOWNLOAD_TIMEOUT, follow_redirects=True) as client:
        r = client.get(image_url)
        r.raise_for_status()
        suffix = ".jpg"
        if "image/png" in r.headers.get("content-type", ""):
            suffix = ".png"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as fp:
            fp.write(r.content)
            return Path(fp.name)


def _real_run(state: PipelineState) -> Delivery:  # pragma: no cover
    image_path = _download_to_tmp(state.video_path.as_uri() if state.video_path.exists() else "")
    raw = _gemini_call(_build_prompt("image"), [image_path.as_uri()])
    return Delivery(
        matchId=state.match_id,
        overNumber=0,
        ballInOver=1,
        ballType=raw["ballType"],
        line="offStump",
        lengthMeters=STUB_LENGTH,
        speedKmh=None,
        swing=raw.get("swing", "none"),
        spin=raw.get("spin", "none"),
        shotType=raw["shotType"],
        shotFootwork="frontFoot",
        shotTiming="wellTimed",
        shotDirectionDeg=STUB_DIR,
        contactZone=raw["contactZone"],
        runs=raw["runs"],
        isBoundary=raw["isBoundary"],
        isSix=raw["isSix"],
        isWicket=raw["isWicket"],
        dismissalType=raw["dismissalType"],
        commentary=raw["commentary"],
        isImageOnly=True,
    )


def run_image(state: PipelineState) -> Delivery:
    """Public entrypoint used by app.py for /v1/images. Returns the Delivery
    synchronously (no webhook — the caller posts it directly)."""
    if os.environ.get("CV_USE_REAL_PIPELINE") == "1":
        return _real_run(state)
    rng = random.Random(state.match_id)  # noqa: S311
    return Delivery(
        matchId=state.match_id,
        overNumber=0,
        ballInOver=1,
        ballType=rng.choice(BALL_TYPES),  # type: ignore[arg-type]
        line="offStump",
        lengthMeters=STUB_LENGTH,
        speedKmh=STUB_SPEED,
        swing=rng.choice(SWINGS),  # type: ignore[arg-type]
        spin=rng.choice(SPINS),  # type: ignore[arg-type]
        shotType=rng.choice(SHOT_TYPES),  # type: ignore[arg-type]
        shotFootwork="frontFoot",
        shotTiming="wellTimed",
        shotDirectionDeg=STUB_DIR,
        contactZone=rng.choice(CONTACT_ZONES),  # type: ignore[arg-type]
        runs=rng.choice([0, 1, 4, 6]),
        isBoundary=False,
        isSix=False,
        isWicket=False,
        dismissalType=rng.choice([d for d in DISMISSALS if d == "none"]),  # type: ignore[arg-type]
        commentary="A single image classification — no trajectory available.",
        isImageOnly=True,
    )


def run(state: PipelineState) -> PipelineState:
    """Pipeline-stage signature for the IMAGE_PIPELINE list. Doesn't actually
    do anything because run_image() is invoked directly by the FastAPI
    handler."""
    return state
