# UI Audit — State, Structure, and Conventions

Status: audit only. This document records the current state of `apps/ui`, what we want to keep, and what we want to fix. It deliberately avoids implementation steps; those will live in a separate refactor plan.

Reference rules: [.cursor/react.mdc](../../.cursor/react.mdc) (component structure, state management, accessibility, anti-patterns).

---

## 1. Current state inventory

### Layers

- **API layer** — `src/api/client.ts`, `src/api/errors.ts`. Typed fetch wrappers over the public API. Every response is re-parsed with the shared `@strengthsync/domain` zod schemas before it enters the app.
- **State folder** — `src/state/` (see finding F7). Currently holds eight modules of very different natures: a reducer, a Suspense promise cache, a React context split across two files, workflow polling, a contract mapper, a localStorage cooldown, and a markdown formatter.
- **Routes** — `src/routes/` with `clients-page`, `tracker-page`, `home-redirect`, `not-found`. `TrackerPage` and `HomeRedirect` use React 19 `use()` + `<Suspense>` + `ErrorBoundary`; `ClientsPage` still uses `useEffect` + `useState` fetching.
- **Feature components** — `src/components/week-tracker/` tree (the core of the app), plus `app-shell` and `error-boundary`.
- **UI library** — `src/shadcn/ui/` (Button, Badge, Card, Input, Spinner, Sonner toaster, etc.).

### Week-tracker component tree (as rendered)

```
TrackerPage
└── WeekTracker            (owns useReducer(weekReducer), saveDay callback)
    ├── WeekHeading
    │   ├── GeneratePlanButton
    │   └── CompleteWeekButton
    └── Program            (also: "Copy week" button)
        └── DayBlock       (per day; file also defines DayHeader + DayContent)
            └── ExerciseRow (per exercise)
                ├── SetControls
                └── FeedbackControls
```

### State flow today

- `weekReducer` (pure, well-tested) owns all week mutations: `TOGGLE_SET`, `SET_FEEDBACK`, `TOGGLE_SKIP`, `MARK_DAY_COMPLETE`, `HYDRATE`.
- `WeekTracker` instantiates the reducer and a `saveDay` callback, then **props-drill both** down through `Program → DayBlock → ExerciseRow → SetControls / FeedbackControls`.
- `weekResource.ts` is a module-level promise cache keyed by client id, consumed via `use()` in `TrackerPage`/`HomeRedirect`, invalidated manually after saves and workflows.
- `SelectedClientContext` holds the selected client id (context + provider split across two files).
- There is **no single place** to observe the app's core data (client, plan, week/days). It is scattered across the reducer instance inside `WeekTracker`, the resource cache, and the context.

---

## 2. What works — keep as-is

These patterns are explicitly liked and are **out of scope** for the refactor (see section 5 for optional future upgrades).

- **K1 — Zod-gated central API client.** `src/api/client.ts` is the single interaction layer with the server. Every response is validated against domain schemas, so everything downstream can be treated as safe, typed data. All app data derives from here.
- **K2 — Reducer-style state transitions.** The pure functions in `weekReducer.ts` (`toggleSet`, `setFeedback`, `toggleSkip`, `markDayComplete`, plus derived helpers `performedCount`, `remainingSets`, `isExerciseComplete`, `isDayComplete`) are the right model for week interactions: pure, immutable, unit-tested. The *logic* stays; only its *delivery mechanism* (reducer instance + prop drilling) changes.
- **K3 — Central app shell.** `AppShell` as the layout route: header, nav, `<Outlet>`, and the single `<Toaster>` mount point.
- **K4 — Route components own page data-fetching.** Routes handle fetch + error + loading. `TrackerPage` is the model example: `use(currentWeekResource(clientId))` inside `<Suspense>` + `ErrorBoundary` in `App.tsx`.

---

## 3. Findings — what to fix

### F1 — No central, observable app state

**Where:** `weekTracker.tsx`, `state/weekResource.ts`, `state/selectedClient.ts`.

