"""Segment a ball trajectory into named phases:

- approach     — bowler release → first ground contact
- bounce       — first ground contact frame
- afterBounce  — bounce → impact frame
- impact       — bat-ball contact frame
- afterImpact  — post-impact flight until end-of-track or boundary

Heuristic: the bounce is the trajectory point with maximum y on screen (in
broadcast view); impact is the next sharp angle change. A real implementation
uses 3D height (z) → bounce is min-z; impact is detected via ball trajectory
curvature change combined with bat keypoint proximity from pose.py.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from .state import PipelineState, TrackPoint


@dataclass(slots=True)
class PhasedTrack:
    points: list[TrackPoint]
    phases: list[str]  # parallel to points, one of approach/bounce/...


def _classify(points: list[TrackPoint]) -> list[str]:
    if len(points) < 3:
        return ["approach"] * len(points)
    bounce_idx = max(range(len(points)), key=lambda i: points[i].y_px)
    # Detect impact: largest angle change after bounce.
    impact_idx = bounce_idx + 1
    best_delta = 0.0
    for i in range(bounce_idx + 1, len(points) - 1):
        prev = points[i] if i == 0 else points[i - 1]
        curr = points[i]
        nxt = points[i + 1]
        dx1, dy1 = curr.x_px - prev.x_px, curr.y_px - prev.y_px
        dx2, dy2 = nxt.x_px - curr.x_px, nxt.y_px - curr.y_px
        delta = abs(dx1 * dy2 - dy1 * dx2)
        if delta > best_delta:
            best_delta = delta
            impact_idx = i

    out = []
    for i in range(len(points)):
        if i < bounce_idx:
            out.append("approach")
        elif i == bounce_idx:
            out.append("bounce")
        elif i < impact_idx:
            out.append("afterBounce")
        elif i == impact_idx:
            out.append("impact")
        else:
            out.append("afterImpact")
    return out


_PHASES_CACHE: dict[tuple[int, int], list[str]] = {}


def get_phases(state: PipelineState, key: tuple[int, int]) -> list[str]:
    return _PHASES_CACHE.get(key, [])


def run(state: PipelineState) -> PipelineState:
    # No-op when there are no tracks (e.g. cv-real-pipeline disabled detect).
    for key, points in state.tracks.items():
        _PHASES_CACHE[key] = _classify(points)
    if os.environ.get("CV_DEBUG_PHASES") == "1":  # pragma: no cover
        print(f"phases derived for {len(_PHASES_CACHE)} segments")
    return state
