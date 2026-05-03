"""Smoke tests for the stub pipeline. Real model tests live in
tests/test_real_pipeline.py and are gated on CV_USE_REAL_PIPELINE=1."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest

from models import Delivery
from pipeline import VIDEO_PIPELINE, run_pipeline
from pipeline.image_only import run_image
from pipeline.state import PipelineState


def _state(tmp_path: Path) -> PipelineState:
    video = tmp_path / "src.mp4"
    video.touch()
    return PipelineState(
        job_id="test-job",
        match_id="11111111-1111-1111-1111-111111111111",
        video_path=video,
        callback_url="http://localhost/api/cv/webhook",
        hmac_secret="test-secret",
    )


def test_video_pipeline_emits_six_deliveries(tmp_path: Path) -> None:
    sent: list[dict] = []

    def fake_send_sync(_url, _secret, payload):  # type: ignore[no-untyped-def]
        sent.append(payload)

    with patch("pipeline.aggregate.send_sync", side_effect=fake_send_sync):
        run_pipeline(_state(tmp_path), VIDEO_PIPELINE)

    delivery_events = [s for s in sent if s["type"] == "cv/delivery.extracted"]
    completed = [s for s in sent if s["type"] == "cv/job.completed"]
    assert len(delivery_events) == 6, "stub segment.py emits 6 deliveries"
    assert len(completed) == 1
    # And every payload validates against the Delivery model.
    for ev in delivery_events:
        Delivery.model_validate(ev["delivery"])


def test_image_pipeline_returns_image_only_delivery(tmp_path: Path) -> None:
    delivery = run_image(_state(tmp_path))
    assert delivery.isImageOnly
    assert delivery.trajectory is None
    assert 0 <= delivery.runs <= 6


@pytest.mark.parametrize(
    "field",
    [
        "ballType",
        "shotType",
        "contactZone",
        "shotFootwork",
        "shotTiming",
    ],
)
def test_stub_deliveries_have_required_enums(tmp_path: Path, field: str) -> None:
    sent: list[dict] = []
    with patch(
        "pipeline.aggregate.send_sync",
        side_effect=lambda _u, _s, p: sent.append(p),
    ):
        run_pipeline(_state(tmp_path), VIDEO_PIPELINE)
    deliveries = [s["delivery"] for s in sent if s["type"] == "cv/delivery.extracted"]
    assert all(d[field] is not None for d in deliveries)
