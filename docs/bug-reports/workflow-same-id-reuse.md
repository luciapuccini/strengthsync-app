# **Bug report: Complete week reports success without starting a new Temporal run**

**Status:** Resolved — independent runs (timestamp-suffixed ids); attach/reuse/retry removed  
**Severity:** High — coach sees success; week does not progress  
**Component:** Complete-week path (`UI → API → workflow-api → Temporal`)  
**Date observed:** 2026-08-02 (symptom); root Temporal run 2026-07-26  
**Environment:** Production Worker `strengthsync-api`; Temporal Cloud namespace `quickstart-luciapuccini.wu1pr`; local Compose workflow stack via Cloudflare Tunnel

---

## **Summary**

Clicking **Complete week** returns HTTP success and a UI success toast, but **no new Temporal workflow runs** and **no new week is created in D1** when Temporal Cloud already has a **Completed** execution for that week’s deterministic workflow id.

The UI is not completing the week again. It **reattaches** to the old Completed run (26 Jul 2026) and replays that result.

---

## **Symptoms**

1. Coach clicks **Complete week** for an in-flight week.
2. UI shows success (“Week complete. Your next week is ready.”) and refreshes the tracker.
3. Current week in the UI stays the same (still `2f6a57b8-…`).
4. Temporal Cloud shows **no new run** for that click; only the old Completed execution.
5. Early debugging looked like “all HTTP 200/202 but Temporal did not trigger” — that matches this attach-to-old-run behaviour.

---

## **Affected identities**


| **Field**                              | **Value**                                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Client                                 | `00000000-0000-4000-8000-000000000010`                                                         |
| Week (button / input)                  | `2f6a57b8-6619-4547-ab9a-410361886792`                                                         |
| Workflow id                            | `weekly-progression:00000000-0000-4000-8000-000000000010:2f6a57b8-6619-4547-ab9a-410361886792` |
| Claimed next week id (from old result) | `9fe2ed87-0f46-43eb-991e-fbbc27c52cb6`                                                         |


---

## **Evidence**

### **1. Temporal Cloud (source of truth)**

- **Status:** Completed
- **Start:** 26 Jul 2026, 20:09:19 GMT+2
- **End:** 26 Jul 2026, 20:09:53 GMT+2 (~35s)
- **Run ID:** `019f9f9d-fced-7c36-b932-7148948b9b7a`
- **Type:** `weeklyProgressionWorkflow`
- **Input:** `{ client_id: …000010, week_id: 2f6a57b8-… }`

No new execution was created on the 2 Aug click. Close time is **~7 days before** the click under investigation.

### **2. Browser console (2 Aug / 3 Aug click)**

[complete-week] ui start { clientId: …000010, weekId: 2f6a57b8-… }

POST …/workflows/weekly-progression 502   // transient; retries

[complete-week] ui started { workflowId: weekly-progression:…:2f6a57b8-… }

GET …/workflows/weekly-progression%3A… 502  (×3, retries)

[complete-week] ui done {

  workflowId: "weekly-progression:…:2f6a57b8-…",

  status: "succeeded",

  result: {

    next_week_id: "9fe2ed87-0f46-43eb-991e-fbbc27c52cb6",

    plan_complete: false

  }

}

Interpretation:

- 502s = Worker ↔ workflow-api tunnel flaky at times (separate ops issue).
- Final status is `succeeded` with a full result object from the **Jul 26** run.
- Poll interval is 1.5s; success arrives without a long “still running” wait → Temporal already terminal.

### **3. Cloudflare Workers Logs (2 Aug ~21:51 UTC)**


| **Time (UTC)** | **Event**                                                       | **Outcome**                                                                   |
| -------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 21:51:08.137   | `POST …/weekly-progression`                                     | **202**                                                                       |
| 21:51:08.146   | `[api] workflow proxy →`                                        | body `{ client_id, week_id: 2f6a57b8-… }`                                     |
| 21:51:09.503   | `[api] workflow proxy ←`                                        | **202** `{ workflow_id: weekly-progression:…:2f6a57b8-…, status: "running" }` |
| 21:51:09.537   | `GET …/workflows/…`                                             | **200** (one poll)                                                            |
| 21:51:10.316+  | Tracker refresh (`/clients`, `/plans/active`, `/weeks/current`) | **200**                                                                       |


**Missing from the same window:** any `POST /internal/…/weeks/…/complete` or `POST /internal/…/weeks/next`.

So the Worker accepted start/status and the UI refreshed, but **activities did not hit this Worker** on that click.

### **4. Local Compose (at investigation time)**

