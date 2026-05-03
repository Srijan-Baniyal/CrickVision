"""MediaPipe Pose on the batsman crop. Outputs per-frame keypoints we use to
detect frontFoot vs backFoot (knee/ankle relative to popping crease) and
shotTiming (bat-swing arc vs ball arrival time).

Real impl runs MediaPipe's Pose Landmarker on the batsman bbox extracted by
detect.py. Each keypoint is a (x, y, visibility) tuple in image coords.
"""

from __future__ import annotations

import os
from typing import Any

from .state import PipelineState, PoseSnapshot

# MediaPipe landmark names we care about.
TRACKED_LANDMARKS = {
    "left_shoulder": 11,
    "right_shoulder": 12,
    "left_hip": 23,
    "right_hip": 24,
    "left_knee": 25,
    "right_knee": 26,
    "left_ankle": 27,
    "right_ankle": 28,
    "left_wrist": 15,
    "right_wrist": 16,
}

STUB_KEYPOINTS = {
    "left_shoulder": (820.0, 420.0, 0.95),
    "right_shoulder": (900.0, 420.0, 0.95),
    "left_hip": (820.0, 560.0, 0.92),
    "right_hip": (900.0, 560.0, 0.92),
    "left_knee": (815.0, 700.0, 0.88),
    "right_knee": (910.0, 705.0, 0.88),
    "left_ankle": (810.0, 850.0, 0.84),
    "right_ankle": (920.0, 855.0, 0.84),
    "left_wrist": (760.0, 470.0, 0.7),
    "right_wrist": (960.0, 470.0, 0.7),
}


def _crop_bbox(detections: list[Any]) -> tuple[float, float, float, float] | None:
    batsman = [d for d in detections if d.label == "batsman"]
    if not batsman:
        return None
    best = max(batsman, key=lambda d: d.conf)
    return best.bbox


def _real_run(state: PipelineState) -> PipelineState:  # pragma: no cover
    import cv2  # type: ignore[import-not-found]
    import mediapipe as mp  # type: ignore[import-not-found]

    if state.frames_dir is None:
        return state
    pose = mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        enable_segmentation=False,
    )
    frames = sorted(state.frames_dir.glob("*.jpg"))

    for seg in state.segments:
        key = (seg.over_number, seg.ball_in_over)
        snapshots: list[PoseSnapshot] = []
        for frame_idx in seg.frame_indices:
            if frame_idx >= len(frames):
                continue
            img = cv2.imread(str(frames[frame_idx]))
            if img is None:
                continue
            bbox = _crop_bbox(state.detections.get(key, []))
            if bbox is None:
                continue
            x1, y1, x2, y2 = (int(v) for v in bbox)
            crop = img[max(0, y1) : y2, max(0, x1) : x2]
            if crop.size == 0:
                continue
            rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb)
            if not results.pose_landmarks:
                continue
            kpts: dict[str, tuple[float, float, float]] = {}
            for name, idx in TRACKED_LANDMARKS.items():
                lm = results.pose_landmarks.landmark[idx]
                kpts[name] = (
                    x1 + lm.x * (x2 - x1),
                    y1 + lm.y * (y2 - y1),
                    lm.visibility,
                )
            snapshots.append(PoseSnapshot(frame_idx=frame_idx, keypoints=kpts))
        state.poses[key] = snapshots
    pose.close()
    return state


def run(state: PipelineState) -> PipelineState:
    if os.environ.get("CV_USE_REAL_PIPELINE") == "1":
        return _real_run(state)
    for seg in state.segments:
        state.poses[(seg.over_number, seg.ball_in_over)] = [
            PoseSnapshot(frame_idx=12, keypoints=dict(STUB_KEYPOINTS))
        ]
    return state
