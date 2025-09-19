import { supabase } from '../lib/supabase';
import type { TeamStats, PlayerScorer, GoalkeeperStats } from '../lib/supabase';

export class StatsService {
  
  // Calculate group standings
  static async getGroupStandings(groupId: string): Promise<TeamStats[]> {
    const { data: matches, error } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_id_fkey(*),
        away_team:teams!matches_away_id_fkey(*)
      `)
      .eq('group_id', groupId)
      .not('home_score', 'is', null)
      .not('away_score', 'is', null);

    if (error) throw error;

    // Get all teams in group
    const { data: participations } = await supabase
      .from('participations')
      .select('teams(*)')
      .eq('group_id', groupId);

    const teams = participations?.map(p => p.teams).filter(Boolean) || [];
    
    // Initialize stats for each team
    const teamStatsMap = new Map<string, TeamStats>();
    teams.forEach(team => {
      teamStatsMap.set(team.id, {
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0,
        cards: 0
      });
    });

    // Calculate stats from matches
    matches?.forEach(match => {
      const homeStats = teamStatsMap.get(match.home_id);
      const awayStats = teamStatsMap.get(match.away_id);
      
      if (!homeStats || !awayStats) return;

      const homeScore = match.home_score!;
      const awayScore = match.away_score!;

      // Update played matches
      homeStats.played++;
      awayStats.played++;

      // Update goals
      homeStats.goals_for += homeScore;
      homeStats.goals_against += awayScore;
      awayStats.goals_for += awayScore;
      awayStats.goals_against += homeScore;

      // Update cards
      // Cards will be handled separately if needed

      // Update win/draw/loss and points
      if (homeScore > awayScore) {
        homeStats.won++;
        homeStats.points += 3;
        awayStats.lost++;
      } else if (homeScore < awayScore) {
        awayStats.won++;
        awayStats.points += 3;
        homeStats.lost++;
      } else {
        homeStats.drawn++;
        homeStats.points += 1;
        awayStats.drawn++;
        awayStats.points += 1;
      }

      // Update goal difference
      homeStats.goal_difference = homeStats.goals_for - homeStats.goals_against;
      awayStats.goal_difference = awayStats.goals_for - awayStats.goals_against;
    });

    // Convert to array and sort
    const standings = Array.from(teamStatsMap.values());
    return this.sortStandings(standings);
  }

  // Sort standings by rules (punti → scontro diretto → diff reti → gol fatti → gol subiti → ammonizioni → sorteggio)
  private static sortStandings(standings: TeamStats[]): TeamStats[] {
    return standings.sort((a, b) => {
      // 1. Points
      if (a.points !== b.points) return b.points - a.points;
      
      // 2. Head-to-head (scontro diretto) - implementazione semplificata
      // TODO: Implementare classifica avulsa completa
      
      // 3. Goal difference
      if (a.goal_difference !== b.goal_difference) {
        return b.goal_difference - a.goal_difference;
      }
      
      // 4. Goals scored
      if (a.goals_for !== b.goals_for) return b.goals_for - a.goals_for;
      
      // 5. Goals conceded (meno gol subiti è meglio)
      if (a.goals_against !== b.goals_against) return a.goals_against - b.goals_against;
      
      // 6. Alphabetical (sorteggio simulato)
      return a.team.name.localeCompare(b.team.name);
    });
  }

  // Get top scorers
  static async getTopScorers(): Promise<PlayerScorer[]> {
    // Get scorers from both group matches and knockout matches
    const { data: groupScorers, error: groupError } = await supabase
      .from('scorers')
      .select(`
        player_name,
        goals,
        teams(name)
      `)
      .not('match_id', 'is', null);

    if (groupError) throw groupError;

    const { data: knockoutScorers, error: knockoutError } = await supabase
      .from('scorers')
      .select(`
        player_name,
        goals,
        teams(name)
      `)
      .not('knockout_match_id', 'is', null);

    if (knockoutError) throw knockoutError;

    // Combine both datasets
    const allScorers = [...(groupScorers || []), ...(knockoutScorers || [])];

    // Group by player and sum goals
    const scorerMap = new Map<string, PlayerScorer>();
    allScorers.forEach(scorer => {
      const key = `${scorer.player_name}-${scorer.teams?.name}`;
      const existing = scorerMap.get(key);
      
      if (existing) {
        existing.total_goals += scorer.goals;
      } else {
        scorerMap.set(key, {
          player_name: scorer.player_name,
          team_name: scorer.teams?.name || '',
          total_goals: scorer.goals
        });
      }
    });

    // Ordina per gol totali, in caso di parità per nome (criterio aggiuntivo da implementare)
    return Array.from(scorerMap.values()).sort((a, b) => {
      if (a.total_goals !== b.total_goals) return b.total_goals - a.total_goals;
      // TODO: Implementare criteri aggiuntivi per parità capocannoniere
      return a.player_name.localeCompare(b.player_name);
    });
  }

  // Get goalkeeper statistics con regole speciali torneo
  static async getGoalkeeperStats(): Promise<GoalkeeperStats[]> {
    // Get group stage stats
    const { data: groupStats, error: groupError } = await supabase
      .from('goalkeeper_stats')
      .select(`
        *,
        goalkeepers(*, teams(*)),
        matches!goalkeeper_stats_match_id_fkey(group_id)
      `)
      .not('match_id', 'is', null);

    if (groupError) throw groupError;

    // Get knockout stage stats
    const { data: knockoutStats, error: knockoutError } = await supabase
      .from('goalkeeper_stats')
      .select(`
        *,
        goalkeepers(*, teams(*)),
        knockout_matches!goalkeeper_stats_knockout_match_id_fkey(*)
      `)
      .not('knockout_match_id', 'is', null);

    if (knockoutError) throw knockoutError;

    // Group by goalkeeper
    const goalkeeperMap = new Map<string, {
      goalkeeper: any;
      team_name: string;
      group_matches_played: number;
      knockout_matches_played: number;
      clean_sheets: number;
      total_goals_conceded: number;
      reached_quarterfinals: boolean;
    }>();

    // Process group stats
    groupStats?.forEach(stat => {
      const gk = stat.goalkeepers;
      if (!gk) return;

      const existing = goalkeeperMap.get(gk.id);
      if (existing) {
        existing.group_matches_played++;
        if (stat.clean_sheet) existing.clean_sheets++;
        existing.total_goals_conceded += stat.goals_conceded;
      } else {
        goalkeeperMap.set(gk.id, {
          goalkeeper: gk,
          team_name: gk.teams?.name || '',
          group_matches_played: 1,
          knockout_matches_played: 0,
          clean_sheets: stat.clean_sheet ? 1 : 0,
          total_goals_conceded: stat.goals_conceded,
          reached_quarterfinals: false
        });
      }
    });

    // Process knockout stats
    knockoutStats?.forEach(stat => {
      const gk = stat.goalkeepers;
      if (!gk) return;

      const existing = goalkeeperMap.get(gk.id);
      if (existing) {
        existing.knockout_matches_played++;
        existing.reached_quarterfinals = true; // If played knockout, reached quarters
        if (stat.clean_sheet) existing.clean_sheets++;
        existing.total_goals_conceded += stat.goals_conceded;
      } else {
        // Shouldn't happen, but handle it
        goalkeeperMap.set(gk.id, {
          goalkeeper: gk,
          team_name: gk.teams?.name || '',
          group_matches_played: 0,
          knockout_matches_played: 1,
          clean_sheets: stat.clean_sheet ? 1 : 0,
          total_goals_conceded: stat.goals_conceded,
          reached_quarterfinals: true
        });
      }
    });

    // Convert to final format and sort
    return Array.from(goalkeeperMap.values())
      .map(gkData => ({
        goalkeeper: gkData.goalkeeper,
        team_name: gkData.team_name,
        matches_played: gkData.group_matches_played + gkData.knockout_matches_played,
        clean_sheets: gkData.clean_sheets,
        goals_conceded: gkData.total_goals_conceded,
        average_goals_conceded: (gkData.group_matches_played + gkData.knockout_matches_played) > 0 
          ? gkData.total_goals_conceded / (gkData.group_matches_played + gkData.knockout_matches_played)
          : 0,
        knockout_matches_played: gkData.knockout_matches_played,
        knockout_goals_conceded: 0, // Will be calculated separately if needed
        total_matches_for_ranking: gkData.group_matches_played + gkData.knockout_matches_played,
        total_goals_for_ranking: gkData.total_goals_conceded,
        reached_quarterfinals: gkData.reached_quarterfinals
      }))
      .sort((a, b) => {
        // Special rules: first who reaches quarters, then clean sheets, then goal average
        if (a.reached_quarterfinals !== b.reached_quarterfinals) {
          return a.reached_quarterfinals ? -1 : 1;
        }
        if (a.clean_sheets !== b.clean_sheets) {
          return b.clean_sheets - a.clean_sheets;
        }
        return a.average_goals_conceded - b.average_goals_conceded;
      });
  }

  // Verifica se una squadra si è qualificata ai quarti
  static async checkQuarterfinalQualification(teamId: string): Promise<boolean> {
    // TODO: Implementare controllo qualificazione basato su classifica girone
    return false;
  }

  // Calcola scontro diretto tra due squadre
  static async calculateHeadToHead(teamId1: string, teamId2: string, groupId: string): Promise<{
    team1Points: number;
    team2Points: number;
    team1Goals: number;
    team2Goals: number;
  }> {
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .eq('group_id', groupId)
      .or(`and(home_id.eq.${teamId1},away_id.eq.${teamId2}),and(home_id.eq.${teamId2},away_id.eq.${teamId1})`)
      .not('home_score', 'is', null)
      .not('away_score', 'is', null);

    let team1Points = 0, team2Points = 0, team1Goals = 0, team2Goals = 0;

    matches?.forEach(match => {
      const isTeam1Home = match.home_id === teamId1;
      const homeScore = match.home_score!;
      const awayScore = match.away_score!;

      if (isTeam1Home) {
        team1Goals += homeScore;
        team2Goals += awayScore;
        if (homeScore > awayScore) team1Points += 3;
        else if (homeScore < awayScore) team2Points += 3;
        else { team1Points += 1; team2Points += 1; }
      } else {
        team1Goals += awayScore;
        team2Goals += homeScore;
        if (awayScore > homeScore) team1Points += 3;
        else if (awayScore < homeScore) team2Points += 3;
        else { team1Points += 1; team2Points += 1; }
      }
    });

    return { team1Points, team2Points, team1Goals, team2Goals };
  }
}