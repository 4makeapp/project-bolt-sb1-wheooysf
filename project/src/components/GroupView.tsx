import React, { useState, useEffect } from 'react';
import { Users, Calendar, Trophy, Target } from 'lucide-react';
import { TournamentService } from '../services/tournamentService';
import { StatsService } from '../services/statsService';
import { MatchResultModal } from './MatchResultModal';
import type { Group, Team, Match, TeamStats } from '../lib/supabase';

interface GroupViewProps {
  group: Group;
  onTeamUpdate: (teamId: string, name: string, logoUrl?: string) => void;
  onDataUpdate: () => void;
  onTeamRosterClick: (team: Team) => void;
}

export const GroupView: React.FC<GroupViewProps> = ({ 
  group, 
  onTeamUpdate,
  onDataUpdate,
  onTeamRosterClick
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [standings, setStandings] = useState<TeamStats[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    loadGroupData();
  }, [group.id]);

  const loadGroupData = async () => {
    try {
      const [teamsData, matchesData, standingsData] = await Promise.all([
        TournamentService.getTeamsInGroup(group.id),
        TournamentService.getMatchesForGroup(group.id),
        StatsService.getGroupStandings(group.id)
      ]);
      
      setTeams(teamsData);
      setMatches(matchesData);
      setStandings(standingsData);
    } catch (error) {
      console.error('Error loading group data:', error);
    }
  };

  const handleTeamNameEdit = (team: Team) => {
    setEditingTeam(team.id);
    setTempName(team.name);
  };

  const handleTeamNameSave = async (teamId: string) => {
    if (tempName.trim()) {
      await onTeamUpdate(teamId, tempName.trim());
      await loadGroupData();
    }
    setEditingTeam(null);
    setTempName('');
  };

  const handleMatchResult = async () => {
    await loadGroupData();
    await onDataUpdate();
    setSelectedMatch(null);
  };

  const getMatchStatus = (match: any) => {
    if (match.home_score !== null && match.away_score !== null) {
      return {
        status: 'completed',
        text: `${match.home_score} - ${match.away_score}`,
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    }
    return {
      status: 'scheduled',
      text: 'Da giocare',
      className: 'bg-gray-100 text-gray-600 border-gray-200'
    };
  };

  return (
    <div className="space-y-6">
      {/* Teams Management */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          Squadre Girone {group.name}
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <div
              key={team.id}
              className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {team.name.charAt(0).toUpperCase()}
              </div>
              
              <div className="flex-1">
                {editingTeam === team.id ? (
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={() => handleTeamNameSave(team.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTeamNameSave(team.id);
                      if (e.key === 'Escape') {
                        setEditingTeam(null);
                        setTempName('');
                      }
                    }}
                    className="w-full px-2 py-1 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                ) : (
                  <span
                    className={`cursor-pointer hover:text-blue-600 ${
                      team.is_placeholder ? 'text-gray-500 italic' : 'font-semibold'
                    }`}
                    onClick={() => handleTeamNameEdit(team)}
                  >
                    {team.name}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onTeamRosterClick(team)}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Rosa
                </button>
                <div className="text-xs text-gray-500">
                  {team.is_placeholder ? 'Placeholder' : 'Confermata'}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <strong>Suggerimento:</strong> Clicca sui nomi delle squadre per modificarli. 
          Le squadre con nomi diversi da "Sq*\" saranno automaticamente confermate.
        </div>
      </div>

      {/* Standings */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-600" />
          Classifica Girone {group.name}
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2">Pos</th>
                <th className="text-left py-2 px-4">Squadra</th>
                <th className="text-center py-2 px-2">G</th>
                <th className="text-center py-2 px-2">V</th>
                <th className="text-center py-2 px-2">N</th>
                <th className="text-center py-2 px-2">P</th>
                <th className="text-center py-2 px-2">GF</th>
                <th className="text-center py-2 px-2">GS</th>
                <th className="text-center py-2 px-2">DR</th>
                <th className="text-center py-2 px-2 font-semibold">Pt</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, index) => (
                <tr
                  key={team.team.id}
                  className={`border-b border-gray-100 ${
                    index < 2 ? 'bg-green-50' : ''
                  }`}
                >
                  <td className="py-3 px-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < 2 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {team.team.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={team.team.is_placeholder ? 'text-gray-500 italic' : 'font-semibold'}>
                        {team.team.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">{team.played}</td>
                  <td className="py-3 px-2 text-center text-green-600 font-semibold">{team.won}</td>
                  <td className="py-3 px-2 text-center text-yellow-600">{team.drawn}</td>
                  <td className="py-3 px-2 text-center text-red-600">{team.lost}</td>
                  <td className="py-3 px-2 text-center">{team.goals_for}</td>
                  <td className="py-3 px-2 text-center">{team.goals_against}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={team.goal_difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center font-bold text-lg">{team.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {standings.length > 0 && (
          <div className="mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
              <span>Le prime due squadre si qualificano ai quarti di finale</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Criteri classifica: Punti → Scontro diretto → Diff. reti → Gol fatti → Gol subiti → Ammonizioni → Sorteggio
            </div>
          </div>
        )}
      </div>

      {/* Matches */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-green-600" />
          Partite Girone {group.name}
        </h2>
        
        <div className="space-y-3">
          {matches.map((match) => {
            const status = getMatchStatus(match);
            
            return (
              <div
                key={match.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedMatch(match)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-sm text-gray-500 w-16">
                    Partita {match.match_day}
                  </div>
                  
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {match.home_team.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`truncate ${match.home_team.is_placeholder ? 'text-gray-500 italic' : 'font-semibold'}`}>
                        {match.home_team.name}
                      </span>
                    </div>
                    
                    <div className="text-gray-400 font-bold">VS</div>
                    
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {match.away_team.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`truncate ${match.away_team.is_placeholder ? 'text-gray-500 italic' : 'font-semibold'}`}>
                        {match.away_team.name}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className={`px-3 py-1 rounded-full border text-sm font-medium ${status.className}`}>
                  {status.text}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <strong>Suggerimento:</strong> Clicca su una partita per inserire il risultato
        </div>
      </div>

      {/* Match Result Modal */}
      {selectedMatch && (
        <MatchResultModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onSave={handleMatchResult}
        />
      )}
    </div>
  );
};