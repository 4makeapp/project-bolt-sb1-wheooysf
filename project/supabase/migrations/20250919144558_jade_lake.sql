/*
  # Fix Tournament Schema

  1. New Tables
    - Fix existing tables structure
    - Add missing knockout tables
    - Simplify goalkeeper management
  
  2. Security
    - Update RLS policies
    - Fix foreign key constraints
*/

-- Drop existing problematic tables if they exist
DROP TABLE IF EXISTS knockout_matches CASCADE;
DROP TABLE IF EXISTS knockout_phases CASCADE;
DROP TABLE IF EXISTS penalties CASCADE;
DROP TABLE IF EXISTS cards CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS team_rosters CASCADE;

-- Create knockout phases table
CREATE TABLE IF NOT EXISTS knockout_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  phase_type text NOT NULL CHECK (phase_type IN ('quarterfinals', 'semifinals', 'third_place', 'final')),
  created_at timestamptz DEFAULT now()
);

-- Create knockout matches table
CREATE TABLE IF NOT EXISTS knockout_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid NOT NULL REFERENCES knockout_phases(id) ON DELETE CASCADE,
  home_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  away_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  home_score integer,
  away_score integer,
  home_penalties integer,
  away_penalties integer,
  winner_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  match_order integer NOT NULL,
  played_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create players table (simplified)
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  birth_date date,
  is_figc boolean DEFAULT false,
  figc_category text CHECK (figc_category IN ('prima_categoria_plus', 'calcio_a_5', 'professional_abroad')),
  figc_details text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create team rosters table
CREATE TABLE IF NOT EXISTS team_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  jersey_number integer,
  is_captain boolean DEFAULT false,
  added_at timestamptz DEFAULT now(),
  UNIQUE(team_id, player_id),
  UNIQUE(team_id, jersey_number)
);

-- Create cards table (simplified)
CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  knockout_match_id uuid REFERENCES knockout_matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  card_type text NOT NULL CHECK (card_type IN ('yellow', 'red')),
  minute integer,
  created_at timestamptz DEFAULT now(),
  CHECK ((match_id IS NOT NULL AND knockout_match_id IS NULL) OR (match_id IS NULL AND knockout_match_id IS NOT NULL))
);

-- Add missing columns to matches table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'home_cards'
  ) THEN
    ALTER TABLE matches ADD COLUMN home_cards integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'away_cards'
  ) THEN
    ALTER TABLE matches ADD COLUMN away_cards integer DEFAULT 0;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE knockout_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE knockout_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "Public read access knockout_phases" ON knockout_phases FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated insert knockout_phases" ON knockout_phases FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Authenticated update knockout_phases" ON knockout_phases FOR UPDATE TO public USING (true);

CREATE POLICY "Public read access knockout_matches" ON knockout_matches FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated insert knockout_matches" ON knockout_matches FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Authenticated update knockout_matches" ON knockout_matches FOR UPDATE TO public USING (true);

CREATE POLICY "Public read access players" ON players FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated insert players" ON players FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Authenticated update players" ON players FOR UPDATE TO public USING (true);

CREATE POLICY "Public read access team_rosters" ON team_rosters FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated insert team_rosters" ON team_rosters FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public read access cards" ON cards FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated insert cards" ON cards FOR INSERT TO public WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_knockout_phases_tournament ON knockout_phases(tournament_id);
CREATE INDEX IF NOT EXISTS idx_knockout_matches_phase ON knockout_matches(phase_id);
CREATE INDEX IF NOT EXISTS idx_team_rosters_team ON team_rosters(team_id);
CREATE INDEX IF NOT EXISTS idx_cards_match ON cards(match_id);
CREATE INDEX IF NOT EXISTS idx_cards_knockout_match ON cards(knockout_match_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_knockout_matches_updated_at BEFORE UPDATE ON knockout_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();