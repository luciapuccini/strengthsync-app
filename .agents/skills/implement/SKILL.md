---
name: implement
description: "Implement a piece of work based on a spec or issue."
disable-model-invocation: true
---

Implement the work described by the user in the spec or issue.

## How to tackle the issue
- check /developer-prefereces and /ponytail to plan your approach to this task
- Use tdd where possible, at pre-agreed seams. TDD means to use the minimal set of tests that guard the gross work of this issue. Use it to validate first your understanding of the expected output and then create the code that has the simplest solution to make the tests pass (RED -> GREEN) . Playwrite or other headless testing env are your friends for this, but do not abuse them, E2E tests are expensive.

## Definition of done
Your *goal* for this issue is to *commit* your work to the current branch. 
The pre-commit hooks will act as a feedback loop on your work, when this fails resolve one command at a time and run the individual guard.



