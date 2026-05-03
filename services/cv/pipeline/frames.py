"""Sample frames at a fixed FPS via FFmpeg. Frames land in a Modal volume so
later stages can re-read them without re-downloading the source video.

Stub behavior (CV_USE_REAL_PIPELINE != "1"): returns the state unchanged with
synthetic dimensions so downstream stages have something to read.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

from .state import PipelineState

SAMPLE_FPS = 5.0
DEFAULT_W = 1920
DEFAULT_H = 1080


def _real_run(state: PipelineState) -> PipelineState:
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg not on PATH; install or use stub mode")

    out_dir = state.video_path.parent / f"frames_{state.job_id}"
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(state.video_path),
        "-vf",
        f"fps={SAMPLE_FPS}",
        str(out_dir / "f_%06d.jpg"),
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    frame_paths = sorted(out_dir.glob("*.jpg"))

    # Probe dimensions from the first frame.
    width, height = DEFAULT_W, DEFAULT_H
    if frame_paths:
        try:
            from PIL import Image

            with Image.open(frame_paths[0]) as im:
                width, height = im.size
        except Exception:
            pass

    state.frames_dir = out_dir
    state.frame_count = len(frame_paths)
    state.fps_sampled = SAMPLE_FPS
    state.width_px = width
    state.height_px = height
    return state


def run(state: PipelineState) -> PipelineState:
    if os.environ.get("CV_USE_REAL_PIPELINE") == "1":
        return _real_run(state)
    state.fps_sampled = SAMPLE_FPS
    state.width_px = DEFAULT_W
    state.height_px = DEFAULT_H
    state.frame_count = 600  # 2 minutes @ 5 fps
    return state
