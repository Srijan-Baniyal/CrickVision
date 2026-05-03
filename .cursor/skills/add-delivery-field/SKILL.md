---
name: add-delivery-field
description: End-to-end recipe for adding a new field to the Delivery aggregate in the cricket-vision-analytics project. Use when the user asks to add, change, or remove a per-delivery attribute (a new ball metric, shot metric, geometric value, or LLM label). Walks through Drizzle migration, Zod schema, Pydantic model, CV pipeline producer, Inngest persistence, and UI surface so the change lands in all six places at once.
---

# Add a Delivery Field

A delivery field exists in **six** places. Skipping any one breaks something later. Always touch all six in this order — that order matters because the next step depends on the previous one's types.

## Decide first: geometric or semantic?

- **Geometric** (derived from trajectory + pose) → produced in `services/cv/pipeline/derive.py` (or a new stage). Never asked of the LLM.
- **Semantic** (LLM label) → produced in `services/cv/pipeline/llm.py` and added to the Gemini structured-output schema. Must be a string enum from the cricket domain glossary or a new enum added there.

If the field is geometric, also ask: do you have the inputs in `trajectory` + `pose`? If not, `add-cv-step` first to produce them.

## Checklist

Copy this and tick as you go:

```
- [ ] 1. Drizzle column + enum (lib/db/schema/deliveries.ts)
- [ ] 2. Zod schema (lib/cv/schema.ts)
- [ ] 3. Pydantic model (services/cv/models.py)
- [ ] 4. CV producer (services/cv/pipeline/derive.py OR llm.py)
- [ ] 5. Inngest persistence (lib/inngest/functions/process-match.ts)
- [ ] 6. UI surface (components/delivery/DeliveryCard.tsx + relevant chart)
- [ ] 7. AGENTS.md glossary updated if a new enum was introduced
- [ ] 8. cricket-domain skill enum table updated to match
```

## Step 1 — Drizzle (`lib/db/schema/deliveries.ts`)

- Pick the smallest column type that fits. Enums use Postgres enum types via Drizzle's `pgEnum`. Numeric scalars use `numeric(precision, scale)`, not `real` (we want exact for stats).
- Generate a migration: `bun run db:generate` (added in Phase 1). Review the SQL — never hand-edit generated migrations; instead change the schema and regenerate.
- For nullable fields, default to `null` until backfilled. Backfill via a script in `lib/db/scripts/`, not in the migration.

## Step 2 — Zod (`lib/cv/schema.ts`)

- Match the Drizzle column 1:1. Use `z.enum([...])` for enums with the **exact** strings from the cricket domain skill.
- Add the field to `deliverySchema`. The CV webhook route parses every payload through this; an unknown field is silently dropped — make sure the field is *added*, not just expected.

## Step 3 — Pydantic (`services/cv/models.py`)

- Use `Literal[...]` for enums (mirrors `z.enum`).
- Run `cd services/cv && uv run pytest tests/test_contract.py` — the contract test loads `lib/cv/schema.ts` exports via a tsx subprocess and diffs against the Pydantic JSON schema. Failures here mean Step 2 and Step 3 disagree.

## Step 4 — Producer

### Geometric (`services/cv/pipeline/derive.py`)
- Add a pure function `derive_<field>(state) -> value`.
- Take only `state.trajectory` / `state.pose` / `state.homography` as input. No I/O. Deterministic.
- Add a unit test in `services/cv/tests/test_derive.py` with at least one fixture from `tests/fixtures/`.

### Semantic (`services/cv/pipeline/llm.py`)
- Add the field to `GeminiDeliverySchema` (the structured-output schema passed to `response_schema`).
- Update the prompt template in `services/cv/prompts/delivery.md` — describe the field in **one** sentence with the allowed values. Don't explain cricket; the model knows.
- Reject any value not in the enum at the parse step; write `"unknown"` and drop confidence to <0.3.

## Step 5 — Inngest persistence

- The `persist-delivery` step in `lib/inngest/functions/process-match.ts` does `db.insert(deliveries).values(parsed).onConflictDoUpdate(...)`. Add the new field to the `set` clause of `onConflictDoUpdate` so re-runs update it. Idempotency is the hill.

## Step 6 — UI

- `components/delivery/DeliveryCard.tsx` — surface the field. Format scalars with `lib/format.ts` (km/h, meters, degrees).
- If it's a chartable dimension, also touch the relevant chart (`PitchMap`, `WagonWheel`, a heat map, or `ShotSelectionPanel`).
- Add a Storybook entry under `components/delivery/DeliveryCard.stories.tsx` if the field has multiple display states (null, low confidence, normal).

## Step 7–8 — Glossary

If you introduced a new enum or changed enum values, update **both** `AGENTS.md` (the "Cricket domain glossary" section) **and** `.cursor/skills/cricket-domain/SKILL.md` (the enum table). They must stay in lockstep.

## Anti-patterns

- ❌ Adding a `Float` to Drizzle and a `number` to Zod and assuming Postgres will round it the same way as JS. Use `numeric(p, s)` and `z.number().multipleOf(...)`.
- ❌ Asking the LLM for `lengthMeters`. Geometric is geometric. Derive it.
- ❌ Patching only the UI to "show" a field that doesn't exist in the DB. Always start at Drizzle.
- ❌ Forgetting `onConflictDoUpdate` — the field will appear on first insert and never update on retry.
