"""Nightly Modal scheduled function: pull yesterday's delivery_corrections
from the Next.js app and write a fine-tuning batch (JSONL) to a Modal
volume. Operators can rsync that batch into a Gemini fine-tuning job or any
other supervised pipeline.

Each line is a {prompt, completion} pair derived from one correction:
- prompt  = the delivery's clip URL + commentary + pitch/impact points
- completion = {fieldName: correctedValue}
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone

import httpx

CORRECTIONS_URL_ENV = "NEXT_APP_URL"
CORRECTIONS_TOKEN_ENV = "CV_SERVICE_TOKEN"
EXPORT_DIR_ENV = "CV_FT_EXPORT_DIR"
DEFAULT_EXPORT_DIR = "/data/finetune"
SINCE_HOURS = 24
TIMEOUT_SECONDS = 60


def _build_example(correction: dict) -> dict:
    delivery = correction.get("delivery", {})
    prompt = {
        "task": "Cricket delivery semantic labeling",
        "context": {
            "clipBlobUrl": delivery.get("clipBlobUrl"),
            "originalBallType": delivery.get("ballType"),
            "originalShotType": delivery.get("shotType"),
            "pitchPoint": delivery.get("pitchPoint"),
            "impactPoint": delivery.get("impactPoint"),
            "commentary": delivery.get("commentary"),
        },
    }
    completion = {correction["fieldName"]: correction["correctedValue"]}
    if correction.get("note"):
        completion["humanNote"] = correction["note"]
    return {
        "prompt": prompt,
        "completion": completion,
        "metadata": {
            "correctionId": correction["id"],
            "deliveryId": correction["deliveryId"],
            "createdAt": correction["createdAt"],
        },
    }


def export_corrections() -> dict:
    """Idempotent: writes a date-stamped file. Re-running on the same day
    overwrites — corrections are append-only so the latest export is
    cumulative for the requested window."""
    base_url = os.environ.get(CORRECTIONS_URL_ENV)
    token = os.environ.get(CORRECTIONS_TOKEN_ENV)
    if not (base_url and token):
        raise RuntimeError(
            f"set {CORRECTIONS_URL_ENV} and {CORRECTIONS_TOKEN_ENV}"
        )

    response = httpx.get(
        f"{base_url}/api/cv/corrections",
        params={"sinceHours": SINCE_HOURS, "limit": 5000},
        headers={"authorization": f"Bearer {token}"},
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    data = response.json()

    out_dir = os.environ.get(EXPORT_DIR_ENV, DEFAULT_EXPORT_DIR)
    os.makedirs(out_dir, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    path = os.path.join(out_dir, f"corrections-{stamp}.jsonl")

    count = 0
    with open(path, "w", encoding="utf-8") as fp:
        for correction in data["corrections"]:
            fp.write(json.dumps(_build_example(correction)) + "\n")
            count += 1

    return {
        "writtenTo": path,
        "examples": count,
        "windowHours": SINCE_HOURS,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


if __name__ == "__main__":  # pragma: no cover
    print(json.dumps(export_corrections(), indent=2))
