"""Merge geometric (derive.py) + semantic (llm.py) outputs into one Delivery
per segment and POST it back to the Next app via webhook.send."""

from __future__ import annotations

from typing import Any

from models import (
    Delivery,
    DeliveryExtractedEvent,
    EndPoint,
    ImpactPoint,
    JobCompletedEvent,
    PitchPoint,
    Trajectory,
    TrajectoryFrame,
)

from .derive import get_derived
from .llm import get_labels
from .state import PipelineState
from .webhook import send_sync


def _build_delivery(state: PipelineState, key: tuple[int, int]) -> Delivery | None:
    derived = get_derived(key)
    labels = get_labels(key)
    if derived is None or labels is None:
        return None

    trajectory = Trajectory(
        frames=[
            TrajectoryFrame(
                tMs=t,
                xPitchM=x,
                yPitchM=y,
                zHeightM=z,
                conf=c,
                phase=phase,  # type: ignore[arg-type]
            )
            for (t, x, y, z, c, phase) in derived.trajectory
        ]
    )

    return Delivery(
        matchId=state.match_id,
        overNumber=derived.over_number,
        ballInOver=derived.ball_in_over,
        ballType=labels.ball_type,  # type: ignore[arg-type]
        line=derived.line,  # type: ignore[arg-type]
        lengthMeters=derived.length_meters,
        speedKmh=derived.speed_kmh,
        swing=labels.swing,  # type: ignore[arg-type]
        spin=labels.spin,  # type: ignore[arg-type]
        shotType=labels.shot_type,  # type: ignore[arg-type]
        shotFootwork=derived.shot_footwork,  # type: ignore[arg-type]
        shotTiming=derived.shot_timing,  # type: ignore[arg-type]
        shotDirectionDeg=derived.shot_direction_deg,
        contactZone=labels.contact_zone,  # type: ignore[arg-type]
        runs=labels.runs,
        isBoundary=labels.is_boundary,
        isSix=labels.is_six,
        isWicket=labels.is_wicket,
        dismissalType=labels.dismissal_type,  # type: ignore[arg-type]
        trajectory=trajectory,
        pitchPoint=PitchPoint(
            xPitchM=derived.pitch_point[0],
            yPitchM=derived.pitch_point[1],
            conf=derived.pitch_point[2],
        ),
        impactPoint=ImpactPoint(
            xPitchM=derived.impact_point[0],
            yPitchM=derived.impact_point[1],
            zHeightM=derived.impact_point[2],
            conf=derived.impact_point[3],
        ),
        endPoint=EndPoint(
            xPitchM=derived.end_point[0],
            yPitchM=derived.end_point[1],
            terminator=derived.end_point[2],  # type: ignore[arg-type]
            conf=derived.end_point[3],
        ),
        confidence={
            "pitchPoint": derived.pitch_point[2],
            "impactPoint": derived.impact_point[3],
            "endPoint": derived.end_point[3],
        },
        commentary=labels.commentary,
    )


def run(state: PipelineState) -> PipelineState:
    total = 0
    for seg in state.segments:
        delivery = _build_delivery(state, (seg.over_number, seg.ball_in_over))
        if delivery is None:
            continue
        envelope: dict[str, Any] = DeliveryExtractedEvent(
            jobId=state.job_id,
            delivery=delivery,
        ).model_dump(mode="json")
        send_sync(state.callback_url, state.hmac_secret, envelope)
        total += 1

    completed: dict[str, Any] = JobCompletedEvent(
        jobId=state.job_id,
        matchId=state.match_id,
        totalDeliveries=total,
    ).model_dump(mode="json")
    send_sync(state.callback_url, state.hmac_secret, completed)
    return state
