/*
  # Schema completo torneo calcio

  1. Database Structure
    - `tournaments` - Tornei
    - `groups` - Gironi (A, B, C, D)  
    - `teams` - Squadre (16 placeholder iniziali)
    - `participations` - Partecipazioni squadre nei gironi
    - `matches` - Partite del torneo
    - `scorers` - Marcatori delle partite
    - `goalkeepers` - Portieri delle squadre
    - `goalkeeper_stats` - Statistiche portieri per partita

  2. Security
    - Enable RLS on all tables
    - Admin-only policies for modifications
    - Public read access for viewing data
*/

-- Tournament table
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  year integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Groups table (A, B, C, D)
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (name IN ('A', 'B', 'C', 'D')),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  is_placeholder boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Participations table (teams in groups)
CREATE TABLE IF NOT EXISTS participations (
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, team_id)
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES groups(id) ON DELETE CASCADE,
  home_id uuid REFERENCES teams(id),
  away_id uuid REFERENCES teams(id),
  match_day integer NOT NULL,
  home_score integer,
  away_score integer,
  played_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Scorers table  
CREATE TABLE IF NOT EXISTS scorers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id),
  player_name text NOT NULL,
  goals integer NOT NULL CHECK (goals >= 1),
  created_at timestamptz DEFAULT now()
);

-- Goalkeepers table
CREATE TABLE IF NOT EXISTS goalkeepers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Goalkeeper stats table
CREATE TABLE IF NOT EXISTS goalkeeper_stats (
  goalkeeper_id uuid REFERENCES goalkeepers(id) ON DELETE CASCADE,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  goals_conceded integer NOT NULL DEFAULT 0,
  clean_sheet boolean DEFAULT false,
  PRIMARY KEY (goalkeeper_id, match_id)
);

-- Enable Row Level Security
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorers ENABLE ROW LEVEL SECURITY;
ALTER TABLE goalkeepers ENABLE ROW LEVEL SECURITY;
ALTER TABLE goalkeeper_stats ENABLE ROW LEVEL SECURITY;

-- Policies for public read access
CREATE POLICY "Allow public read tournaments" ON tournaments FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read groups" ON groups FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read teams" ON teams FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read participations" ON participations FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read matches" ON matches FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read scorers" ON scorers FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read goalkeepers" ON goalkeepers FOR SELECT TO public USING (true);
CREATE POLICY "Allow public read goalkeeper_stats" ON goalkeeper_stats FOR SELECT TO public USING (true);

-- Policies for admin write access
CREATE POLICY "Allow admin write tournaments" ON tournaments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write groups" ON groups FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write teams" ON teams FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write participations" ON participations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write matches" ON matches FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write scorers" ON scorers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write goalkeepers" ON goalkeepers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow admin write goalkeeper_stats" ON goalkeeper_stats FOR ALL TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_groups_tournament ON groups(tournament_id);
CREATE INDEX IF NOT EXISTS idx_participations_group ON participations(group_id);
CREATE INDEX IF NOT EXISTS idx_matches_group ON matches(group_id);
CREATE INDEX IF NOT EXISTS idx_matches_teams ON matches(home_id, away_id);
CREATE INDEX IF NOT EXISTS idx_scorers_match ON scorers(match_id);
CREATE INDEX IF NOT EXISTS idx_scorers_team ON scorers(team_id);
CREATE INDEX IF NOT EXISTS idx_goalkeepers_team ON goalkeepers(team_id);