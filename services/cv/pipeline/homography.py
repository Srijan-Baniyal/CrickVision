"""Pitch homography. We need 4+ correspondences between known pitch
landmarks (popping crease intersections, return crease, stumps base) and
their pixel coordinates in a reference frame. cv2.findHomography solves
for H; later stages use cv2.perspectiveTransform to map pixel trajectory
to pitch coords (meters).

Real impl picks a reference frame per segment (the first frame with both
sets of stumps visible), detects the four pitch corners from the stumps +
return crease landmarks (also in YOLOv11 weights), and computes H.

When detection fails, we fall back to the stub identity mapping in
derive.py — the v1 risk noted in the plan ("homography needs pitch
corners") is mitigated by a per-match calibration UI we'll add post-MVP.
"""

from __future__ import annotations

import os
from typing import Any

from .state import PipelineState

PITCH_LENGTH_M = 20.12
PITCH_WIDTH_M = 3.05

# Real-world pitch corner coordinates (m), ordered TL → TR → BR → BL where
# bowler-end is "top" and striker is "bottom".
PITCH_CORNERS_WORLD = [
    (-PITCH_WIDTH_M / 2, PITCH_LENGTH_M),
    (PITCH_WIDTH_M / 2, PITCH_LENGTH_M),
    (PITCH_WIDTH_M / 2, 0.0),
    (-PITCH_WIDTH_M / 2, 0.0),
]


def _detect_pitch_corners(
    detections: list[Any], width: int, height: int
) -> list[tuple[float, float]] | None:
    """From stumps + crease detections in a reference frame, infer the four
    pitch corners. Stub: just returns None so derive.py falls back."""
    stumps = [d for d in detections if d.label == "stumps"]
    if len(stumps) < 2:
        return None
    # Sort by y (top stumps = bowler end).
    stumps.sort(key=lambda d: (d.bbox[1] + d.bbox[3]) / 2)
    far = stumps[0]
    near = stumps[-1]
    # Crude estimation: pitch width ≈ 3 * stumps width, pitched between
    # the two stump centroids.
    far_cx = (far.bbox[0] + far.bbox[2]) / 2
    far_cy = (far.bbox[1] + far.bbox[3]) / 2
    near_cx = (near.bbox[0] + near.bbox[2]) / 2
    near_cy = (near.bbox[1] + near.bbox[3]) / 2
    far_w = (far.bbox[2] - far.bbox[0]) * 3
    near_w = (near.bbox[2] - near.bbox[0]) * 3
    return [
        (max(0.0, far_cx - far_w / 2), far_cy),
        (min(float(width), far_cx + far_w / 2), far_cy),
        (min(float(width), near_cx + near_w / 2), near_cy),
        (max(0.0, near_cx - near_w / 2), near_cy),
    ]


def _real_run(state: PipelineState) -> PipelineState:  # pragma: no cover
    import cv2  # type: ignore[import-not-found]
    import numpy as np

    for seg in state.segments:
        key = (seg.over_number, seg.ball_in_over)
        detections = state.detections.get(key, [])
        if not detections:
            continue
        # Use the median frame as reference — most likely to have clean
        # camera angle.
        mid = len(seg.frame_indices) // 2
        ref_frame_idx = seg.frame_indices[mid]
        ref_dets = [d for d in detections if d.frame_idx == ref_frame_idx]
        corners = _detect_pitch_corners(ref_dets, state.width_px, state.height_px)
        if corners is None:
            continue
        H, _ = cv2.findHomography(
            np.array(corners, dtype=np.float32),
            np.array(PITCH_CORNERS_WORLD, dtype=np.float32),
        )
        state.homographies[key] = H
    return state


def run(state: PipelineState) -> PipelineState:
    if os.environ.get("CV_USE_REAL_PIPELINE") == "1":
        return _real_run(state)
    for seg in state.segments:
        state.homographies[(seg.over_number, seg.ball_in_over)] = "stub"
    return state
