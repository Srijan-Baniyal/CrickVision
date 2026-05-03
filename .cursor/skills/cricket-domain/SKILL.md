---
name: cricket-domain
description: Authoritative reference for the cricket-vision-analytics project's enum values, coordinate systems, and domain invariants. Loads automatically. Use whenever adding fields, writing prompts, building UI, or interpreting CV output to keep Drizzle, Zod, Pydantic, the Gemini structured-output schema, and rendering all in lockstep.
---

# Cricket Domain Reference

Single source of truth for enum strings and coordinate conventions. **Use these literal strings everywhere** — Drizzle, Zod, Pydantic, the Gemini schema, the UI, prompts. No synonyms, no casing variants. AGENTS.md is canonical; this skill expands the *why* and the *gotchas*.

## Enum values (verbatim)

| Field | Values |
|-------|--------|
| `ballType` | `yorker`, `fullToss`, `full`, `goodLength`, `shortOfLength`, `short`, `bouncer`, `beamer` |
| `line` | `wideOff`, `outsideOff`, `offStump`, `middle`, `legStump`, `outsideLeg`, `wideLeg` |
| `swing` | `out`, `in`, `reverse`, `none` |
| `spin` | `offBreak`, `legBreak`, `googly`, `armBall`, `none` |
| `shotType` | `defensive`, `leave`, `drive`, `cut`, `pull`, `hook`, `sweep`, `reverseSweep`, `scoop`, `flick`, `glance`, `loft` |
| `shotFootwork` | `frontFoot`, `backFoot` |
| `shotTiming` | `early`, `wellTimed`, `late`, `mistimed`, `missed` |
| `contactZone` | `middle`, `edge`, `mishit`, `miss` |
| `dismissalType` | `bowled`, `caught`, `lbw`, `runOut`, `stumped`, `hitWicket`, `caughtBehind`, `caughtAndBowled`, `none` |
| `trajectoryPhase` | `approach`, `bounce`, `afterBounce`, `impact`, `afterImpact` |
| `endTerminator` | `boundary`, `fielded`, `wicket`, `deadBall` |

## Geometric vs semantic split

This split is non-negotiable and keeps the system testable:

- **Geometric** (derived in Python from trajectory + pose; never asked of the LLM): `pitchPoint`, `impactPoint`, `endPoint`, `lengthMeters`, `line`, `speedKmh`, `shotDirectionDeg`, `shotTiming`, `shotFootwork`, `trajectory.frames[].phase`.
- **Semantic** (Gemini structured output, constrained to the enum strings above): `ballType`, `swing`, `spin`, `shotType`, `contactZone`, `dismissalType`, `commentary`.

If you find yourself prompting the LLM for a number, you're doing it wrong — derive it.

## Coordinate conventions

### Pitch coordinates
- Origin: striker's stumps base.
- +y: toward the bowler (along the pitch).
- +x: toward the off side (right side from a right-handed batter's perspective).
- Units: meters.
- Stumps-to-stumps: 20.12 m. Pitch width: 3.05 m. Crease line distance from stumps: 1.22 m.

### Wagon wheel angles
- `shotDirectionDeg` is **clockwise from straight down the ground** (0° = toward the bowler from the batter's perspective).
- 90° = point/cover region. 180° = behind the batter (third man / fine leg side). 270° = square leg.
- Always **batter perspective**, never camera perspective. For a left-handed batter, mirror the rendering at the UI layer; the underlying angle stays right-hand-batter-canonical.

### Image coordinates
- Only used inside `services/cv/` *before* `pipeline/homography.py`. Once homography runs, downstream stages MUST work in pitch coordinates.

## Common derivations (Python pseudocode)

### `shotTiming`
```python
delta_ms = swing_apex_ms - impact_ms
if no_impact_frame:        return "missed"
if contact_zone == "edge": return "mistimed"
if delta_ms >  40:         return "early"
if delta_ms < -40:         return "late"
return "wellTimed"
```

### `pitchPoint` / `impactPoint` / `endPoint`
```python
pitch_point  = first frame where trajectory phase == "bounce"
impact_point = first frame where trajectory phase == "impact"
end_point    = last  frame where trajectory phase == "afterImpact"
```

### `endTerminator`
```python
if end_point overlaps boundary line:    "boundary"
if end_point inside fielder bbox:       "fielded"
if any "afterImpact" frame hits stumps: "wicket"
otherwise:                              "deadBall"
```

## Validation rules to enforce at every boundary

- `shotDirectionDeg` ∈ [0, 360).
- `lengthMeters` ∈ [0, 22] (clip to 22 if homography over-shoots).
- `speedKmh` ∈ [40, 170].
- `runs` ∈ [0, 6] for non-extras; extras tracked separately in `events.ts`.
- `isSix` implies `isBoundary` and `runs == 6`.
- `dismissalType != "none"` implies `isWicket == true` and vice versa.
- `trajectory.frames[]` MUST contain at least one frame with `phase == "approach"`. Bounce/impact/afterImpact may be missing; persist what you have and flag confidence.

## When in doubt
- Check `lib/cv/schema.ts` (Zod, the runtime gate) and `services/cv/models.py` (Pydantic). They MUST agree on the enums above. If they don't, fix them — don't add a third spelling.
