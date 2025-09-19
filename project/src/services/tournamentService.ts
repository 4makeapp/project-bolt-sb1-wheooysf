import { supabase } from '../lib/supabase';
import type { 
  Tournament, Group, Team, Match, Participation, Scorer, GoalkeeperStat,
  KnockoutPhase, KnockoutMatch, Player, TeamRoster, Card
} from '../lib/supabase';

export class TournamentService {
  
  // Create tournament with automatic setup
  static async createTournament(name: string, year: number): Promise<Tournament> {
    try {
      // Start transaction by creating tournament first
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({ name, year })
        .select()
        .single();

      if (tournamentError) throw tournamentError;

      // Create 4 groups (A, B, C, D)
      const groups = await Promise.all(
        ['A', 'B', 'C', 'D'].map(async (groupName) => {
          const { data, error } = await supabase
            .from('groups')
            .insert({ name: groupName, tournament_id: tournament.id })
            .select()
            .single();
          if (error) throw error;
          return data;
        })
      );

      // Create 16 placeholder teams
      const teams = await Promise.all(
        Array.from({ length: 16 }, (_, i) => i + 1).map(async (num) => {
          const { data, error } = await supabase
            .from('teams')
            .insert({ name: `Sq${num}`, is_placeholder: true })
            .select()
            .single();
          if (error) throw error;
          return data;
        })
      );

      // Assign 4 teams to each group
      const participations = [];
      for (let groupIndex = 0; groupIndex < 4; groupIndex++) {
        for (let teamIndex = 0; teamIndex < 4; teamIndex++) {
          const teamIdx = groupIndex * 4 + teamIndex;
          participations.push({
            group_id: groups[groupIndex].id,
            team_id: teams[teamIdx].id
          });
        }
      }

      const { error: participationError } = await supabase
        .from('participations')
        .insert(participations);

      if (participationError) throw participationError;

      // Generate round-robin matches for each group (6 matches per group)
      const matches = [];
      for (const group of groups) {
        const groupTeams = teams.slice(
          groups.indexOf(group) * 4, 
          (groups.indexOf(group) + 1) * 4
        );
        
        let matchDay = 1;
        for (let i = 0; i < groupTeams.length; i++) {
          for (let j = i + 1; j < groupTeams.length; j++) {
            matches.push({
              group_id: group.id,
              home_id: groupTeams[i].id,
              away_id: groupTeams[j].id,
              match_day: matchDay
            });
            matchDay++;
          }
        }
      }

      const { error: matchError } = await supabase
        .from('matches')
        .insert(matches);

      if (matchError) throw matchError;

      return tournament;

    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  }

  // Crea fasi eliminatorie dopo i gironi
  static async createKnockoutPhases(tournamentId: string): Promise<void> {
    try {
      const phases = ['quarterfinals', 'semifinals', 'third_place', 'final'];
      
      for (const phaseType of phases) {
        const { data: phase, error: phaseError } = await supabase
          .from('knockout_phases')
          .insert({ tournament_id: tournamentId, phase_type: phaseType })
          .select()
          .single();

        if (phaseError) throw phaseError;

        // Crea partite per ogni fase
        let matchCount = 0;
        switch (phaseType) {
          case 'quarterfinals':
            matchCount = 4;
            break;
          case 'semifinals':
            matchCount = 2;
            break;
          case 'third_place':
          case 'final':
            matchCount = 1;
            break;
        }

        const matches = Array.from({ length: matchCount }, (_, i) => ({
          phase_id: phase.id,
          match_order: i + 1
        }));

        const { error: matchesError } = await supabase
          .from('knockout_matches')
          .insert(matches);

        if (matchesError) throw matchesError;
      }
    } catch (error) {
      console.error('Error creating knockout phases:', error);
      throw error;
    }
  }

  // Qualifica squadre ai quarti
  static async qualifyTeamsToQuarterfinals(tournamentId: string): Promise<void> {
    try {
      // Prima crea le fasi eliminatorie se non esistono
      const { data: existingPhases } = await supabase
        .from('knockout_phases')
        .select('id')
        .eq('tournament_id', tournamentId);

      if (!existingPhases || existingPhases.length === 0) {
        await this.createKnockoutPhases(tournamentId);
      }

      const groups = await this.getGroups(tournamentId);
      const qualifiedTeams: { team: any; groupName: string; position: number }[] = [];

      // Ottieni le prime due di ogni girone
      for (const group of groups) {
        const { StatsService } = await import('./statsService');
        const standings = await StatsService.getGroupStandings(group.id);
        const firstPlace = standings[0];
        const secondPlace = standings[1];
        
        if (firstPlace) {
          qualifiedTeams.push({ team: firstPlace.team, groupName: group.name, position: 1 });
        }
        if (secondPlace) {
          qualifiedTeams.push({ team: secondPlace.team, groupName: group.name, position: 2 });
        }
      }

      // Ottieni fase quarti
      const { data: quarterPhase } = await supabase
        .from('knockout_phases')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('phase_type', 'quarterfinals')
        .single();

      if (!quarterPhase) return;

      // Ottieni partite quarti
      const { data: quarterMatches } = await supabase
        .from('knockout_matches')
        .select('*')
        .eq('phase_id', quarterPhase.id)
        .order('match_order');

      if (!quarterMatches || quarterMatches.length < 4) return;

      // Accoppiamenti incrociati: 1°A vs 2°B, 1°B vs 2°A, 1°C vs 2°D, 1°D vs 2°C
      const firstPlaces = qualifiedTeams.filter(t => t.position === 1);
      const secondPlaces = qualifiedTeams.filter(t => t.position === 2);

      const matchups = [
        { home: firstPlaces.find(t => t.groupName === 'A'), away: secondPlaces.find(t => t.groupName === 'B') },
        { home: firstPlaces.find(t => t.groupName === 'B'), away: secondPlaces.find(t => t.groupName === 'A') },
        { home: firstPlaces.find(t => t.groupName === 'C'), away: secondPlaces.find(t => t.groupName === 'D') },
        { home: firstPlaces.find(t => t.groupName === 'D'), away: secondPlaces.find(t => t.groupName === 'C') }
      ];

      // Aggiorna partite quarti
      for (let i = 0; i < matchups.length && i < quarterMatches.length; i++) {
        const matchup = matchups[i];
        if (matchup.home && matchup.away) {
          await supabase
            .from('knockout_matches')
            .update({
              home_id: matchup.home.team.id,
              away_id: matchup.away.team.id
            })
            .eq('id', quarterMatches[i].id);
        }
      }

    } catch (error) {
      console.error('Error qualifying teams:', error);
      throw error;
    }
  }

  // Update team name and placeholder status
  static async updateTeam(teamId: string, name: string, logoUrl?: string): Promise<Team> {
    const isPlaceholder = name.startsWith('Sq') && /^Sq\d+$/.test(name);
    
    const { data, error } = await supabase
      .from('teams')
      .update({ 
        name, 
        logo_url: logoUrl || null, 
        is_placeholder: isPlaceholder,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update match result with scorers and goalkeeper stats
  static async updateMatchResult(
    matchId: string, 
    homeScore: number, 
    awayScore: number,
    scorersHome: string,
    scorersAway: string
  ): Promise<void> {
    try {
      // Update match result
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          played_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId);

      if (matchError) throw matchError;

      // Get match details for team IDs
      const { data: match, error: matchFetchError } = await supabase
        .from('matches')
        .select(`
          home_id, 
          away_id,
          home_team:teams!matches_home_id_fkey(name),
          away_team:teams!matches_away_id_fkey(name)
        `)
        .eq('id', matchId)
        .single();

      if (matchFetchError) throw matchFetchError;

      // Create or get goalkeepers for both teams
      const homeGoalkeeperName = `P1_${match.home_team.name}`;
      const awayGoalkeeperName = `P1_${match.away_team.name}`;

      // Check if goalkeepers exist, if not create them
      let { data: homeGK } = await supabase
        .from('goalkeepers')
        .select('id')
        .eq('name', homeGoalkeeperName)
        .eq('team_id', match.home_id)
        .single();

      if (!homeGK) {
        const { data: newHomeGK, error: homeGKError } = await supabase
          .from('goalkeepers')
          .insert({
            name: homeGoalkeeperName,
            team_id: match.home_id
          })
          .select('id')
          .single();
        
        if (homeGKError) throw homeGKError;
        homeGK = newHomeGK;
      }

      let { data: awayGK } = await supabase
        .from('goalkeepers')
        .select('id')
        .eq('name', awayGoalkeeperName)
        .eq('team_id', match.away_id)
        .single();

      if (!awayGK) {
        const { data: newAwayGK, error: awayGKError } = await supabase
          .from('goalkeepers')
          .insert({
            name: awayGoalkeeperName,
            team_id: match.away_id
          })
          .select('id')
          .single();
        
        if (awayGKError) throw awayGKError;
        awayGK = newAwayGK;
      }

      // Clear existing scorers
      await supabase.from('scorers').delete().eq('match_id', matchId);

      // Parse and insert home scorers
      if (scorersHome.trim()) {
        const homeScorers = this.parseScorers(scorersHome, match.home_id);
        if (homeScorers.length > 0) {
          const { error: scorersHomeError } = await supabase
            .from('scorers')
            .insert(homeScorers.map(s => ({ ...s, match_id: matchId })));
          if (scorersHomeError) throw scorersHomeError;
        }
      }

      // Parse and insert away scorers
      if (scorersAway.trim()) {
        const awayScorers = this.parseScorers(scorersAway, match.away_id);
        if (awayScorers.length > 0) {
          const { error: scorersAwayError } = await supabase
            .from('scorers')
            .insert(awayScorers.map(s => ({ ...s, match_id: matchId })));
          if (scorersAwayError) throw scorersAwayError;
        }
      }

      // Update goalkeeper stats
      await supabase.from('goalkeeper_stats').delete().eq('match_id', matchId);

      const goalkeeperStats = [
        {
          goalkeeper_id: homeGK.id,
          match_id: matchId,
          goals_conceded: awayScore,
          clean_sheet: awayScore === 0
        },
        {
          goalkeeper_id: awayGK.id,
          match_id: matchId,
          goals_conceded: homeScore,
          clean_sheet: homeScore === 0
        }
      ];

      const { error: goalkeeperError } = await supabase
        .from('goalkeeper_stats')
        .insert(goalkeeperStats);

      if (goalkeeperError) throw goalkeeperError;

    } catch (error) {
      console.error('Error updating match result:', error);
      throw error;
    }
  }

  // Update knockout match result and advance winner
  static async updateKnockoutMatchResult(
    matchId: string,
    homeScore: number,
    awayScore: number,
    homePenalties: number | null,
    awayPenalties: number | null,
    scorersHome: string,
    scorersAway: string
  ): Promise<void> {
    try {
      // Get match details
      const { data: match, error: matchFetchError } = await supabase
        .from('knockout_matches')
        .select(`
          *,
          home_team:teams!knockout_matches_home_id_fkey(*),
          away_team:teams!knockout_matches_away_id_fkey(*),
          knockout_phases(phase_type, tournament_id)
        `)
        .eq('id', matchId)
        .single();

      if (matchFetchError) throw matchFetchError;

      // Determine winner
      let winnerId: string;
      if (homeScore > awayScore) {
        winnerId = match.home_id;
      } else if (awayScore > homeScore) {
        winnerId = match.away_id;
      } else {
        // Pareggio - decide ai rigori
        if (homePenalties === null || awayPenalties === null) {
          throw new Error('Calci di rigore obbligatori in caso di pareggio');
        }
        winnerId = homePenalties > awayPenalties ? match.home_id : match.away_id;
      }

      // Update match result
      const { error: matchError } = await supabase
        .from('knockout_matches')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          home_penalties: homePenalties,
          away_penalties: awayPenalties,
          winner_id: winnerId,
          played_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId);

      if (matchError) throw matchError;

      // Create or get goalkeepers for both teams
      const homeGoalkeeperName = `P1_${match.home_team.name}`;
      const awayGoalkeeperName = `P1_${match.away_team.name}`;

      // Check if goalkeepers exist, if not create them
      let { data: homeGK } = await supabase
        .from('goalkeepers')
        .select('id')
        .eq('name', homeGoalkeeperName)
        .eq('team_id', match.home_id)
        .single();

      if (!homeGK) {
        const { data: newHomeGK, error: homeGKError } = await supabase
          .from('goalkeepers')
          .insert({
            name: homeGoalkeeperName,
            team_id: match.home_id
          })
          .select('id')
          .single();
        
        if (homeGKError) throw homeGKError;
        homeGK = newHomeGK;
      }

      let { data: awayGK } = await supabase
        .from('goalkeepers')
        .select('id')
        .eq('name', awayGoalkeeperName)
        .eq('team_id', match.away_id)
        .single();

      if (!awayGK) {
        const { data: newAwayGK, error: awayGKError } = await supabase
          .from('goalkeepers')
          .insert({
            name: awayGoalkeeperName,
            team_id: match.away_id
          })
          .select('id')
          .single();
        
        if (awayGKError) throw awayGKError;
        awayGK = newAwayGK;
      }

      // Clear existing scorers for this knockout match
      await supabase.from('scorers').delete().eq('knockout_match_id', matchId);

      // Parse and insert home scorers
      if (scorersHome.trim()) {
        const homeScorers = this.parseScorers(scorersHome, match.home_id);
        if (homeScorers.length > 0) {
          const { error: scorersHomeError } = await supabase
            .from('scorers')
            .insert(homeScorers.map(s => ({ ...s, knockout_match_id: matchId })));
          if (scorersHomeError) throw scorersHomeError;
        }
      }

      // Parse and insert away scorers
      if (scorersAway.trim()) {
        const awayScorers = this.parseScorers(scorersAway, match.away_id);
        if (awayScorers.length > 0) {
          const { error: scorersAwayError } = await supabase
            .from('scorers')
            .insert(awayScorers.map(s => ({ ...s, knockout_match_id: matchId })));
          if (scorersAwayError) throw scorersAwayError;
        }
      }

      // Update goalkeeper stats for knockout match
      await supabase.from('goalkeeper_stats').delete().eq('knockout_match_id', matchId);

      const goalkeeperStats = [
        {
          goalkeeper_id: homeGK.id,
          knockout_match_id: matchId,
          goals_conceded: awayScore,
          clean_sheet: awayScore === 0
        },
        {
          goalkeeper_id: awayGK.id,
          knockout_match_id: matchId,
          goals_conceded: homeScore,
          clean_sheet: homeScore === 0
        }
      ];

      const { error: goalkeeperError } = await supabase
        .from('goalkeeper_stats')
        .insert(goalkeeperStats);

      if (goalkeeperError) throw goalkeeperError;

      // Advance winner to next phase
      await this.advanceWinnerToNextPhase(match, winnerId);

    } catch (error) {
      console.error('Error updating knockout match result:', error);
      throw error;
    }
  }

  // Advance winner to next phase
  private static async advanceWinnerToNextPhase(match: any, winnerId: string): Promise<void> {
    const phaseType = match.knockout_phases.phase_type;
    const tournamentId = match.knockout_phases.tournament_id;
    
    try {
      if (phaseType === 'quarterfinals') {
        // Advance to semifinals
        const { data: semifinalPhase } = await supabase
          .from('knockout_phases')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('phase_type', 'semifinals')
          .single();

        if (semifinalPhase) {
          // Find the correct semifinal match based on quarter match order
          const semifinalMatchOrder = Math.ceil(match.match_order / 2);
          
          const { data: semifinalMatch } = await supabase
            .from('knockout_matches')
            .select('*')
            .eq('phase_id', semifinalPhase.id)
            .eq('match_order', semifinalMatchOrder)
            .single();

          if (semifinalMatch) {
            // Determine if winner goes to home or away
            const isOddQuarter = match.match_order % 2 === 1;
            const updateField = isOddQuarter ? 'home_id' : 'away_id';
            
            await supabase
              .from('knockout_matches')
              .update({ [updateField]: winnerId })
              .eq('id', semifinalMatch.id);
          }
        }
      } else if (phaseType === 'semifinals') {
        // Advance to final or third place
        const { data: finalPhase } = await supabase
          .from('knockout_phases')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('phase_type', 'final')
          .single();

        const { data: thirdPlacePhase } = await supabase
          .from('knockout_phases')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('phase_type', 'third_place')
          .single();

        if (finalPhase && thirdPlacePhase) {
          // Winner goes to final
          const { data: finalMatch } = await supabase
            .from('knockout_matches')
            .select('*')
            .eq('phase_id', finalPhase.id)
            .single();

          // Loser goes to third place
          const { data: thirdPlaceMatch } = await supabase
            .from('knockout_matches')
            .select('*')
            .eq('phase_id', thirdPlacePhase.id)
            .single();

          if (finalMatch && thirdPlaceMatch) {
            const loserId = winnerId === match.home_id ? match.away_id : match.home_id;
            
            // Assign to final
            const finalField = match.match_order === 1 ? 'home_id' : 'away_id';
            await supabase
              .from('knockout_matches')
              .update({ [finalField]: winnerId })
              .eq('id', finalMatch.id);

            // Assign to third place
            const thirdField = match.match_order === 1 ? 'home_id' : 'away_id';
            await supabase
              .from('knockout_matches')
              .update({ [thirdField]: loserId })
              .eq('id', thirdPlaceMatch.id);
          }
        }
      }
    } catch (error) {
      console.error('Error advancing winner to next phase:', error);
    }
  }

  // Parse scorers string format "Nome-Goals;Nome2-Goals"
  private static parseScorers(scorersString: string, teamId: string) {
    return scorersString.split(';').map(scorer => {
      const [playerName, goals] = scorer.trim().split('-');
      return {
        team_id: teamId,
        player_name: playerName.trim(),
        goals: parseInt(goals.trim(), 10)
      };
    }).filter(s => s.player_name && s.goals > 0);
  }

  // Get tournaments
  static async getTournaments(): Promise<Tournament[]> {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Get groups for tournament
  static async getGroups(tournamentId: string): Promise<Group[]> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // Get teams in group
  static async getTeamsInGroup(groupId: string): Promise<Team[]> {
    const { data, error } = await supabase
      .from('participations')
      .select(`
        teams (*)
      `)
      .eq('group_id', groupId);

    if (error) throw error;
    return data?.map(p => p.teams).filter(Boolean) || [];
  }

  // Get matches for group
  static async getMatchesForGroup(groupId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_id_fkey(*),
        away_team:teams!matches_away_id_fkey(*),
        groups(*)
      `)
      .eq('group_id', groupId)
      .order('match_day');

    if (error) throw error;
    return data || [];
  }

  // Gestione giocatori e rose
  static async addPlayerToTeam(
    teamId: string, 
    playerName: string, 
    isFigc: boolean = false,
    figcCategory?: string,
    jerseyNumber?: number
  ): Promise<void> {
    try {
      // Verifica limiti rosa (max 10 giocatori, max 3 FIGC)
      const { data: currentRoster } = await supabase
        .from('team_rosters')
        .select(`
          *,
          players(is_figc)
        `)
        .eq('team_id', teamId);

      if (currentRoster && currentRoster.length >= 10) {
        throw new Error('Rosa completa: massimo 10 giocatori per squadra');
      }

      const figcCount = currentRoster?.filter(r => r.players?.is_figc).length || 0;
      if (isFigc && figcCount >= 3) {
        throw new Error('Limite FIGC raggiunto: massimo 3 tesserati FIGC per squadra');
      }

      // Crea giocatore
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          name: playerName,
          is_figc: isFigc,
          figc_category: figcCategory
        })
        .select()
        .single();

      if (playerError) throw playerError;

      // Aggiungi alla rosa
      const { error: rosterError } = await supabase
        .from('team_rosters')
        .insert({
          team_id: teamId,
          player_id: player.id,
          jersey_number: jerseyNumber
        });

      if (rosterError) throw rosterError;

    } catch (error) {
      console.error('Error adding player to team:', error);
      throw error;
    }
  }

  // Ottieni rosa squadra
  static async getTeamRoster(teamId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('team_rosters')
      .select(`
        *,
        players(*)
      `)
      .eq('team_id', teamId)
      .order('jersey_number');

    if (error) throw error;
    return data || [];
  }

  // Ottieni fasi eliminatorie
  static async getKnockoutPhases(tournamentId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('knockout_phases')
      .select(`
        *,
        knockout_matches(
          *,
          home_team:teams!knockout_matches_home_id_fkey(*),
          away_team:teams!knockout_matches_away_id_fkey(*),
          winner:teams!knockout_matches_winner_id_fkey(*)
        )
      `)
      .eq('tournament_id', tournamentId)
      .order('created_at');

    if (error) throw error;
    return data || [];
  }

  // Get all goalkeepers
  static async getAllGoalkeepers(): Promise<any[]> {
    const { data, error } = await supabase
      .from('goalkeepers')
      .select(`
        *,
        teams(*)
      `);

    if (error) throw error;
    return data || [];
  }
}