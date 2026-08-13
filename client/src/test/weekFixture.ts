import type { Week } from '@/api/types';

const UUID = '00000000-0000-4000-8000-000000000001';
const NOW = '2026-07-23T00:00:00.000Z';

export function makeWeek(): Week {
  return {
    id: UUID,
    client_id: UUID,
    plan_id: UUID,
    week_index: 4,
    start_date: '2026-07-20',
    end_date: '2026-07-26',
    status: 'in_flight',
    schedule: [
      {
        day_index: 1,
        date: '2026-07-20',
        type: 'upper_body',
        notes: null,
        completed: false,
        completed_at: null,
        exercises: [
          {
            exercise_key: 'bench_press',
            name: 'Bench Press',
            skipped: false,
            feedback: null,
            prescribed: {
              series: 2,
              reps: 8,
              rest_time_sec: 90,
              weight_kg: 30,
              notes: null,
            },
            sets: [],
          },
        ],
      },
      {
        day_index: 2,
        date: '2026-07-21',
        type: 'rest',
        notes: 'Walk and recover.',
        completed: false,
        completed_at: null,
        exercises: [],
      },
    ],
    created_at: NOW,
    updated_at: NOW,
  };
}
