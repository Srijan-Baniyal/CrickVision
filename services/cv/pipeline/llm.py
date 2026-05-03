"""Gemini 2.5 Vision call. Asks ONLY for semantic labels we cannot derive
geometrically: ballType, swing, spin, shotType, contactZone, dismissalType,
and a one-line commentary.

We send 4 keyframes per delivery (release, bounce, impact, follow-through)
and constrain the response with structured-output to the exact enum strings
in models.py — Gemini cannot return an unknown value.
"""

from __future__ import annotations

import json
import os
import random
from dataclasses import dataclass

from .state import PipelineState

BALL_TYPES = [
    "yorker",
    "fullToss",
    "full",
    "goodLength",
    "shortOfLength",
    "short",
    "bouncer",
    "beamer",
]
SHOT_TYPES = [
    "defensive",
    "leave",
    "drive",
    "cut",
    "pull",
    "hook",
    "sweep",
    "reverseSweep",
    "scoop",
    "flick",
    "glance",
    "loft",
]
CONTACT_ZONES = ["middle", "edge", "mishit", "miss"]
SWINGS = ["out", "in", "reverse", "none"]
SPINS = ["offBreak", "legBreak", "googly", "armBall", "none"]
DISMISSALS = [
    "bowled",
    "caught",
    "lbw",
    "runOut",
    "stumped",
    "hitWicket",
    "caughtBehind",
    "caughtAndBowled",
    "none",
]


@dataclass(slots=True)
class SemanticLabels:
    ball_type: str
    swing: str
    spin: str
    shot_type: str
    contact_zone: str
    dismissal_type: str
    is_wicket: bool
    runs: int
    is_boundary: bool
    is_six: bool
    commentary: str
    raw: dict | None = None


def _structured_response_schema() -> dict:
    """JSON Schema (subset) used as Gemini's responseSchema."""
    return {
        "type": "object",
        "properties": {
            "ballType": {"type": "string", "enum": BALL_TYPES},
            "swing": {"type": "string", "enum": SWINGS},
            "spin": {"type": "string", "enum": SPINS},
            "shotType": {"type": "string", "enum": SHOT_TYPES},
            "contactZone": {"type": "string", "enum": CONTACT_ZONES},
            "dismissalType": {"type": "string", "enum": DISMISSALS},
            "isWicket": {"type": "boolean"},
            "runs": {"type": "integer", "minimum": 0, "maximum": 6},
            "isBoundary": {"type": "boolean"},
            "isSix": {"type": "boolean"},
            "commentary": {"type": "string", "maxLength": 200},
        },
        "required": [
            "ballType",
            "shotType",
            "contactZone",
            "dismissalType",
            "isWicket",
            "runs",
            "isBoundary",
            "isSix",
            "commentary",
        ],
    }


def _gemini_call(_prompt: str, _frame_uris: list[str]) -> dict:  # pragma: no cover
    """Real Gemini 2.5 call. Imported lazily so stub mode doesn't pull
    google-genai into the runtime."""
    from google import genai
    from google.genai import types as gem

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY required for the real LLM stage")
    client = genai.Client(api_key=api_key)
    contents: list = []
    contents.append(_prompt)
    for uri in _frame_uris:
        contents.append(gem.Part.from_uri(file_uri=uri, mime_type="image/jpeg"))
    response = client.models.generate_content(
        model="gemini-2.5-pro",
        contents=contents,
        config=gem.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=_structured_response_schema(),
        ),
    )
    return json.loads(response.text)


def _stub_labels(seed: int) -> SemanticLabels:
    rng = random.Random(seed)  # noqa: S311
    runs = rng.choice([0, 1, 1, 2, 4, 6])
    is_wicket = rng.random() < 0.05
    return SemanticLabels(
        ball_type=rng.choice(BALL_TYPES),
        swing=rng.choice(SWINGS),
        spin=rng.choice(SPINS),
        shot_type=rng.choice(SHOT_TYPES),
        contact_zone=rng.choice(CONTACT_ZONES),
        dismissal_type=rng.choice(DISMISSALS[:-1]) if is_wicket else "none",
        is_wicket=is_wicket,
        runs=0 if is_wicket else runs,
        is_boundary=runs in (4, 6) and not is_wicket,
        is_six=runs == 6 and not is_wicket,
        commentary="Pitched on a length, defended back to the bowler.",
    )


_LABELS_CACHE: dict[tuple[int, int], SemanticLabels] = {}


def get_labels(key: tuple[int, int]) -> SemanticLabels | None:
    return _LABELS_CACHE.get(key)


def _build_prompt(seg_label: str) -> str:
    return (
        f"You are analyzing one cricket delivery (over {seg_label}).\n"
        "Return a JSON object with: ballType, swing, spin, shotType, "
        "contactZone, dismissalType, isWicket, runs, isBoundary, isSix, "
        "commentary.\n"
        "Use exactly the enum strings shown in the response schema. The "
        "commentary must be a single sentence under 25 words."
    )


def run(state: PipelineState) -> PipelineState:
    use_real = os.environ.get("CV_USE_REAL_PIPELINE") == "1"
    for seg in state.segments:
        key = (seg.over_number, seg.ball_in_over)
        if use_real:  # pragma: no cover
            raw = _gemini_call(
                _build_prompt(f"{seg.over_number}.{seg.ball_in_over}"),
                _select_keyframes(state, key),
            )
            _LABELS_CACHE[key] = SemanticLabels(
                ball_type=raw["ballType"],
                swing=raw.get("swing", "none"),
                spin=raw.get("spin", "none"),
                shot_type=raw["shotType"],
                contact_zone=raw["contactZone"],
                dismissal_type=raw["dismissalType"],
                is_wicket=raw["isWicket"],
                runs=raw["runs"],
                is_boundary=raw["isBoundary"],
                is_six=raw["isSix"],
                commentary=raw["commentary"],
                raw=raw,
            )
        else:
            _LABELS_CACHE[key] = _stub_labels(seg.over_number * 100 + seg.ball_in_over)
    return state


def _select_keyframes(state: PipelineState, key: tuple[int, int]) -> list[str]:  # pragma: no cover
    track = state.tracks.get(key, [])
    if not track or not state.frames_dir:
        return []
    indices = [0, len(track) // 3, (2 * len(track)) // 3, len(track) - 1]
    return [
        f"file://{state.frames_dir / f'f_{i:06d}.jpg'}"
        for i in indices
        if 0 <= i < state.frame_count
    ]
