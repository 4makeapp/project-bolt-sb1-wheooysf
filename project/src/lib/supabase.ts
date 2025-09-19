import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database types
export interface Tournament {
  id: string;
  name: string;
  year: number;
  created_at: string;
}

export interface Group {
  id: string;
  name: 'A' | 'B' | 'C' | 'D';
  tournament_id: string;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  logo_url?: string;
  is_placeholder: boolean;
  created_at: string;
  updated_at: string;
}

export interface Participation {
  group_id: string;
  team_id: string;
}

export interface Match {
  id: string;
  group_id: string;
  home_id: string;
  away_id: string;
  match_day: number;
  home_score?: number;
  away_score?: number;
  played_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Scorer {
  id: string;
  match_id: string;
  team_id: string;
  player_name: string;
  goals: number;
  created_at: string;
}

export interface Goalkeeper {
  id: string;
  name: string;
  team_id: string;
  created_at: string;
}

export interface GoalkeeperStat {
  goalkeeper_id: string;
  match_id: string;
  goals_conceded: number;
  clean_sheet: boolean;
}

// Nuovi tipi per regole complete
export interface Player {
  id: string;
  name: string;
  birth_date?: string;
  is_figc: boolean;
  figc_category?: 'prima_categoria_plus' | 'calcio_a_5' | 'professional_abroad';
  figc_details?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamRoster {
  id: string;
  team_id: string;
  player_id: string;
  jersey_number?: number;
  is_captain: boolean;
  added_at: string;
}

export interface KnockoutPhase {
  id: string;
  tournament_id: string;
  phase_type: 'quarterfinals' | 'semifinals' | 'third_place' | 'final';
  created_at: string;
}

export interface KnockoutMatch {
  id: string;
  phase_id: string;
  home_id?: string;
  away_id?: string;
  home_score?: number;
  away_score?: number;
  home_penalties?: number;
  away_penalties?: number;
  winner_id?: string;
  match_order: number;
  played_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Penalty {
  id: string;
  match_id: string;
  team_id: string;
  player_name: string;
  penalty_order: number;
  scored: boolean;
  created_at: string;
}

export interface Card {
  id: string;
  match_id?: string;
  knockout_match_id?: string;
  team_id: string;
  player_name: string;
  card_type: 'yellow' | 'red';
  minute?: number;
  created_at: string;
}

// Expanded types with joins
export interface MatchWithTeams extends Match {
  home_team: Team;
  away_team: Team;
  group: Group;
  home_cards?: number;
  away_cards?: number;
}

export interface TeamStats {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  cards: number;
  head_to_head_points?: number;
}

export interface PlayerScorer {
  player_name: string;
  team_name: string;
  total_goals: number;
  matches_played?: number;
  goals_per_match?: number;
}

export interface GoalkeeperStats {
  goalkeeper: Goalkeeper;
  team_name: string;
  matches_played: number;
  clean_sheets: number;
  goals_conceded: number;
  average_goals_conceded: number;
  knockout_matches_played?: number;
  knockout_goals_conceded?: number;
  total_matches_for_ranking?: number;
  total_goals_for_ranking?: number;
  reached_quarterfinals?: boolean;
}