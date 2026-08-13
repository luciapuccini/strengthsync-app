-- Demo data adapted from services/db/seed/data and translated to English.
-- Apply after migrations and 000_default_coach.sql.
--
-- The in-flight week (id ...0013) is anchored to the Monday on-or-before
-- `date('now')` rather than a fixed calendar date, so it never expires; see
-- 002_historical_weeks.sql for the three completed weeks immediately before
-- it and the auth PRD's Further Notes for why.

INSERT OR IGNORE INTO clients (
  id,
  coach_id,
  display_name,
  status,
  created_at,
  updated_at
)
SELECT
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000001',
  'Lucia',
  'active',
  week4_start || 'T00:00:00.000Z',
  date(week4_start, '+3 days') || 'T00:00:00.000Z'
FROM (SELECT date('now', '-6 days', 'weekday 1') AS week4_start);

INSERT OR IGNORE INTO client_profiles (
  id,
  client_id,
  snapshot_date,
  sex,
  age,
  height_cm,
  goals,
  body_composition,
  strength_loads,
  nutrition,
  swimming,
  schedule_preferences,
  notes,
  updated_at
)
SELECT
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000010',
  '2026-05-10',
  'female',
  30,
  165,
  '{"target_date":"2026-11","target_weight_kg":58.5,"target_body_fat_percent":21,"body_fat_floor_percent":20,"fat_to_lose_kg":-4.7,"muscle_to_gain_kg":2.5,"midpoint_review":"2026-08"}',
  '{"current_may_2026":{"weight_kg":60.65,"body_fat_percent":28,"bmr_kcal":null,"tdee_kcal":1835},"baseline_feb_2026":{"weight_kg":63,"body_fat_percent":33,"bmr_kcal":1387,"tdee_kcal":1907},"first_block_changes":{"fat_lost_kg":-3.8,"muscle_gained_kg":1.5,"weight_change_kg":-2.35,"body_fat_change_percentage_points":-5}}',
  '{"upper_body":{"bench_press":"27.5 kg","lat_pulldown":"30 kg","seated_cable_row":"27.5 kg","45_degree_row":"28 kg","barbell_shoulder_press":"17 kg","biceps_curl":"12 kg","band_assisted_pull_ups":"4 x 6","push_ups":"4 x 8","inverted_rows":"3 x 8","overhead_triceps_extension":"3 x 12","face_pull":"7.5 kg"},"lower_body":{"squat":"42.5 kg","deadlift":"42.5 kg","sumo_deadlift":"50 kg","hip_thrust":"40 kg / 4 x 10","lunges":"15 kg bag","leg_curl":"27.5 kg","leg_extension":"27.5 kg","back_extension":"10 kg"}}',
  '{"daily_targets":{"kcal":1750,"protein_g":130,"carbs_g":175,"fat_g":58,"minimum_fiber_g":25},"approach":"clean whole foods","primary_grocery_store":"Mercadona","meal_schedule":{"breakfast":"09:00","lunch":"12:30","training":"14:00-15:00","post_workout":"16:30","dinner":"20:00"},"cheat_meals_per_week":2,"cheat_meal_examples":["burger and fries","pizza"],"supplements":{"whey_protein":"post-workout","creatine_g_per_day":5,"vitamin_d":true,"magnesium_bisglycinate":"added in week 4 for cramps","training_electrolytes":"salt and lemon in water"}}',
  '{"sessions_per_week":2,"session_types":{"wednesday":"Pyramid","friday":"Endurance 2000 m"},"benchmarks_achieved":{"distance_per_stroke_above_2_2_m":true,"swolf_at_or_below_53":true,"endurance_2000_m":true,"best_pace_per_100_m":"2:46 on 2026-05-03"},"targets":{"swolf":"53 or lower consistently","average_pace_per_100_m":"toward 2:45","average_endurance_heart_rate_bpm":"125 or lower"}}',
  '{"job_activity_level":"very sedentary with long sitting hours","training_days_per_week":6,"rest_day":"Sunday","weekly_schedule":{"monday":"Upper body - Day 1","tuesday":"Legs - Day 2","wednesday":"Swimming - Pyramid","thursday":"Upper body - Day 3","friday":"Swimming - Endurance","saturday":"Legs - Day 4","sunday":"Rest"}}',
  'Uses no birth control. Menstrual cycle is regular, usually around days 10-13 of the month.',
  date(week4_start, '+3 days') || 'T00:00:00.000Z'
