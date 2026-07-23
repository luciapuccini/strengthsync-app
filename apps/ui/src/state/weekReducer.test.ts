import { describe, expect, it } from 'vitest'

import { makeWeek } from '@/test/weekFixture'

import {
  isDayComplete,
  isExerciseComplete,
  performedCount,
  remainingSets,
  weekReducer,
} from './weekReducer'

describe('weekReducer', () => {
  it('only adds the next set and only removes the last set', () => {
    const week = makeWeek()
    const ignored = weekReducer(week, {
      type: 'TOGGLE_SET',
      dayIndex: 1,
      exerciseKey: 'bench_press',
      setIndex: 1,
    })
    expect(ignored).toEqual(week)

    const oneSet = weekReducer(week, {
      type: 'TOGGLE_SET',
      dayIndex: 1,
      exerciseKey: 'bench_press',
      setIndex: 0,
    })
    const exercise = oneSet.schedule[0]!.exercises[0]!
    expect(exercise.sets).toEqual([{ performed_reps: 8, performed_weight_kg: 30 }])
    expect(performedCount(exercise)).toBe(1)
    expect(remainingSets(exercise)).toBe(1)

    const undone = weekReducer(oneSet, {
      type: 'TOGGLE_SET',
      dayIndex: 1,
      exerciseKey: 'bench_press',
      setIndex: 0,
    })
    expect(undone.schedule[0]!.exercises[0]!.sets).toEqual([])
  })

  it('marks a training day complete when every prescribed set is logged', () => {
    const first = weekReducer(makeWeek(), {
      type: 'TOGGLE_SET',
      dayIndex: 1,
      exerciseKey: 'bench_press',
      setIndex: 0,
    })
    const complete = weekReducer(first, {
      type: 'TOGGLE_SET',
      dayIndex: 1,
      exerciseKey: 'bench_press',
      setIndex: 1,
    })
    expect(isExerciseComplete(complete.schedule[0]!.exercises[0]!)).toBe(true)
    expect(isDayComplete(complete.schedule[0]!)).toBe(true)
    expect(complete.schedule[0]!.completed).toBe(true)
  })

  it('clears sets when skipping and supports feedback', () => {
    const withSet = weekReducer(makeWeek(), {
      type: 'TOGGLE_SET',
      dayIndex: 1,
      exerciseKey: 'bench_press',
      setIndex: 0,
    })
    const skipped = weekReducer(withSet, {
      type: 'TOGGLE_SKIP',
      dayIndex: 1,
      exerciseKey: 'bench_press',
    })
    expect(skipped.schedule[0]!.exercises[0]).toMatchObject({
      skipped: true,
      sets: [],
    })
    expect(skipped.schedule[0]!.completed).toBe(true)

    const withFeedback = weekReducer(skipped, {
      type: 'SET_FEEDBACK',
      dayIndex: 1,
      exerciseKey: 'bench_press',
      feedback: 'heavy',
    })
    expect(withFeedback.schedule[0]!.exercises[0]!.feedback).toBe('heavy')
  })

  it('explicitly completes an exercise-free day', () => {
    const complete = weekReducer(makeWeek(), { type: 'MARK_DAY_COMPLETE', dayIndex: 2 })
    expect(complete.schedule[1]!.completed).toBe(true)
  })
})
