import type { Week } from '@strengthsync/domain/model'

const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const

const BORDER = '═'.repeat(10)

export function weekToMarkdown(week: Week): string {
  const days = week.schedule.map((day) => {
    const weekday = WEEKDAYS[(day.day_index - 1) % WEEKDAYS.length]
    const header = `${BORDER}\n${weekday} — Day ${day.day_index} · ${day.type.replace('_', ' ')}\n${BORDER}`
    const exercises = day.exercises.map((exercise) => {
      const weight =
        exercise.prescribed.weight_kg === null
          ? ''
          : ` — ${exercise.prescribed.weight_kg} kg`
      return `${exercise.name} — ${exercise.prescribed.series}x${exercise.prescribed.reps}${weight}`
    })
    const notes = day.notes === null ? [] : [day.notes]
    return [header, ...notes, ...exercises].join('\n')
  })

  return [`# Week ${week.week_index}`, ...days].join('\n\n')
}
