import type { Plan, Week } from '@/api/types';
import { DAY_TYPE_LABELS } from '@/lib/day-types';
import { formatIsoDate } from '@/utils/formatIsoDate';
import type { UnitPreference } from '@/utils/units';
import { toDisplayWeight, unitLabel } from '@/utils/units';

import { scalars } from './toWeekHistory';

type Cell = string | number | null;

const STRENGTH_DAY_TYPES = new Set<Plan['week_template'][number]['type']>([
  'upper_body',
  'leg_day',
  'full_body',
]);

const BASE_COLUMN_COUNT = 5;

function toCsvCell(cell: Cell): string {
  if (cell === null) return '';
  if (typeof cell === 'number') return String(cell);
  const text = /^[=+\-@]/.test(cell) ? `'${cell}` : cell;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function displayWeight(pounds: number | null, unit: UnitPreference): number | null {
  return pounds === null ? null : toDisplayWeight(pounds, unit);
}

function extraExercises(weeks: Week[], day: Plan['week_template'][number]): Map<string, string> {
  const templateKeys = new Set(day.exercises.map((exercise) => exercise.exercise_key));
  const extras = new Map<string, string>();
  for (const week of weeks) {
    const weekDay = week.schedule.find((candidate) => candidate.day_index === day.day_index);
    for (const exercise of weekDay?.exercises ?? []) {
      if (!templateKeys.has(exercise.exercise_key) && !extras.has(exercise.exercise_key)) {
        extras.set(exercise.exercise_key, exercise.name);
      }
    }
  }
  return extras;
}

export function toHistoryCsv(weeks: Week[], plan: Plan, unit: UnitPreference): string {
  const sorted = [...weeks].sort((a, b) => a.week_index - b.week_index);
  const weight = `weight (${unitLabel(unit)})`;
  const columnCount = BASE_COLUMN_COUNT + sorted.length * 3;

  const lookups = sorted.map((week) => {
    const map = new Map<string, Week['schedule'][number]['exercises'][number]>();
    for (const day of week.schedule) {
      for (const exercise of day.exercises) {
        map.set(`${day.day_index}:${exercise.exercise_key}`, exercise);
      }
    }
    return map;
  });

  function padded(cells: Cell[]): Cell[] {
    return [...cells, ...Array<Cell>(columnCount - cells.length).fill(null)];
  }

  function weekCells(dayIndex: number, exerciseKey: string): Cell[] {
    return lookups.flatMap((lookup) => {
      const exercise = lookup.get(`${dayIndex}:${exerciseKey}`);
      if (exercise === undefined) return [null, null, null];
      const first = scalars(exercise.sets);
      return [first.series, first.reps, displayWeight(first.weight, unit)];
    });
  }

  const rows: Cell[][] = [
    padded([
      ...Array<Cell>(BASE_COLUMN_COUNT).fill(null),
      ...sorted.flatMap((week) => [
        `S${week.week_index} - ${formatIsoDate(week.start_date)}`,
        null,
        null,
      ]),
    ]),
  ];

  for (const day of plan.week_template) {
    if (!STRENGTH_DAY_TYPES.has(day.type)) continue;

    rows.push(padded([`Day ${day.day_index} - ${DAY_TYPE_LABELS[day.type]}`]));
    rows.push([
      'Exercise',
      'Series',
      'Reps',
      'Rest (s)',
      `Base ${weight}`,
      ...sorted.flatMap((week) => [
        `S${week.week_index} - series`,
        `S${week.week_index} - reps`,
        `S${week.week_index} - ${weight}`,
      ]),
    ]);

    for (const exercise of day.exercises) {
      rows.push([
        exercise.name,
        exercise.series,
        exercise.reps,
        exercise.rest_time_sec,
        displayWeight(exercise.weight_lb, unit),
        ...weekCells(day.day_index, exercise.exercise_key),
      ]);
    }

    for (const [exerciseKey, name] of extraExercises(sorted, day)) {
      rows.push([name, null, null, null, null, ...weekCells(day.day_index, exerciseKey)]);
    }

    rows.push(padded([]));
  }

  return '\uFEFF' + rows.map((row) => row.map(toCsvCell).join(',')).join('\r\n');
}
