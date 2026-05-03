"""Shared state object passed through every pipeline stage. Each stage is a
pure function (state) -> state so we can replay individual stages from a
serialized state dict (see the pipeline-debug skill)."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class DeliverySegment:
    """One delivery's slice of the source video."""

    over_number: int
    ball_in_over: int
    start_ms: int
    end_ms: int
    frame_indices: list[int] = field(default_factory=list)


@dataclass
class Detection:
    frame_idx: int
    label: str  # "ball" | "batsman" | "bowler" | "stumps" | …
    bbox: tuple[float, float, float, float]  # x1, y1, x2, y2
    conf: float


@dataclass
class TrackPoint:
    frame_idx: int
    t_ms: int
    x_px: float
    y_px: float
    conf: float


@dataclass
class PoseSnapshot:
    frame_idx: int
    keypoints: dict[str, tuple[float, float, float]]  # {name: (x, y, conf)}


@dataclass
class PipelineState:
    """Threaded through every stage. A stage MUST NOT mutate fields it
    didn't add; copy and return instead."""

    # Inputs
    job_id: str
    match_id: str
    video_path: Path
    callback_url: str
    hmac_secret: str

    # Frames (set by frames.py)
    fps_sampled: float = 5.0
    width_px: int = 0
    height_px: int = 0
    frames_dir: Path | None = None
    frame_count: int = 0

    # Segmentation (set by segment.py)
    segments: list[DeliverySegment] = field(default_factory=list)

    # Per-segment intermediates — keyed by (over, ballInOver)
    detections: dict[tuple[int, int], list[Detection]] = field(default_factory=dict)
    tracks: dict[tuple[int, int], list[TrackPoint]] = field(default_factory=dict)
    poses: dict[tuple[int, int], list[PoseSnapshot]] = field(default_factory=dict)
    homographies: dict[tuple[int, int], Any] = field(default_factory=dict)

    # Metadata
    stage_durations_ms: dict[str, float] = field(default_factory=dict)

    def with_stage_duration(self, stage: str, ms: float) -> None:
        self.stage_durations_ms[stage] = ms
