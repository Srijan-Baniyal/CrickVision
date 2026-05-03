"""Find delivery boundaries.

Real strategy:
1. PaddleOCR the bottom strip of every Nth frame to read the scoreboard.
2. Detect the score string changing → likely end of delivery.
3. Cross-check with a shot-cut detector (HSV histogram delta) to align with
   the broadcast edit.

Stub: emit 6 segments of 5s each so downstream stages get realistic shapes
to operate on.
"""

from __future__ import annotations

import os
from typing import Any

from .state import DeliverySegment, PipelineState

STUB_DELIVERY_COUNT = 6
SEGMENT_LENGTH_MS = 5000

OCR_SCAN_EVERY_N_FRAMES = 10
SCOREBOARD_BAND_HEIGHT_PCT = 0.18
HIST_DELTA_THRESHOLD = 0.5  # HSV histogram intersection delta for shot cuts


def _scan_scoreboard(_frames: list[Any]) -> list[int]:  # pragma: no cover
    """Return frame indices where the scoreboard text changed (delivery
    boundaries). Real impl uses PaddleOCR on the bottom strip."""
    from paddleocr import PaddleOCR  # type: ignore[import-not-found]

    ocr = PaddleOCR(use_angle_cls=False, lang="en", show_log=False)
    last_text = ""
    boundaries: list[int] = []
    for idx, frame_path in enumerate(_frames):
        if idx % OCR_SCAN_EVERY_N_FRAMES != 0:
            continue
        result = ocr.ocr(str(frame_path), cls=False)
        text = " ".join(
            line[1][0]
            for block in result or []
            for line in (block or [])
            if line and line[1]
        )
        if text and text != last_text:
            boundaries.append(idx)
            last_text = text
    return boundaries


def _detect_cuts(_frames: list[Any]) -> list[int]:  # pragma: no cover
    """HSV histogram intersection drop ⇒ broadcast cut. Used to align
    OCR-derived boundaries with the actual delivery start frame."""
    import cv2  # type: ignore[import-not-found]
    import numpy as np

    cuts: list[int] = []
    prev_hist = None
    for idx, frame_path in enumerate(_frames):
        img = cv2.imread(str(frame_path))
        if img is None:
            continue
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1], None, [16, 16], [0, 180, 0, 256])
        cv2.normalize(hist, hist)
        if prev_hist is not None:
            similarity = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_INTERSECT)
            if similarity < HIST_DELTA_THRESHOLD:
                cuts.append(idx)
        prev_hist = hist
    return cuts


def _real_run(state: PipelineState) -> PipelineState:  # pragma: no cover
    if state.frames_dir is None:
        return state
    frames = sorted(state.frames_dir.glob("*.jpg"))
    boundaries = _scan_scoreboard(frames)
    if not boundaries:
        boundaries = _detect_cuts(frames)
    fps = state.fps_sampled
    over_number = 1
    ball_in_over = 1
    segments: list[DeliverySegment] = []
    prev = 0
    for boundary in boundaries:
        if boundary <= prev:
            continue
        segments.append(
            DeliverySegment(
                over_number=over_number,
                ball_in_over=ball_in_over,
                start_ms=int((prev / fps) * 1000),
                end_ms=int((boundary / fps) * 1000),
                frame_indices=list(range(prev, boundary)),
            )
        )
        ball_in_over += 1
        if ball_in_over > 6:
            over_number += 1
            ball_in_over = 1
        prev = boundary
    state.segments = segments
    return state


def run(state: PipelineState) -> PipelineState:
    if os.environ.get("CV_USE_REAL_PIPELINE") == "1":
        return _real_run(state)
    state.segments = [
        DeliverySegment(
            over_number=1,
            ball_in_over=i + 1,
            start_ms=i * SEGMENT_LENGTH_MS,
            end_ms=(i + 1) * SEGMENT_LENGTH_MS,
            frame_indices=list(
                range(int(i * state.fps_sampled * 5), int((i + 1) * state.fps_sampled * 5))
            ),
        )
        for i in range(STUB_DELIVERY_COUNT)
    ]
    return state
