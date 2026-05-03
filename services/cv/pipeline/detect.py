"""YOLOv11 object detection — ball, batsman, nonStriker, bowler, umpire,
stumps, bat. Cricket-specific weights from Roboflow Universe.

The real implementation requires:
- The `ml` extra installed (`uv sync --extra ml`).
- A weights file path in CV_YOLO_WEIGHTS pointing to a YOLOv11 .pt file
  trained on cricket classes. Roboflow Universe hosts several public ones
  (search "cricket ball detection"); fine-tune on broadcast frames for
  best results.
- A GPU (Modal T4 or better recommended).

Stub mode leaves detections empty; track.py + derive.py substitute synthetic
trajectories so the rest of the pipeline still produces validating output.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from .state import Detection, PipelineState

YOLO_WEIGHTS_ENV = "CV_YOLO_WEIGHTS"
YOLO_CONF_THRESHOLD = 0.35
YOLO_CRICKET_CLASSES = {
    "ball",
    "batsman",
    "nonStriker",
    "bowler",
    "umpire",
    "stumps",
    "bat",
}


def _load_model() -> Any:
    weights = os.environ.get(YOLO_WEIGHTS_ENV)
    if not weights or not Path(weights).exists():
        raise RuntimeError(
            f"set {YOLO_WEIGHTS_ENV} to the cricket YOLOv11 .pt weights path"
        )
    from ultralytics import YOLO  # type: ignore[import-not-found]

    return YOLO(weights)


def _real_run(state: PipelineState) -> PipelineState:  # pragma: no cover
    if state.frames_dir is None or state.frame_count == 0:
        return state
    model = _load_model()
    frames = sorted(state.frames_dir.glob("*.jpg"))

    for seg in state.segments:
        seg_detections: list[Detection] = []
        seg_frames = [frames[i] for i in seg.frame_indices if i < len(frames)]
        if not seg_frames:
            continue
        results = model.predict(
            seg_frames,
            conf=YOLO_CONF_THRESHOLD,
            verbose=False,
        )
        for frame_idx, result in zip(seg.frame_indices, results, strict=False):
            for box in result.boxes:
                cls_idx = int(box.cls.item())
                label = result.names.get(cls_idx, "unknown")
                if label not in YOLO_CRICKET_CLASSES:
                    continue
                xyxy = box.xyxy[0].tolist()
                seg_detections.append(
                    Detection(
                        frame_idx=frame_idx,
                        label=label,
                        bbox=(xyxy[0], xyxy[1], xyxy[2], xyxy[3]),
                        conf=float(box.conf.item()),
                    )
                )
        state.detections[(seg.over_number, seg.ball_in_over)] = seg_detections
    return state


def run(state: PipelineState) -> PipelineState:
    if os.environ.get("CV_USE_REAL_PIPELINE") == "1":
        return _real_run(state)
    return state
