---
name: pipeline-debug
description: Diagnose wrong, missing, or low-confidence delivery records in the cricket-vision-analytics CV pipeline. Use when the user says "this delivery looks wrong", "no deliveries appeared", "speed is way off", "trajectory ends at the bat", "shot type is gibberish", or any "the analytics don't match the video" complaint. Walks through a deterministic checklist from logs → fixtures → stage replay → LLM inspection.
---

# Pipeline Debug Checklist

Cricket CV is messy. When something looks wrong, work top-to-bottom — each step rules out a layer. Don't skip ahead; the cheap checks usually find it.

## Symptoms → likely culprit

| Symptom | Most likely | Less likely |
|---------|-------------|-------------|
| No deliveries at all | `pipeline/segment.py` failed; OCR missed scoreboard | CV job didn't start; check Inngest |
| Some balls missing | Segment merge collapsed two deliveries into one | Tracker lost ball before any frames |
| Speed way off | Wrong fps in `videos.fps`, or homography off | Tracker latched onto a fielder |
| Length always "good length" | Homography H matrix degenerate | Pitch corners clicked wrong during calibration |
| Trajectory ends at the bat | Tracker dropped ball at impact (the *exact* problem we exist to solve) | Frame rate too low to follow post-impact ball |
| Shot type wrong | LLM confidence low, or wrong keyframes sent | Pose stage failed → wrong footwork → wrong prompt context |
| `endTerminator: "deadBall"` everywhere | Tracker is losing the ball; raise confidence threshold or retrain | Boundary line not detected in `derive.py` |

## Checklist

```
- [ ] 1. Find the matchId and deliveryId
- [ ] 2. Read deliveries.confidence and deliveries.debugJsonb
- [ ] 3. Replay the single delivery locally with the saved state
- [ ] 4. If geometric: inspect the trajectory and homography
- [ ] 5. If semantic: inspect the raw Gemini response
- [ ] 6. If a stage failed: check Modal logs for the job
- [ ] 7. Add a fixture so we don't regress
```

## Step 2 — Read what the DB already knows

```sql
select id, ball_type, shot_type, confidence, debug_jsonb -> 'gemini_raw' as gemini
from deliveries
where id = '<deliveryId>';
```

Every field has a confidence in `confidence` jsonb. If a value is wrong AND confidence is high, the model is confidently wrong (worse — needs retraining). If wrong AND low, the model knew; the orchestrator should've flagged it.

`debugJsonb` contains:
- `gemini_raw` — exact response from Gemini (before our enum filter).
- `track_summary` — `{frames: N, lost_at_ms: ..., reacquired_at_ms: ...}`.
- `homography_residual` — RMS reprojection error in pixels (>5 = bad calibration).
- `stage_durations_ms` — quick perf sniff.

## Step 3 — Replay locally

```bash
cd services/cv
uv run python -m pipeline.replay \
  --match-id <matchId> \
  --delivery-id <deliveryId> \
  --from-stage track   # rerun from this stage onward, using saved state for earlier stages
```

The replay loads the persisted `PipelineState` snapshot from Modal volume / dev cache and runs the requested stages. Output goes to `services/cv/.replay/<deliveryId>/` with annotated frames.

## Step 4 — Geometric debugging

Open `services/cv/.replay/<deliveryId>/trajectory.png` (an overlay of the trajectory on the broadcast frame). Look for:

- **Ball jumps** — tracker swap (latched onto another object). Lower the ByteTrack `track_thresh` or add visual features.
- **Trajectory ends mid-air at the bat** — the failure mode this whole project exists to fix. Bump `tracker.lookahead_frames` and `tracker.reacquisition_window_ms`.
- **Homography lines don't lie on real pitch lines** — recalibrate. Run `uv run python -m pipeline.homography.calibrate --match-id <matchId>` and re-click the four stump bases.

Then check `services/cv/.replay/<deliveryId>/derived.json` — does `pitchPoint.yPitchM` plausibly match the pitched length you see on screen? Cricket pitch reference: 0–4 m short, 4–6 m good length, 6–8 m full, 8–10 m yorker (from the batter's stumps).

## Step 5 — Semantic debugging

```bash
uv run python -m pipeline.llm --replay <deliveryId>
```

Prints the four keyframes sent to Gemini, the prompt, the raw response, and the post-filter result. Common issues:

- **Wrong keyframes** — `release` frame is mid-run-up, `impact` is two frames late. Tweak the keyframe selection in `pipeline/llm.py` `select_keyframes()`.
- **Gemini returns prose instead of JSON** — structured output disabled or the response_schema not passed; check `llm.py`.
- **Enum value rejected** — Gemini returned `"sweep_shot"` instead of `"sweep"`. Tighten the prompt: "values MUST be one of: ...".

## Step 6 — Modal logs

```bash
modal app logs cricket-cv --since 1h | rg <jobId>
```

Look for:
- Stage exceptions (always re-raised; should never be swallowed).
- OOM kills (raise the GPU memory in the Modal stub).
- Cold-start times (>30s consistently → keep one warm container).

## Step 7 — Lock it in

When you find the cause:
1. Save the failing state to `services/cv/tests/fixtures/regressions/<short-name>.json`.
2. Add a test in `services/cv/tests/test_regressions.py` that loads it and asserts the new (correct) output.
3. Then fix the code.

This is the only way the same bug doesn't come back next month.

## When to give up and ask the user

If the broadcast feed has graphics covering the pitch, replays cut to slow-mo at the wrong moment, or the camera angle changes mid-delivery — the input is genuinely ambiguous. Surface `confidence < 0.4` to the UI and prompt the user to correct it (writes to `delivery_corrections`, feeds the fine-tuning loop).