FROM (SELECT date('now', '-6 days', 'weekday 1') AS week4_start);

INSERT OR IGNORE INTO plans (
  id,
  client_id,
  label,
  status,
  total_weeks,
  week_template,
  rationale,
  activated_at,
  workflow_id,
  created_at,
  updated_at
)
SELECT
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000010',
  'Strength and Swimming Block',
  'active',
  6,
  '[
    {"day_index":1,"type":"upper_body","notes":null,"exercises":[
      {"exercise_key":"flat_bench_press","name":"Flat Bench Press","series":4,"reps":10,"rest_time_sec":90,"weight_kg":25,"notes":null},
      {"exercise_key":"lat_pulldown","name":"Lat Pulldown","series":4,"reps":12,"rest_time_sec":90,"weight_kg":30,"notes":null},
      {"exercise_key":"seated_cable_row","name":"Seated Cable Row","series":3,"reps":12,"rest_time_sec":90,"weight_kg":25,"notes":null},
      {"exercise_key":"barbell_shoulder_press","name":"Barbell Shoulder Press","series":3,"reps":10,"rest_time_sec":90,"weight_kg":15,"notes":null},
      {"exercise_key":"biceps_curl","name":"Biceps Curl","series":3,"reps":12,"rest_time_sec":90,"weight_kg":6,"notes":null},
      {"exercise_key":"cable_triceps_extension","name":"Cable Triceps Extension","series":3,"reps":12,"rest_time_sec":90,"weight_kg":7.5,"notes":null},
      {"exercise_key":"push_ups","name":"Push-Ups","series":3,"reps":8,"rest_time_sec":90,"weight_kg":null,"notes":null}
    ]},
    {"day_index":2,"type":"leg_day","notes":null,"exercises":[
      {"exercise_key":"front_squat","name":"Front Squat","series":3,"reps":10,"rest_time_sec":90,"weight_kg":30,"notes":null},
      {"exercise_key":"deadlift","name":"Deadlift","series":4,"reps":10,"rest_time_sec":90,"weight_kg":45,"notes":null},
      {"exercise_key":"lunges","name":"Lunges","series":4,"reps":15,"rest_time_sec":90,"weight_kg":20,"notes":null},
      {"exercise_key":"back_extension","name":"Back Extension","series":3,"reps":12,"rest_time_sec":90,"weight_kg":12,"notes":null},
      {"exercise_key":"leg_extension","name":"Leg Extension","series":3,"reps":12,"rest_time_sec":90,"weight_kg":28,"notes":null},
      {"exercise_key":"leg_curl","name":"Leg Curl","series":3,"reps":12,"rest_time_sec":90,"weight_kg":28,"notes":null}
    ]},
    {"day_index":3,"type":"swimming","notes":"Technique swim and pyramid: 50 m / 100 m / 150 m / 300 m / 150 m / 100 m / 50 m.","exercises":[]},
    {"day_index":4,"type":"upper_body","notes":null,"exercises":[
      {"exercise_key":"pull_ups","name":"Pull-Ups","series":4,"reps":6,"rest_time_sec":90,"weight_kg":null,"notes":"Use a resistance band."},
      {"exercise_key":"45_degree_row","name":"45-Degree Row","series":4,"reps":10,"rest_time_sec":90,"weight_kg":28,"notes":null},
      {"exercise_key":"lateral_raise","name":"Lateral Raise","series":3,"reps":8,"rest_time_sec":90,"weight_kg":6,"notes":null},
      {"exercise_key":"inverted_row","name":"Inverted Row","series":3,"reps":8,"rest_time_sec":90,"weight_kg":null,"notes":null},
      {"exercise_key":"overhead_triceps_extension","name":"Overhead Triceps Extension","series":3,"reps":12,"rest_time_sec":90,"weight_kg":7.5,"notes":null},
      {"exercise_key":"face_pull","name":"Face Pull","series":3,"reps":12,"rest_time_sec":90,"weight_kg":7.5,"notes":null}
    ]},
    {"day_index":5,"type":"swimming","notes":"Endurance swim: 2000 m.","exercises":[]},
    {"day_index":6,"type":"leg_day","notes":null,"exercises":[
      {"exercise_key":"squat","name":"Squat","series":4,"reps":10,"rest_time_sec":90,"weight_kg":45,"notes":null},
      {"exercise_key":"deadlift","name":"Deadlift","series":4,"reps":10,"rest_time_sec":90,"weight_kg":45,"notes":null},
      {"exercise_key":"sumo_deadlift","name":"Sumo Deadlift","series":3,"reps":10,"rest_time_sec":90,"weight_kg":50,"notes":null},
      {"exercise_key":"hip_thrust","name":"Hip Thrust","series":3,"reps":10,"rest_time_sec":90,"weight_kg":45,"notes":null},
      {"exercise_key":"glute_kickback","name":"Glute Kickback","series":3,"reps":10,"rest_time_sec":90,"weight_kg":10,"notes":null},
      {"exercise_key":"step_up","name":"Step-Up","series":3,"reps":8,"rest_time_sec":90,"weight_kg":null,"notes":null},
      {"exercise_key":"leg_extension","name":"Leg Extension","series":3,"reps":12,"rest_time_sec":90,"weight_kg":28,"notes":null}
    ]},
    {"day_index":7,"type":"rest","notes":"Active recovery: aim for 10,000 steps and gentle mobility.","exercises":[]}
  ]',
  'Six-week strength block with two swimming sessions and one active recovery day.',
  week4_start || 'T00:00:00.000Z',
  NULL,
  week4_start || 'T00:00:00.000Z',
  date(week4_start, '+3 days') || 'T00:00:00.000Z'
