- Reducer

  “Reducer” here means reduce a change onto week state, Redux-style naming, not Redux’s dispatcher pattern. If you rewrote it as one reducer it would look like:
  ```js
  function weekReducer(week: Week, action:
    | { type: 'toggleSet'; dayIndex: number; exerciseKey: string; setIndex: number }
    | ...
  ): Week
  ```

  and the slice would `set({ week: weekReducer(state.week, action) })`. Same idea, different packaging: they inlined each action as its own function instead of one switch.
  
- idea, new client already has a plan. lets allow importing or describing the current training they do. a .csv or .md for current plan import. could skip most of the onboarding wizard in that case -&gt; we would assume some fields, Ex intermidiate user .. TBD

