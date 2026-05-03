<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `bun x ultracite fix` before committing to ensure compliance.

---

# Cricket Vision Analytics — Project Rules

This is a cricket video/image analytics platform: ingest a clip or image, return per-delivery records (ball type, line/length, shot type, trajectory, runs, dismissal) plus aggregated views.

Two services, one repo:

- **Next.js app** (`app/`, `lib/`, `components/`) — UI, auth, DB, Inngest orchestration.
- **Python CV service** (`services/cv/`) — FastAPI on Modal, GPU pipeline. Never imported from TS; only called over HTTPS.

## Project structure (authoritative)

| Path | Owns | Forbidden |
|------|------|-----------|
| `app/(marketing)/` | Public landing pages | Auth-gated content, DB queries that need a user |
| `app/(app)/` | Authenticated app pages (RSC) | Client-side data fetching; use Server Actions or RSC |
| `app/api/` | Webhooks, Inngest serve, upload handshake, SSE | Business logic (delegate to `lib/`) |
| `lib/db/schema/` | Drizzle table definitions, one file per aggregate | Cross-aggregate joins (do those in `lib/db/queries/`) |
| `lib/db/queries/` | Reusable SQL via Drizzle | Mutations without a Server Action wrapper |
| `lib/inngest/` | Inngest client + functions | Direct DB writes outside `step.run` |
| `lib/cv/` | Typed HTTPS client + Zod schemas for the Python service | Calls from client components |
| `lib/ingest/` | Ingest adapters (`fileUpload.ts`, `url.ts`, `image.ts`, …) | Anything that depends on a specific ingest source — adapters normalize to the same `match/video.uploaded` event |
| `lib/storage.ts` | Vercel Blob abstraction | Direct `@vercel/blob` imports anywhere else |
| `lib/auth.ts` | Clerk wrapper | Direct `@clerk/*` imports outside this file and `middleware.ts` |
| `services/cv/` | Python pipeline | Importing from TS; reaching back into the Next app |
| `components/ui/` | shadcn primitives only | Domain components |
| `components/match/`, `components/delivery/`, `components/charts/` | Domain components | shadcn primitives (those live in `components/ui/`) |
| `env.ts` | The only place `process.env` is read | Spreading process.env elsewhere |

## Cricket domain glossary

These enum strings are the single source of truth. The Drizzle schema, Zod schemas, Pydantic models, the Gemini structured-output schema, and the UI MUST use these literal strings — no synonyms, no casing variants.

- `ballType`: `yorker` | `fullToss` | `full` | `goodLength` | `shortOfLength` | `short` | `bouncer` | `beamer`
- `line`: `wideOff` | `outsideOff` | `offStump` | `middle` | `legStump` | `outsideLeg` | `wideLeg`
- `swing`: `out` | `in` | `reverse` | `none`
- `spin`: `offBreak` | `legBreak` | `googly` | `armBall` | `none`
- `shotType`: `defensive` | `leave` | `drive` | `cut` | `pull` | `hook` | `sweep` | `reverseSweep` | `scoop` | `flick` | `glance` | `loft`
- `shotFootwork`: `frontFoot` | `backFoot`
- `shotTiming`: `early` | `wellTimed` | `late` | `mistimed` | `missed`
- `contactZone`: `middle` | `edge` | `mishit` | `miss`
- `dismissalType`: `bowled` | `caught` | `lbw` | `runOut` | `stumped` | `hitWicket` | `caughtBehind` | `caughtAndBowled` | `none`
- `trajectoryPhase`: `approach` | `bounce` | `afterBounce` | `impact` | `afterImpact`
- `endTerminator`: `boundary` | `fielded` | `wicket` | `deadBall`

### Coordinate conventions

- **Pitch coordinates** — origin at the *striker's* stumps base, +y points toward the bowler (along the pitch), +x points toward the off side from a right-handed batter's perspective. Units: meters. Stumps-to-stumps distance: 20.12 m. Pitch width: 3.05 m.
- **Wagon wheel angles** — `shotDirectionDeg` is measured clockwise from straight down the ground (toward the bowler from the batter's perspective is 0°). 90° = point/cover, 180° = behind the batter, 270° = fine leg/square leg. Always batter-perspective, never camera-perspective.
- **Image coordinates** — only used inside `services/cv/` before homography. Once `pipeline/homography.py` runs, downstream stages MUST work in pitch coordinates.

## Service boundaries

- **Browser → Next** — Server Actions or RSC only. Never expose the CV service URL or DB to the client.
- **Next → Inngest** — Send events with `inngest.send({ name, data })`. Don't call CV from a Server Action; enqueue an event and let Inngest call it.
- **Inngest → CV** — HTTPS POST to the Modal endpoint. Pass a callback URL + HMAC secret so CV can stream `cv/delivery.extracted` events back per delivery.
- **CV → Next** — POST to `app/api/cv/webhook/route.ts` with HMAC signature header. The route verifies, then forwards into Inngest as `cv/delivery.extracted` so the orchestrator handles persistence (keeps the webhook route stupid).
- **Anything → DB** — Through Drizzle in `lib/db/`. No raw SQL outside `lib/db/`.

## Idempotency & validation

- Every Inngest step uses `step.run("stable-id-not-derived-from-Date.now", ...)`. Stable IDs make replays correct.
- Every CV response is parsed through a Zod schema in `lib/cv/schema.ts` before it touches the DB. Reject unknown enum values; never silently cast.
- Every Server Action validates input with Zod before calling into `lib/db/`.
- DB writes for the same logical event must be idempotent — use `onConflictDoUpdate` keyed on `(matchId, overNumber, ballInOver)` for deliveries.
- The CV webhook route MUST verify the HMAC and dedupe on `deliveryId` (CV may retry on its end).

## Secrets policy

- `env.ts` is the only file allowed to read `process.env`. Use `@t3-oss/env-nextjs` with separate `server` and `client` blocks.
- Never log full env values. If you log for debugging, redact to first 4 chars + length.
- Client components must not receive secrets via props or `NEXT_PUBLIC_` smuggling for anything sensitive.
- Webhook secrets live server-side only; the CV service gets them via Modal secrets, never via the request body.

## Pipeline correctness rules

- Geometric facts (`pitchPoint`, `impactPoint`, `endPoint`, `lengthMeters`, `line`, `speedKmh`, `shotDirectionDeg`, `shotTiming`, `shotFootwork`) are **derived in Python** from trajectory + pose. The LLM is never asked for them.
- Semantic labels (`ballType`, `swing`, `spin`, `shotType`, `contactZone`, `dismissalType`, `commentary`) are **produced by Gemini** with structured output constrained to the exact enum strings above. Reject any value not in the enum and write `unknown` with `confidence < 0.3`.
- The ball trajectory MUST continue past bat–ball contact. If `pipeline/track.py` loses the ball at impact, it MUST re-acquire (within 0.5 s) before that delivery is considered tracked. Otherwise `endPoint.terminator = "deadBall"` and `confidence.endPoint < 0.5`.

## Working in this repo

- Use Bun for everything: `bun install`, `bun run dev`, `bun run check`, `bun run fix`.
- Read `node_modules/next/dist/docs/01-app/` before touching App Router APIs (the version of Next.js in this repo has breaking changes from what's in your training data — see the rule at the top of this file).
- Keep `components/ui/` 1:1 with shadcn output — don't hand-edit primitives. Wrap them in domain components instead.
- New ingest sources, new pipeline stages, new delivery fields, and new shadcn components each have a project skill under `.cursor/skills/`. Read the relevant skill before adding one.
