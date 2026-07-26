---
name: Extraordinary Week Context
overview: Let the user supply free-text context when closing an extraordinary week (illness, travel, unable to hit the plan), and pass that note into weekly progression analysis and next-week generation.
todos:
  - id: week-context-ui
    content: Add optional free-text input when completing a week (extraordinary circumstances)
    status: pending
  - id: week-context-contract
    content: Extend weekly progression start/complete contracts to carry the user note
    status: pending
  - id: week-context-prompts
    content: Pass the note into analyzeWeek and generateNextWeek alongside the frozen schedule
    status: pending
  - id: week-context-tests
    content: Cover API/workflow wiring and prompt inclusion for provided vs empty notes
    status: pending
isProject: false
---

# Extraordinary week context

- Out of MVP scope. For now, unfinished days are enough: `completeWeek` freezes the week with `completed: false` days, and analysis already treats those as missed targets.
- After MVP, let the user add optional free-text context when closing a week (illness, travel, life disruption, or other reasons they could not accomplish the plan).
- Thread that note through weekly progression into [`analyzeWeek`](../../services/agent/src/index.ts) / [`generateNextWeek`](../../services/agent/src/index.ts) prompt builders in [`services/domain/src/coach/weekly-progression.ts`](../../services/domain/src/coach/weekly-progression.ts), alongside the frozen schedule.
- Do not invent reasons when the note is empty; schedule adherence flags remain the default signal.
