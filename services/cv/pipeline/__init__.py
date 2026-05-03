"""Pipeline = ordered list of stages. Each stage is a pure function
(state) -> state so the whole flow can be replayed from a saved state.

Add a new stage:
1. Implement `def run(state: PipelineState) -> PipelineState` in a new file.
2. Insert into the appropriate list below.
3. Write a fixture-based test in tests/test_pipeline.py.

See .cursor/skills/add-cv-step for the detailed recipe.
"""

from __future__ import annotations

from collections.abc import Callable
from time import perf_counter

from . import (
    aggregate,
    derive,
    detect,
    frames,
    homography,
    image_only,
    llm,
    phases,
    pose,
    segment,
    track,
)
from .state import PipelineState

Stage = Callable[[PipelineState], PipelineState]


VIDEO_PIPELINE: list[tuple[str, Stage]] = [
    ("frames", frames.run),
    ("segment", segment.run),
    ("detect", detect.run),
    ("track", track.run),
    ("pose", pose.run),
    ("homography", homography.run),
    ("phases", phases.run),
    ("derive", derive.run),
    ("llm", llm.run),
    ("aggregate", aggregate.run),
]

IMAGE_PIPELINE: list[tuple[str, Stage]] = [
    ("image_only", image_only.run),
]


def run_pipeline(
    state: PipelineState, stages: list[tuple[str, Stage]]
) -> PipelineState:
    """Execute stages in order, recording per-stage wall-clock time."""
    s = state
    for name, fn in stages:
        t0 = perf_counter()
        s = fn(s)
        s.with_stage_duration(name, (perf_counter() - t0) * 1000)
    return s


__all__ = ["IMAGE_PIPELINE", "VIDEO_PIPELINE", "run_pipeline"]
