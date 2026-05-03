---
name: add-cv-step
description: Pattern for adding a new pure-function stage to the Python CV pipeline at services/cv/pipeline/ in the cricket-vision-analytics project. Use when the user asks to add ball detection, tracking, pose, homography, derivation, or any new vision/ML stage that runs on a video or image. Keeps stages testable, replayable, and orchestratable from Inngest.
---

# Add a CV Pipeline Stage

Every stage in `services/cv/pipeline/` is a **pure function** of the form `(state: PipelineState) -> PipelineState`. Pure means: no globals, no network I/O, no DB. The only outputs are mutations of the state dataclass. This makes stages unit-testable and lets the orchestrator replay any subset.

## Checklist

```
- [ ] 1. Define the stage's contract: what fields does it read/write on PipelineState?
- [ ] 2. Create services/cv/pipeline/<stage>.py with a single run(state) -> state function
- [ ] 3. Register in services/cv/pipeline/__init__.py PIPELINE list
- [ ] 4. Add a fixture-based unit test in services/cv/tests/test_<stage>.py
- [ ] 5. Add an Inngest step wrapper if the stage needs to be retried independently
- [ ] 6. Update AGENTS.md "pipeline correctness rules" if the stage adds an invariant
```

## Step 1 — Contract

Open `services/cv/pipeline/state.py` and add the new fields to `PipelineState` (a Pydantic `BaseModel`). Be explicit:

```python
class PipelineState(BaseModel):
    # ... existing fields ...
    ball_velocity_kmh: float | None = None  # set by velocity stage
```

Mark the *consumer* fields as required and the *producer* fields as `| None = None` so stages can be skipped during testing.

## Step 2 — Stage file

Template:

```python
# services/cv/pipeline/<stage>.py
from .state import PipelineState

STAGE_NAME = "my_stage"

def run(state: PipelineState) -> PipelineState:
    # 1. Validate required inputs are present
    if state.trajectory is None:
        raise ValueError(f"{STAGE_NAME}: requires trajectory")

    # 2. Pure computation
    result = compute_thing(state.trajectory)

    # 3. Return a copy (Pydantic copy with update) — never mutate in place
    return state.model_copy(update={"my_output": result})
```

**Rules:**
- `model_copy(update=...)` not in-place mutation. Replays must produce identical state for identical input.
- No `time.sleep`, no `requests`, no `open()` for anything other than fixtures during tests.
- Heavy CPU is fine; GPU calls go through `services/cv/inference/` helpers (which Modal warm-loads).

## Step 3 — Register

```python
# services/cv/pipeline/__init__.py
from . import frames, segment, detect, track, pose, homography, phases, derive, llm, aggregate
from . import my_stage

PIPELINE = [
    frames, segment, detect, track, pose, homography, phases, my_stage, derive, llm, aggregate,
]
```

Order matters: stages run top-to-bottom; each one only reads what earlier ones wrote.

## Step 4 — Test

```python
# services/cv/tests/test_my_stage.py
from services.cv.pipeline import my_stage
from services.cv.pipeline.state import PipelineState
from .fixtures import load_state

def test_happy_path():
    state = load_state("delivery_001_after_track")  # tests/fixtures/*.json
    out = my_stage.run(state)
    assert out.my_output is not None
    assert 40.0 <= out.my_output <= 170.0  # plausibility

def test_missing_input_raises():
    state = PipelineState()  # blank
    with pytest.raises(ValueError, match="requires trajectory"):
        my_stage.run(state)
```

Run with `cd services/cv && uv run pytest`.

## Step 5 — Inngest wrapper (optional)

Wrap individually only if the stage is **expensive** (>5s) **or** **flaky** (calls Gemini, network). Cheap deterministic stages run inside the same Inngest step as their neighbors.

```typescript
// lib/inngest/functions/process-match.ts (excerpt)
const myResult = await step.run("my-stage", async () => {
  const res = await cvClient.runStage(jobId, "my_stage");
  return MyStageOutputSchema.parse(res);
});
```

The Python side exposes `POST /v1/jobs/{id}/stages/{name}` for selective execution; that's what `cvClient.runStage` calls.

## When NOT to add a stage

- "I want to compute X from Y where Y is already in the state" → that's a one-liner in `derive.py`, not a new stage.
- "I want to call Gemini for label X" → add a field to `llm.py`'s schema, not a new stage.
- "I want to pre-process every frame" → modify `frames.py` if it's universal; otherwise add a stage.

## Anti-patterns

- ❌ Calling Gemini from a stage other than `llm.py`. Centralization makes the cost obvious and the prompt diffable.
- ❌ Mutating `state` in place. Replays will produce different results depending on whether you ran `[a, b, c]` or `[a, b, c, b, c]`.
- ❌ Catching exceptions inside a stage to "be robust". Let the orchestrator retry. Stages are dumb; the orchestrator is smart.
