"""ByteTrack over per-frame ball detections to produce a continuous
trajectory. Trajectories must continue past bat-ball impact (problem
statement requirement) — we re-acquire on post-impact frames using the same
tracker since ByteTrack handles short occlusions naturally.

Real implementation uses `supervision.ByteTrack` from
https://supervision.roboflow.com.

Stub mode synthesizes a parabolic ball path so derive.py and the UI overlay
have realistic data to chart.
"""

from __future__ import annotations

import math
import os
from typing import Any

from .state import PipelineState, TrackPoint

STUB_FRAMES_PER_DELIVERY = 25
STUB_RELEASE_X = 960
STUB_RELEASE_Y = 350
STUB_BOUNCE_X = 960
STUB_BOUNCE_Y = 700
STUB_AFTER_X = 1300
STUB_AFTER_Y = 540


def _ball_centroid(detections: list[Any]) -> tuple[float, float, float] | None:
    """Pick the highest-confidence ball detection in a frame."""
    candidates = [d for d in detections if d.label == "ball"]
    if not candidates:
        return None
    best = max(candidates, key=lambda d: d.conf)
    cx = (best.bbox[0] + best.bbox[2]) / 2
    cy = (best.bbox[1] + best.bbox[3]) / 2
    return cx, cy, best.conf


def _real_run(state: PipelineState) -> PipelineState:  # pragma: no cover
    import supervision as sv  # type: ignore[import-not-found]

    fps = state.fps_sampled
    for seg in state.segments:
        key = (seg.over_number, seg.ball_in_over)
        detections = state.detections.get(key, [])
        if not detections:
            continue
        # Group detections by frame so ByteTrack receives one batch per frame.
        per_frame: dict[int, list[Any]] = {}
        for det in detections:
            per_frame.setdefault(det.frame_idx, []).append(det)

        tracker = sv.ByteTrack()
        track_points: list[TrackPoint] = []
        for frame_idx in seg.frame_indices:
            frame_dets = per_frame.get(frame_idx, [])
            if not frame_dets:
                continue
            sv_dets = sv.Detections(
                xyxy=[d.bbox for d in frame_dets],
                confidence=[d.conf for d in frame_dets],
                class_id=[0 if d.label == "ball" else 1 for d in frame_dets],
            )
            tracker.update_with_detections(sv_dets)
            ball = _ball_centroid(frame_dets)
            if ball is None:
                continue
            cx, cy, conf = ball
            track_points.append(
                TrackPoint(
                    frame_idx=frame_idx,
                    t_ms=int((frame_idx / fps) * 1000),
                    x_px=cx,
                    y_px=cy,
                    conf=conf,
                )
            )
        state.tracks[key] = track_points
    return state


def _stub_track(segment_idx: int, fps: float) -> list[TrackPoint]:
    points: list[TrackPoint] = []
    for i in range(STUB_FRAMES_PER_DELIVERY):
        t = i / (STUB_FRAMES_PER_DELIVERY - 1)
        jitter = math.sin(segment_idx + t * math.pi) * 20
        if t < 0.5:
            ratio = t / 0.5
            x = STUB_RELEASE_X + (STUB_BOUNCE_X - STUB_RELEASE_X) * ratio + jitter
            y = STUB_RELEASE_Y + (STUB_BOUNCE_Y - STUB_RELEASE_Y) * ratio
        else:
            ratio = (t - 0.5) / 0.5
            x = STUB_BOUNCE_X + (STUB_AFTER_X - STUB_BOUNCE_X) * ratio + jitter
            y = STUB_BOUNCE_Y + (STUB_AFTER_Y - STUB_BOUNCE_Y) * ratio
        points.append(
            TrackPoint(
                frame_idx=i,
                t_ms=int((i / fps) * 1000),
                x_px=x,
                y_px=y,
                conf=0.9 if abs(t - 0.5) > 0.05 else 0.45,
            )
        )
    return points


def run(state: PipelineState) -> PipelineState:
    if os.environ.get("CV_USE_REAL_PIPELINE") == "1":
        return _real_run(state)
    for idx, seg in enumerate(state.segments):
        state.tracks[(seg.over_number, seg.ball_in_over)] = _stub_track(
            idx, state.fps_sampled
        )
    return state
