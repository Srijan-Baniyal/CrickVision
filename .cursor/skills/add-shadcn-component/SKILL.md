---
name: add-shadcn-component
description: Install a shadcn/ui primitive into the cricket-vision-analytics project. Use when the user asks to add a button, dialog, sheet, drawer, command menu, table, form, toast, tooltip, or any other shadcn/ui component. Ensures the install lands in the right place, uses Bun, and respects the Ultracite "no barrel files" rule.
---

# Add a shadcn/ui Primitive

The project uses Bun, Tailwind v4, and the App Router. Components land in `components/ui/` exactly as shadcn writes them. Wrap them in domain components (`components/match/`, `components/delivery/`, `components/charts/`) — never edit primitives by hand.

## The single command

```bash
bunx shadcn@latest add <name> [--overwrite]
```

Examples:

```bash
bunx shadcn@latest add button
bunx shadcn@latest add dialog drawer
bunx shadcn@latest add table form input label select
```

That's it. The CLI:
- Writes to `components/ui/<name>.tsx`.
- Adds dependencies to `package.json` and runs `bun install`.
- Updates `lib/utils.ts` (`cn`) on first run.

## Before you run it

If this is the very first shadcn component in the repo, the CLI will run an init flow. Pick:
- **Style**: `new-york` (denser, what we want for analytics-heavy UIs).
- **Base color**: `zinc` (matches the existing `app/globals.css` palette).
- **CSS variables**: `yes` (Tailwind v4 + dark mode).
- **Path aliases**: accept defaults — `@/components`, `@/lib`, `@/hooks` (we already have `@/*` in `tsconfig.json`).

## Importing

Per Ultracite's "no barrel files" rule (see AGENTS.md), import directly from the primitive:

```typescript
// ✅ Good
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";

// ❌ Bad — never create or use a re-export barrel
import { Button } from "@/components/ui";
```

## Wrapping

Don't reach for shadcn primitives directly inside pages or domain logic. Wrap them in a domain component:

```tsx
// components/delivery/DeliveryActions.tsx
import { Button } from "@/components/ui/button";

export function DeliveryActions({ deliveryId }: { deliveryId: string }) {
  // domain props in, design system primitives inside
  return <Button variant="outline">Mark as edge</Button>;
}
```

This keeps `app/(app)/...` pages readable and lets the design system change without rewriting every page.

## Theming

- Dark mode is automatic via `prefers-color-scheme` already configured in `app/globals.css`. Do not add a manual theme toggle in v1.
- All colors come from the CSS variables shadcn installed; never hardcode hex values in domain components.

## Anti-patterns

- ❌ `npx shadcn-ui@latest add ...` — wrong package name (it's `shadcn`, not `shadcn-ui`) and wrong runner (use `bunx`).
- ❌ Editing `components/ui/<primitive>.tsx` directly. If you need different behavior, wrap.
- ❌ Creating a `components/ui/index.ts` barrel. Forbidden by Ultracite.
- ❌ Installing the same component twice with different names. If shadcn already wrote `button.tsx`, don't `add button --overwrite` unless you're upgrading on purpose.