`workflow-api`, `temporal-worker`, and `cloudflared` were **Up** / healthy. Stack presence does not start a new run when Temporal rejects duplicate start against a Completed id.

---

## **Expected vs actual**


| **Step**          | **Expected**                                                              | **Actual**                                                                          |
| ----------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Start             | New Temporal execution for this week (or clear error if unsafe to re-run) | Attach to Completed Jul 26 execution; API still returns **202** `status: "running"` |
| Activities        | `completeWeek` → analyze → `createNextWeek` → D1 writes                   | No `/internal` calls on this click                                                  |
| Status            | `running` then new `succeeded` with a **new** run                         | Immediate/old `succeeded` with Jul 26 result                                        |
| UI                | Success only after real progression                                       | Success toast + refresh; current week unchanged                                     |
| `already_running` | Surfaced to caller                                                        | Discarded; response always looks like a fresh start                                 |


---

## **Root cause**

### **Primary (confirmed)**

1. Workflow id is deterministic:  
`weekly-progression:{client_id}:{week_id}`  
(`apps/workflows/src/temporal/launcher.ts` → `weeklyProgressionWorkflowId`).
2. Start uses  
`WORKFLOW_ID_REUSE_POLICY_ALLOW_DUPLICATE_FAILED_ONLY`.  
After a **Completed** run, Temporal raises `WorkflowExecutionAlreadyStartedError` for that id (reuse only if prior run **failed**).
3. Launcher catches that error and returns `{ workflowId, alreadyRunning: true }` **without starting a new run**.
4. workflow-api still responds **202** with `{ workflow_id, status: "running" }` and **drops** `alreadyRunning`.
5. UI polls status → Temporal returns the **old Completed** result → success path.

### **Why D1 may still show the old in-flight week**

Jul 26 result claims `next_week_id = 9fe2ed87-…`. If D1 was later reset/reseeded, or that write never landed in the D1 the app reads now, the product is stuck:

- Temporal: Completed for that week id
- D1: week `2f6a57b8-…` still (or again) `in_flight`
- Every Complete click: false success, no repair

**Open follow-up (not fully proven):** whether `9fe2ed87-…` exists in current production D1. That explains the “no new week” symptom together with the reattach bug; it does not change the reattach root cause.

### **Secondary (observed, separate)**

Intermittent **502** on start/status while Compose was up → Worker cannot always reach workflow-api through the tunnel. Retries mask this until a later call succeeds (often with the stale Completed status).

---

## **Flow (what happens today)**

Complete week click

  → POST /api/.../weekly-progression

  → tunnel → workflow-api

  → Temporal start(same workflow id)

  → AlreadyStarted (Completed Jul 26)

  → 202 { workflow_id, status: "running" }   // misleading

  → GET status → succeeded + Jul 26 result

  → UI toast success + refresh

  → no new Temporal run, no /internal writes

---

## **Impact**

- Coach cannot advance the week for this client/week while the Completed Temporal id remains.
- Success UX is a **false positive**.
- Support/debug looked like “Temporal never triggered” even when start/status HTTP looked fine.
- Same pattern can hit any week whose Temporal history is Completed but D1 state was reset or never updated.

---

## **Resolution**

Product rule changed: each start is an independent Temporal run with a timestamp-suffixed id (`weekly-progression:{client}:{week}:{ts}`). Attach / reuse-policy / same-id retry were removed. MVP UI gates duplicate clicks; D1 idempotency covers activity retries. See `docs/architecture/api_contracts.md` workflow transition rules.

---

## **How to reproduce (pre-fix)**

1. Ensure Temporal Cloud has a **Completed** `weeklyProgressionWorkflow` for  
`weekly-progression:{client}:{week}` (deterministic id, no timestamp).
2. Ensure the app still shows that `week` as the current in-flight week (e.g. after D1 reseed, or if next week row is missing).
3. Keep workflow-api + worker + tunnel up.
4. Click **Complete week**.
5. Observe: UI success with old `next_week_id`; Temporal shows **no new** run; Close Time still the old completion; no new `/internal/.../weeks/next` in Workers Logs.

---

## **Related code (pre-fix)**

- `apps/workflows/src/temporal/launcher.ts` — id, reuse policy, AlreadyStarted → `alreadyRunning`
- `apps/workflows/src/api/app.ts` — 202 without surfacing `alreadyRunning`
- `apps/ui/.../completeWeekButton.tsx` + `workflowPolling.ts` — treat 202 + terminal status as success; retry 5xx
- `apps/api/src/routes/workflows.ts` — proxy; 502 when upstream unreachable

---

Instrumentation logs added during this investigation were cleaned up as part of the fix.