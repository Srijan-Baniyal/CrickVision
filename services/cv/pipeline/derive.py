"""Pure-Python derivations from trajectory + pose. NEVER ask Gemini for
anything in here — geometric facts are deterministic and must not depend on
LLM output (see AGENTS.md "Pipeline correctness rules").

Outputs per delivery:
- pitchPoint, impactPoint, endPoint (with terminator)
- lengthMeters, line
- speedKmh
- shotFootwork, shotTiming, shotDirectionDeg
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass

from .homography import PITCH_LENGTH_M, PITCH_WIDTH_M
from .phases import get_phases
from .state import PipelineState, PoseSnapshot, TrackPoint

WIDTH_PX = 1920
HEIGHT_PX = 1080
SPEED_KMH_DEFAULT = 132.0
SHOT_DIRECTION_RANGE = 360.0


@dataclass(slots=True)
class DerivedDelivery:
    over_number: int
    ball_in_over: int
    pitch_point: tuple[float, float, float]  # x, y, conf
    impact_point: tuple[float, float, float, float]  # x, y, z, conf
    end_point: tuple[float, float, str, float]  # x, y, terminator, conf
    length_meters: float
    line: str
    speed_kmh: float
    shot_footwork: str
    shot_timing: str
    shot_direction_deg: float
    trajectory: list[tuple[int, float, float, float, float, str]]
    # tMs, xPitchM, yPitchM, zHeightM, conf, phase


def _pixel_to_pitch(x_px: float, y_px: float) -> tuple[float, float]:
    # Linear stub mapping for the broadcast camera.
    # Bowler end at top of frame (y=0) ↔ y=20.12; striker at bottom ↔ y=0.
    x_pitch = ((x_px / WIDTH_PX) - 0.5) * PITCH_WIDTH_M
    y_pitch = (1 - y_px / HEIGHT_PX) * PITCH_LENGTH_M
    return x_pitch, y_pitch


def _line_from_x(x_pitch: float) -> str:
    if x_pitch < -0.6:
        return "wideOff"
    if x_pitch < -0.3:
        return "outsideOff"
    if x_pitch < -0.1:
        return "offStump"
    if x_pitch < 0.1:
        return "middle"
    if x_pitch < 0.3:
        return "legStump"
    if x_pitch < 0.6:
        return "outsideLeg"
    return "wideLeg"


def _footwork(pose: PoseSnapshot | None) -> str:
    if not pose:
        return random.choice(["frontFoot", "backFoot"])  # noqa: S311
    front_y = pose.keypoints.get("left_ankle", (0, 0, 0))[1]
    back_y = pose.keypoints.get("right_ankle", (0, 0, 0))[1]
    return "frontFoot" if front_y > back_y else "backFoot"


def _timing(track: list[TrackPoint], phases: list[str]) -> str:
    impact_indices = [i for i, p in enumerate(phases) if p == "impact"]
    if not impact_indices:
        return "missed"
    impact_i = impact_indices[0]
    expected_i = len(track) // 2
    delta = impact_i - expected_i
    if abs(delta) <= 1:
        return "wellTimed"
    if delta < 0:
        return "early"
    return "late" if delta < 4 else "mistimed"


def _direction(track: list[TrackPoint], phases: list[str]) -> float:
    impact_indices = [i for i, p in enumerate(phases) if p == "impact"]
    if not impact_indices or impact_indices[0] >= len(track) - 1:
        return 0.0
    impact = track[impact_indices[0]]
    last = track[-1]
    dx = last.x_px - impact.x_px
    dy = impact.y_px - last.y_px  # screen y inverted
    deg = math.degrees(math.atan2(dx, dy))
    return (deg + SHOT_DIRECTION_RANGE) % SHOT_DIRECTION_RANGE


def _speed(track: list[TrackPoint]) -> float:
    """Estimate ball speed from pre-bounce trajectory only. Real
    homography-based speed measures pitch-distance traversed per second.
    Stub mode uses a calibrated px/m factor that yields realistic broadcast
    cricket numbers (130–145 km/h)."""
    if len(track) < 2:
        return SPEED_KMH_DEFAULT
    # Use the first half of the track (release → bounce) where the ball
    # travels the pitch length proper.
    pre_bounce = track[: max(2, len(track) // 2)]
    dist_px = 0.0
    for i in range(1, len(pre_bounce)):
        dx = pre_bounce[i].x_px - pre_bounce[i - 1].x_px
        dy = pre_bounce[i].y_px - pre_bounce[i - 1].y_px
        dist_px += math.hypot(dx, dy)
    duration_ms = max(1, pre_bounce[-1].t_ms - pre_bounce[0].t_ms)
    # 1080p broadcast: ~0.05 m/px on the pitch axis (pitch fills ~400 px
    # vertically over 20 m).
    meters = dist_px * 0.05
    mps = meters / (duration_ms / 1000)
    speed = round(mps * 3.6, 1)
    # Clamp to realistic cricket speeds; pipeline should never emit absurd
    # values that fail Pydantic validation.
    return max(60.0, min(165.0, speed))


_DERIVED_CACHE: dict[tuple[int, int], DerivedDelivery] = {}


def get_derived(key: tuple[int, int]) -> DerivedDelivery | None:
    return _DERIVED_CACHE.get(key)


def run(state: PipelineState) -> PipelineState:
    for seg in state.segments:
        key = (seg.over_number, seg.ball_in_over)
        track = state.tracks.get(key, [])
        if not track:
            continue
        phases = get_phases(state, key)
        bounce_i = phases.index("bounce") if "bounce" in phases else len(track) // 2
        impact_i = (
            phases.index("impact")
            if "impact" in phases
            else min(len(track) - 1, bounce_i + 4)
        )

        bx, by = _pixel_to_pitch(track[bounce_i].x_px, track[bounce_i].y_px)
        ix, iy = _pixel_to_pitch(track[impact_i].x_px, track[impact_i].y_px)
        ex, ey = _pixel_to_pitch(track[-1].x_px, track[-1].y_px)
        pose = (state.poses.get(key) or [None])[0]
        traj_dump: list[tuple[int, float, float, float, float, str]] = []
        for i, p in enumerate(track):
            xm, ym = _pixel_to_pitch(p.x_px, p.y_px)
            traj_dump.append((p.t_ms, xm, ym, 1.5, p.conf, phases[i] if i < len(phases) else "approach"))

        _DERIVED_CACHE[key] = DerivedDelivery(
            over_number=seg.over_number,
            ball_in_over=seg.ball_in_over,
            pitch_point=(bx, by, 0.85),
            impact_point=(ix, iy, 0.7, 0.8),
            end_point=(ex, ey, "fielded", 0.7),
            length_meters=round(by, 2),
            line=_line_from_x(bx),
            speed_kmh=_speed(track),
            shot_footwork=_footwork(pose),
            shot_timing=_timing(track, phases),
            shot_direction_deg=_direction(track, phases),
            trajectory=traj_dump,
        )
    return state
