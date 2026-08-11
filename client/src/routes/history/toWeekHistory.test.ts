import { describe, expect, it } from 'vitest'

import type { Week } from '@/api/types'

import { makeWeek } from '@/test/weekFixture'

import { HistoryWeekSchema, toWeekHistory } from './toWeekHistory'

function withSets(week: Week, dayIndex: number, exerciseKey: string, sets: Week['schedule'][0]['exercises'][0]['sets']): Week {
  return {
    ...week,
    schedule: week.schedule.map((day) => {
      if (day.day_index !== dayIndex) return day
      return {
        ...day,
        exercises: day.exercises.map((exercise) =>
          exercise.exercise_key === exerciseKey ? { ...exercise, sets } : exercise,
        ),
      }
    }),
  }
}

describe('toWeekHistory', () => {
  it('returns empty for no weeks', () => {
    expect(toWeekHistory([], 6)).toEqual([])
  })

  it('groups by week and day with first-set scalars', () => {
    const week = withSets(makeWeek(), 1, 'bench_press', [
      { performed_reps: 8, performed_weight_kg: 30 },
      { performed_reps: 7, performed_weight_kg: 30 },
    ])

    expect(toWeekHistory([week], 6)).toEqual([
      {
        week_index: 4,
        total_weeks: 6,
        start_date: '2026-07-20',
        end_date: '2026-07-26',
        days: [
          {
            day_index: 1,
            day_type: 'upper_body',
            date: '2026-07-20',
            exercises: [
              {
                exercise_key: 'bench_press',
                name: 'Bench Press',
                series: 2,
                reps: 8,
                weight: 30,
                diff: '',
              },
            ],
          },
          {
            day_index: 2,
            day_type: 'rest',
            date: '2026-07-21',
            exercises: [],
          },
        ],
      },
    ])
  })

  it('sorts weeks by week_index ascending', () => {
    const w5 = { ...makeWeek(), week_index: 5, schedule: [makeWeek().schedule[1]!] }
    const w3 = { ...makeWeek(), week_index: 3, schedule: [makeWeek().schedule[1]!] }
    expect(toWeekHistory([w5, w3], 6).map((w) => w.week_index)).toEqual([3, 5])
  })

  it('rejects an invalid history week via Zod', () => {
    expect(() => HistoryWeekSchema.parse({ week_index: 'nope' })).toThrow()
  })
})

describe('toWeekHistory diffs', () => {
  it('diffs weight and reps against the previous week index', () => {
    const prev = withSets({ ...makeWeek(), week_index: 3 }, 1, 'bench_press', [
      { performed_reps: 10, performed_weight_kg: 29 },
    ])
    const curr = withSets({ ...makeWeek(), week_index: 4 }, 1, 'bench_press', [
      { performed_reps: 8, performed_weight_kg: 30 },
    ])

    const history = toWeekHistory([curr, prev], 6)
    expect(history.find((w) => w.week_index === 4)!.days[0]!.exercises[0]!.diff).toBe(
      '1kg ↑ · 2 rep/ser ↓',
    )
  })

  it('shows weight-only or reps-only diffs', () => {
    const prev = withSets({ ...makeWeek(), week_index: 3 }, 1, 'bench_press', [
      { performed_reps: 8, performed_weight_kg: 30 },
    ])
    const weightUp = withSets({ ...makeWeek(), week_index: 4 }, 1, 'bench_press', [
      { performed_reps: 8, performed_weight_kg: 31 },
    ])
    expect(toWeekHistory([prev, weightUp], 6)[1]!.days[0]!.exercises[0]!.diff).toBe('1kg ↑')

    const repsDown = withSets({ ...makeWeek(), week_index: 4 }, 1, 'bench_press', [
      { performed_reps: 6, performed_weight_kg: 30 },
    ])
    expect(toWeekHistory([prev, repsDown], 6)[1]!.days[0]!.exercises[0]!.diff).toBe('2 rep/ser ↓')
  })

  it('leaves diff empty when there is no previous week or no change', () => {
    const alone = withSets({ ...makeWeek(), week_index: 1 }, 1, 'bench_press', [
      { performed_reps: 8, performed_weight_kg: 30 },
    ])
    expect(toWeekHistory([alone], 6)[0]!.days[0]!.exercises[0]!.diff).toBe('')

    const same = withSets({ ...makeWeek(), week_index: 2 }, 1, 'bench_press', [
      { performed_reps: 8, performed_weight_kg: 30 },
    ])
    expect(toWeekHistory([alone, same], 6)[1]!.days[0]!.exercises[0]!.diff).toBe('')
  })
})
