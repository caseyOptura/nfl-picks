-- Test seed: 4 Week 1 games (final) + 4 Week 2 games (final), picks for 2 users
-- League: "My Test Crew"  (season_year set to 2025)
-- Run in: Supabase dashboard → SQL editor

-- ============================================================
-- WEEK 1 results (all final)
--   DAL @ PHI  → PHI wins  (teamId 21)
--   KC  @ LAC  → LAC wins  (teamId 24)
--   TB  @ ATL  → TB  wins  (teamId 27)
--   CIN @ CLE  → CIN wins  (teamId  4)
-- ============================================================

-- User 1: picks PHI ✓, KC ✗, TB ✓, CIN ✓  → 3/4 correct
-- User 2: picks DAL ✗, LAC ✓, ATL ✗, CLE ✗ → 1/4 correct

insert into public.picks (league_id, user_id, game_id, picked_team_id) values
  -- DAL @ PHI
  ('9ad55879-1848-4769-82d7-dac33c822cb9', '1e72c076-1120-4304-8230-63775c8c71be', '401772510', '21'),   -- PHI (correct)
  ('9ad55879-1848-4769-82d7-dac33c822cb9', 'd04fcb90-d81b-4703-a8ac-789ac49f5f4d', '401772510', '6'),    -- DAL (wrong)
  -- KC @ LAC
  ('9ad55879-1848-4769-82d7-dac33c822cb9', '1e72c076-1120-4304-8230-63775c8c71be', '401772714', '12'),   -- KC  (wrong)
  ('9ad55879-1848-4769-82d7-dac33c822cb9', 'd04fcb90-d81b-4703-a8ac-789ac49f5f4d', '401772714', '24'),   -- LAC (correct)
  -- TB @ ATL
  ('9ad55879-1848-4769-82d7-dac33c822cb9', '1e72c076-1120-4304-8230-63775c8c71be', '401772830', '27'),   -- TB  (correct)
  ('9ad55879-1848-4769-82d7-dac33c822cb9', 'd04fcb90-d81b-4703-a8ac-789ac49f5f4d', '401772830', '1'),    -- ATL (wrong)
  -- CIN @ CLE
  ('9ad55879-1848-4769-82d7-dac33c822cb9', '1e72c076-1120-4304-8230-63775c8c71be', '401772829', '4'),    -- CIN (correct)
  ('9ad55879-1848-4769-82d7-dac33c822cb9', 'd04fcb90-d81b-4703-a8ac-789ac49f5f4d', '401772829', '5')     -- CLE (wrong)
on conflict (league_id, user_id, game_id) do update
  set picked_team_id = excluded.picked_team_id,
      updated_at     = now();

-- ============================================================
-- WEEK 2 results (all final)
--   WSH @ GB   → GB  wins  (teamId  9)
--   JAX @ CIN  → CIN wins  (teamId  4)
--   NYG @ DAL  → DAL wins  (teamId  6)
--   CHI @ DET  → DET wins  (teamId  8)
-- ============================================================

-- User 1: picks GB ✓, CIN ✓, NYG ✗, DET ✓  → 3/4 correct  (running 6/8)
-- User 2: picks WSH ✗, JAX ✗, DAL ✓, CHI ✗  → 1/4 correct  (running 2/8)

insert into public.picks (league_id, user_id, game_id, picked_team_id) values
  -- WSH @ GB
  ('9ad55879-1848-4769-82d7-dac33c822cb9', '1e72c076-1120-4304-8230-63775c8c71be', '401772936', '9'),    -- GB  (correct)
  ('9ad55879-1848-4769-82d7-dac33c822cb9', 'd04fcb90-d81b-4703-a8ac-789ac49f5f4d', '401772936', '28'),   -- WSH (wrong)
  -- JAX @ CIN
  ('9ad55879-1848-4769-82d7-dac33c822cb9', '1e72c076-1120-4304-8230-63775c8c71be', '401772725', '4'),    -- CIN (correct)
  ('9ad55879-1848-4769-82d7-dac33c822cb9', 'd04fcb90-d81b-4703-a8ac-789ac49f5f4d', '401772725', '30'),   -- JAX (wrong)
  -- NYG @ DAL
  ('9ad55879-1848-4769-82d7-dac33c822cb9', '1e72c076-1120-4304-8230-63775c8c71be', '401772834', '19'),   -- NYG (wrong)
  ('9ad55879-1848-4769-82d7-dac33c822cb9', 'd04fcb90-d81b-4703-a8ac-789ac49f5f4d', '401772834', '6'),    -- DAL (correct)
  -- CHI @ DET
  ('9ad55879-1848-4769-82d7-dac33c822cb9', '1e72c076-1120-4304-8230-63775c8c71be', '401772835', '8'),    -- DET (correct)
  ('9ad55879-1848-4769-82d7-dac33c822cb9', 'd04fcb90-d81b-4703-a8ac-789ac49f5f4d', '401772835', '3')     -- CHI (wrong)
on conflict (league_id, user_id, game_id) do update
  set picked_team_id = excluded.picked_team_id,
      updated_at     = now();

-- ============================================================
-- Expected leaderboard after seeding
--   User 1: 6W – 2L  (75%)  → rank 1
--   User 2: 2W – 6L  (25%)  → rank 2
-- ============================================================