FROM (SELECT date('now', '-6 days', 'weekday 1') AS week4_start);

INSERT OR IGNORE INTO weeks (
  id,
  client_id,
  plan_id,
  week_index,
  start_date,
  end_date,
  status,
  schedule,
  workflow_id,
  created_at,
  updated_at
)
SELECT
  '00000000-0000-4000-8000-000000000013',
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000012',
  4,
  week4_start,
  date(week4_start, '+6 days'),
  'in_flight',
  json_set('[
    {"day_index":1,"date":"2026-07-20","type":"upper_body","notes":null,"completed":true,"completed_at":"2026-07-20T16:00:00.000Z","exercises":[
      {"exercise_key":"flat_bench_press","name":"Flat Bench Press","skipped":false,"feedback":null,"prescribed":{"series":4,"reps":12,"rest_time_sec":90,"weight_kg":28,"notes":null},"sets":[{"performed_reps":12,"performed_weight_kg":28},{"performed_reps":12,"performed_weight_kg":28},{"performed_reps":12,"performed_weight_kg":28},{"performed_reps":12,"performed_weight_kg":28}]},
      {"exercise_key":"lat_pulldown","name":"Lat Pulldown","skipped":false,"feedback":null,"prescribed":{"series":4,"reps":12,"rest_time_sec":90,"weight_kg":30,"notes":null},"sets":[{"performed_reps":12,"performed_weight_kg":30},{"performed_reps":12,"performed_weight_kg":30},{"performed_reps":12,"performed_weight_kg":30},{"performed_reps":12,"performed_weight_kg":30}]},
      {"exercise_key":"seated_cable_row","name":"Seated Cable Row","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":12,"rest_time_sec":90,"weight_kg":26,"notes":null},"sets":[{"performed_reps":12,"performed_weight_kg":26},{"performed_reps":12,"performed_weight_kg":26},{"performed_reps":12,"performed_weight_kg":26}]},
      {"exercise_key":"barbell_shoulder_press","name":"Barbell Shoulder Press","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":10,"rest_time_sec":90,"weight_kg":20,"notes":null},"sets":[{"performed_reps":8,"performed_weight_kg":20},{"performed_reps":8,"performed_weight_kg":20},{"performed_reps":8,"performed_weight_kg":20}]},
      {"exercise_key":"biceps_curl","name":"Biceps Curl","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":12,"rest_time_sec":90,"weight_kg":6,"notes":null},"sets":[{"performed_reps":12,"performed_weight_kg":6},{"performed_reps":12,"performed_weight_kg":6},{"performed_reps":12,"performed_weight_kg":6}]},
      {"exercise_key":"cable_triceps_extension","name":"Cable Triceps Extension","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":12,"rest_time_sec":90,"weight_kg":8.5,"notes":null},"sets":[{"performed_reps":12,"performed_weight_kg":8.5},{"performed_reps":12,"performed_weight_kg":8.5},{"performed_reps":12,"performed_weight_kg":8.5}]},
      {"exercise_key":"push_ups","name":"Push-Ups","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":8,"rest_time_sec":90,"weight_kg":null,"notes":null},"sets":[{"performed_reps":8,"performed_weight_kg":null},{"performed_reps":8,"performed_weight_kg":null},{"performed_reps":8,"performed_weight_kg":null}]}
    ]},
    {"day_index":2,"date":"2026-07-21","type":"leg_day","notes":"Extra cardio: 20-minute walk.","completed":true,"completed_at":"2026-07-21T16:00:00.000Z","exercises":[
      {"exercise_key":"front_squat","name":"Front Squat","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":10,"rest_time_sec":90,"weight_kg":30,"notes":null},"sets":[{"performed_reps":10,"performed_weight_kg":30},{"performed_reps":10,"performed_weight_kg":30},{"performed_reps":10,"performed_weight_kg":30}]},
      {"exercise_key":"deadlift","name":"Deadlift","skipped":false,"feedback":null,"prescribed":{"series":4,"reps":10,"rest_time_sec":90,"weight_kg":45,"notes":null},"sets":[{"performed_reps":10,"performed_weight_kg":45},{"performed_reps":10,"performed_weight_kg":45},{"performed_reps":10,"performed_weight_kg":45},{"performed_reps":10,"performed_weight_kg":45}]},
      {"exercise_key":"lunges","name":"Lunges","skipped":false,"feedback":null,"prescribed":{"series":4,"reps":15,"rest_time_sec":90,"weight_kg":20,"notes":null},"sets":[{"performed_reps":15,"performed_weight_kg":20},{"performed_reps":15,"performed_weight_kg":20},{"performed_reps":15,"performed_weight_kg":20},{"performed_reps":15,"performed_weight_kg":20}]},
      {"exercise_key":"back_extension","name":"Back Extension","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":12,"rest_time_sec":90,"weight_kg":12,"notes":null},"sets":[{"performed_reps":12,"performed_weight_kg":12},{"performed_reps":12,"performed_weight_kg":12},{"performed_reps":12,"performed_weight_kg":12}]},
      {"exercise_key":"leg_extension","name":"Leg Extension","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":12,"rest_time_sec":90,"weight_kg":30,"notes":null},"sets":[{"performed_reps":12,"performed_weight_kg":30},{"performed_reps":12,"performed_weight_kg":30},{"performed_reps":12,"performed_weight_kg":30}]},
      {"exercise_key":"leg_curl","name":"Leg Curl","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":12,"rest_time_sec":90,"weight_kg":30,"notes":null},"sets":[{"performed_reps":12,"performed_weight_kg":30},{"performed_reps":12,"performed_weight_kg":30},{"performed_reps":12,"performed_weight_kg":30}]}
    ]},
    {"day_index":3,"date":"2026-07-22","type":"swimming","notes":"Technique swim and pyramid: 50 m / 100 m / 150 m / 300 m / 150 m / 100 m / 50 m.","completed":false,"completed_at":null,"exercises":[]},
    {"day_index":4,"date":"2026-07-23","type":"upper_body","notes":"Extra cardio: 20 minutes on the stairs.","completed":false,"completed_at":null,"exercises":[
      {"exercise_key":"pull_ups","name":"Pull-Ups","skipped":false,"feedback":null,"prescribed":{"series":4,"reps":6,"rest_time_sec":90,"weight_kg":null,"notes":"Use a resistance band."},"sets":[]},
      {"exercise_key":"45_degree_row","name":"45-Degree Row","skipped":false,"feedback":null,"prescribed":{"series":4,"reps":10,"rest_time_sec":90,"weight_kg":26,"notes":null},"sets":[]},
      {"exercise_key":"lateral_raise","name":"Lateral Raise","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":8,"rest_time_sec":90,"weight_kg":5,"notes":null},"sets":[]},
      {"exercise_key":"inverted_row","name":"Inverted Row","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":8,"rest_time_sec":90,"weight_kg":null,"notes":null},"sets":[]},
      {"exercise_key":"overhead_triceps_extension","name":"Overhead Triceps Extension","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":12,"rest_time_sec":90,"weight_kg":8.5,"notes":null},"sets":[]},
      {"exercise_key":"face_pull","name":"Face Pull","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":12,"rest_time_sec":90,"weight_kg":8.5,"notes":null},"sets":[]}
    ]},
    {"day_index":5,"date":"2026-07-24","type":"swimming","notes":"Endurance swim: 2000 m.","completed":false,"completed_at":null,"exercises":[]},
    {"day_index":6,"date":"2026-07-25","type":"leg_day","notes":null,"completed":false,"completed_at":null,"exercises":[
      {"exercise_key":"squat","name":"Squat","skipped":false,"feedback":null,"prescribed":{"series":4,"reps":12,"rest_time_sec":90,"weight_kg":46,"notes":null},"sets":[]},
      {"exercise_key":"deadlift","name":"Deadlift","skipped":false,"feedback":null,"prescribed":{"series":4,"reps":10,"rest_time_sec":90,"weight_kg":45,"notes":null},"sets":[]},
      {"exercise_key":"sumo_deadlift","name":"Sumo Deadlift","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":10,"rest_time_sec":90,"weight_kg":51,"notes":null},"sets":[]},
      {"exercise_key":"hip_thrust","name":"Hip Thrust","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":10,"rest_time_sec":90,"weight_kg":46,"notes":null},"sets":[]},
      {"exercise_key":"glute_kickback","name":"Glute Kickback","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":10,"rest_time_sec":90,"weight_kg":11,"notes":null},"sets":[]},
      {"exercise_key":"step_up","name":"Step-Up","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":8,"rest_time_sec":90,"weight_kg":null,"notes":null},"sets":[]},
      {"exercise_key":"leg_extension","name":"Leg Extension","skipped":false,"feedback":null,"prescribed":{"series":3,"reps":12,"rest_time_sec":90,"weight_kg":29,"notes":null},"sets":[]}
    ]},
    {"day_index":7,"date":"2026-07-26","type":"rest","notes":"Active recovery: aim for 10,000 steps and gentle mobility. Add an easy walk, yoga, or a gentle Pilates class if you feel like it.","completed":false,"completed_at":null,"exercises":[]}
  ]',
    '$[0].date', week4_start,
    '$[0].completed_at', week4_start || 'T16:00:00.000Z',
    '$[1].date', date(week4_start, '+1 days'),
    '$[1].completed_at', date(week4_start, '+1 days') || 'T16:00:00.000Z',
    '$[2].date', date(week4_start, '+2 days'),
    '$[3].date', date(week4_start, '+3 days'),
    '$[4].date', date(week4_start, '+4 days'),
    '$[5].date', date(week4_start, '+5 days'),
    '$[6].date', date(week4_start, '+6 days')
  ),
  NULL,
  week4_start || 'T00:00:00.000Z',
  date(week4_start, '+3 days') || 'T00:00:00.000Z'
FROM (SELECT date('now', '-6 days', 'weekday 1') AS week4_start);