The app's core entities (client, plan, week and its days) have no single home. The week lives inside a `useReducer` local to `WeekTracker`; client and plan only exist as the resolved value of the resource promise, re-derived per render; the selected client id lives in a context. There is no way to answer "what is the app's state right now?" from one place — neither in code nor in devtools.

**Direction:** one central store (zustand — decided) holding `{ client, plan, week }` plus the week actions. The reducer's pure functions become the store's transition logic (keeps K2).

### F2 — Prop drilling of `dispatch` and `saveDay`

**Where:** `weekTracker.tsx` → `program.tsx` → `dayBlock.tsx` → `exerciseRow.tsx` → `setControls.tsx` / `feedbackControls.tsx`.

`dispatch: Dispatch<WeekAction>` and `onSaveDay: (day: WeekDay) => Promise<void>` are threaded through four component layers. Every intermediate component declares props it does not use itself, and every new action means touching the whole chain. `saveDay` additionally couples `WeekTracker` to API details (`saveDayLog`, `invalidateCurrentWeek`, re-hydrate) that are not view concerns.

**Direction:** components read actions directly from the store via selectors/hooks. `saveDay` becomes a store action (API call + cache invalidation + hydration); components keep only presentation concerns (toasts, spinners).

### F3 — Derived props passed explicitly (`index`, `dayIndex`)

**Where:** `dayBlock.tsx` (lines ~139–146), `exerciseRow.tsx`, `setControls.tsx`, `feedbackControls.tsx`.

`ExerciseRow` receives `dayIndex`, `index`, `dispatch`, and `exercise`. Both `dayIndex` and the row position are derivable from the day itself; passing them separately widens the prop surface and invites drift (e.g. a row rendered with the wrong `dayIndex` would silently corrupt another day). Note: `index` is only used as a display label here, but the pattern rhymes with the "array index as identity" anti-pattern in react.mdc.

**Direction:** pass the full `day: WeekDay` object (plus the `exercise`) and derive everything else inside. Actions come from the store (F2), so `dispatch` disappears from these props entirely.

### F4 — Dead feature: "Copy week"

**Where:** `program.tsx` (Copy week button + `copyWeek` handler), `state/weekMarkdown.ts`, `state/weekMarkdown.test.ts`.

The copy-week-as-markdown feature is no longer wanted. It is the only consumer of `weekMarkdown.ts` and the only reason `Program` imports `sonner`, `lucide-react`'s `Copy`, and the shadcn `Button`.

**Direction:** delete the button, the handler, the module, and its test.

### F5 — Raw HTML instead of the component library / wrong semantics

**Where:**

- `dayBlock.tsx` lines 86–111: the day header toggle is a raw `<button type="button">` with a manual `aria-expanded` and a `useState(isOpen)`, sitting next to shadcn `Button` usage in the same file. Beyond the library inconsistency, this is really a **disclosure widget**: native `<details>`/`<summary>` semantics fit better than a button + conditional render, and would remove the local open/closed state entirely.
- `clientList.tsx` lines 23–29: raw `<button>` for the client entries where the shadcn `Button` (or a styled `Link`) should be used.

**Direction:** use native disclosure semantics for the day block; use the reusable library for anything that stays a button.

### F6 — Folder structure does not reflect the component tree

**Where:** `src/components/week-tracker/components/program/components/`.

Two violations of the react.mdc component-architecture rules:

1. **Siblings that are actually parent/child.** `exercise-row/` sits next to `day-block/`, but `ExerciseRow` is imported and rendered only by `DayBlock`. Per the rule ("a `components` folder immediately within the parent component's directory contains all sub-components"), `exercise-row` belongs *inside* `day-block/components/`.
2. **Multiple components per file.** `dayBlock.tsx` defines three components (`DayBlock`, `DayHeader`, `DayContent`), violating "Do NOT put more than 1 component per file. If an abstraction is created it goes into a nested `components/<name>/` folder." Note the F5 disclosure refactor may dissolve `DayHeader`/`DayContent` naturally; whatever survives as a component gets its own folder.

**Direction:** folder nesting mirrors the render tree; one component per file.

### F7 — `state/` is a junk drawer

