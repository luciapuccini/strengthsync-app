---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
---

# Developer preferences: start simple, scale with evidence

Start at the simplest implementation level that meets the current requirements. Add a more complex pattern only when a real constraint makes the simple option incorrect, unsafe, or hard to maintain. The best code is the code never written.

## Before coding

1. Read the task and trace the current flow from input to output.
2. Find the existing source of truth, helpers, events, components, and tests.
3. List the behavior that must remain true.(Tests or TDD help here)
4. Choose the smallest change that provides that behavior.
5. Add one focused check for non-trivial logic.

Do not design for possible future requirements. A future requirement is not evidence.

## Default implementation level

Prefer these options first:

- Keep one source of truth. Do not create a second state model without a synchronization need.
- Use direct functions before stores, providers, classes, adapters, or service layers.
- Use local component state for local UI behavior.
- Use the browser and language APIs before custom infrastructure.
- Reuse an existing project event or helper when it already solves the update path.
- Validate data at the storage, network, or user-input boundary.
- Return the smallest result that the caller needs.
- Keep temporary loading or hydration state local to the component.
- Keep tests on public behavior. Do not test internal implementation details.
- Change the fewest files that can contain the complete behavior.

_Example:_
A browser basket with at most five objects needs a validated local-storage read, a write, a limit check, and a small update event. It does not need cached snapshots, a custom subscriber registry, a provider, or a state library.

## Do not add complexity by default

Do not add these patterns only for consistency, elegance, or possible reuse:

- Cached snapshots for small and cheap reads.
- A custom observable store when an existing browser event is sufficient.
- A global provider for state used by one small feature area.
- A reducer or state machine for a few valid local states.
- A generic abstraction with only one real caller.
- A new dependency for behavior supported by the platform or current stack.
- Optimistic updates, retries, queues, or conflict handling without an actual failure case.
- Performance work without a measurement that shows a problem.

## When to scale up

Add a stronger pattern only when one or more of these conditions are present:

- **More consumers:** Several independent surfaces repeat the same subscription and selection logic. Add one shared hook or store.
- **Cross-tab updates:** State must update in other browser tabs. Add the `storage` event or `BroadcastChannel`.
- **Concurrent writes:** Two writers can overwrite each other. Add version checks, transactions, or move persistence to a server.
- **Server ownership:** The server must authorize, share, audit, or recover the state. Use a server data source and a clear synchronization contract.
- **Complex state:** Invalid state combinations or many linked transitions cause defects. Use a reducer or state machine.
- **Large or expensive reads:** Profiling shows that parsing or calculation affects the user experience. Add caching or memoization at the measured hot path.
- **Repeated implementation:** The same complete pattern exists in at least two real places and changes together. Extract it.
- **Reliability requirements:** Offline work, retries, idempotency, or recovery is part of the accepted product behavior. Add the required control flow.
- **Library value:** A current dependency cannot meet a confirmed requirement, and a new library removes more risk and code than it adds.

## Escalation check

Before adding a store, provider, cache, state machine, abstraction, or dependency, state:

1. The observed problem.
2. Why the simple implementation cannot solve it correctly.
3. The smallest stronger pattern that solves it.
4. The test or measurement that proves the need.

If these four points are not clear, keep the simple implementation.

## Review standard

A simple change is complete when it is correct, safe at trust boundaries, accessible, and covered by the smallest useful test. Fewer lines are good only when behavior stays readable, but I prefer verbosity for clarity.

Prefer code that a project contributor can understand from the task, the caller, and one implementation file. Complexity must pay for itself now.

## Communication

ASD-STE100 Simplified Technical English