**Where:** `src/state/` — eight modules with five different responsibilities:

- `weekReducer.ts` — pure state transitions + derived helpers (client-side logic/utils).
- `weekResource.ts` — Suspense promise cache over the API (server interaction).
- `workflowPolling.ts` — retry/poll orchestration over the API (server interaction).
- `dayLog.ts` — model → contract mapping for the save endpoint (server interaction).
- `selectedClient.ts` + `selectedClientProvider.tsx` — a React context **split across two files**, violating the react.mdc rule "Provider and Context with the exposing hook live all together in the same file".
- `completeWeekCooldown.ts` — localStorage utility.
- `weekMarkdown.ts` — string formatting (deleted with F4).

The folder name promises "state" but only the reducer and context are state; the rest is API plumbing, utils, and formatting. This also breaks the react.mdc file-structure guidance (`hooks/`, `utils/`, `types/` as top-level homes).

**Direction:** dissolve `state/` into purpose-specific homes: server-interaction modules join `src/api/`; pure logic and localStorage utilities go to `src/utils/`; the store gets `src/store/`; the context (merged into one file) gets `src/contexts/`. Tests move with their modules.

### F8 — Minor rule drift (recorded, low priority)

- `weekHeading.tsx` receives `clientId`, `clientName`, `totalWeeks`, `week` but renders only the two buttons — `clientName`/`totalWeeks` are currently unused props (dead prop surface, likely leftovers).
- Inconsistent quote/semicolon style in `weekHeading.tsx` (double quotes + semicolons) vs the rest of the codebase.
- `TrackerPage` fakes cache invalidation with a `setResourceVersion((v) => v + 1)` counter whose value is never read — a re-render hack that a store-driven refresh would make unnecessary.
- Deep absolute import paths (`@/components/week-tracker/components/program/components/exercise-row/...`) are a symptom of F6 and will shorten once nesting is fixed.

---

## 4. Goals for the refactor

1. **One observable source of truth** for `{ client, plan, week }` — inspectable in devtools, selectable from any component, hydrated from the Suspense resource layer.
2. **Zero prop drilling for actions** — components declare only the data they render; actions come from the store.
3. **Props mirror domain objects** — pass `day` / `exercise`, not pre-derived indices.
4. **Folder tree mirrors render tree** — per react.mdc component architecture; one component per file.
5. `**state/` dissolved** into `api/` (server interaction), `store/`, `utils/`, `contexts/` — every module has an obvious home.
6. **Semantics and library consistency** — native disclosure for collapsibles, shadcn components for buttons, no raw interactive elements.
7. **No behavior change** for the features kept: set logging, skip, feedback, save day, complete week (with cooldown), generate plan, workflows and toasts all work exactly as today.
8. **Tests preserved** — the pure-logic tests (`weekReducer`, `dayLog`, `workflowPolling`, `completeWeekCooldown`) move with their modules and keep passing.

## 5. Liked but improvable — deferred upgrades (not in this refactor)

Explicitly untouched now, recorded so they aren't forgotten:

- **ClientsPage data fetching.** Still `useEffect` + `useState` + manual error state. Upgrade path: same `use()` + `<Suspense>` + `ErrorBoundary` shape as `TrackerPage` (the `clientsResource()` cache already exists). The `/clients` route in `App.tsx` currently has no `ErrorBoundary`/`Suspense` wrapper at all.
- **CompleteWeekButton cooldown.** The timeout + localStorage dance could become a small `useCooldown` hook under a future `src/hooks/`.
- **Workflow orchestration in components.** `CompleteWeekButton` and `GeneratePlanButton` each hand-roll start → poll → interpret-status → toast. Once the store exists, these could become store-level async actions with shared status handling.
- **Route-level Suspense boilerplate.** The `ErrorBoundary` + `Suspense` + `Spinner` wrapper is repeated per route in `App.tsx`; a small layout/wrapper route could deduplicate it.
- `**weekResource` invalidation model.** Manual `invalidateCurrentWeek` calls sprinkled in buttons/actions work, but if this grows, a proper query library (TanStack Query) or store-owned invalidation would scale better.

