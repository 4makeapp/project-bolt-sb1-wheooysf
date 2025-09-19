import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Edit3, Calendar, BarChart3, Trophy } from 'lucide-react';
import { TournamentService } from '../services/tournamentService';
import { GroupView } from './GroupView';
import { StatsView } from './StatsView';
import { KnockoutView } from './KnockoutView';
import { TeamRosterModal } from './TeamRosterModal';
import type { Tournament, Group, Team } from '../lib/supabase';

interface TournamentManagerProps {
  tournament: Tournament;
  onBack: () => void;
}

export const TournamentManager: React.FC<TournamentManagerProps> = ({ 
  tournament, 
  onBack 
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [showKnockout, setShowKnockout] = useState(false);
  const [selectedTeamForRoster, setSelectedTeamForRoster] = useState<Team | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTournamentData();
  }, [tournament.id]);

  const loadTournamentData = async () => {
    try {
      const groupsData = await TournamentService.getGroups(tournament.id);
      setGroups(groupsData);
      
      if (groupsData.length > 0 && !selectedGroup) {
        setSelectedGroup(groupsData[0]);
      }
      
      // Load all teams for stats
      const allTeams: Team[] = [];
      for (const group of groupsData) {
        const groupTeams = await TournamentService.getTeamsInGroup(group.id);
        allTeams.push(...groupTeams);
      }
      setTeams(allTeams);
      
    } catch (error) {
      console.error('Error loading tournament data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamUpdate = async (teamId: string, name: string, logoUrl?: string) => {
    try {
      await TournamentService.updateTeam(teamId, name, logoUrl);
      await loadTournamentData(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Caricamento torneo...</div>
      </div>
    );
  }

  if (showStats) {
    return (
      <StatsView 
        tournament={tournament}
        onBack={() => setShowStats(false)}
      />
    );
  }

  if (showKnockout) {
    return (
      <KnockoutView 
        tournament={tournament}
        onBack={() => setShowKnockout(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  {tournament.name}
                </h1>
                <p className="text-gray-600">Anno {tournament.year} • 16 squadre • 4 gironi</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowKnockout(true)}
                className="flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <Trophy className="w-5 h-5" />
                Eliminatorie
              </button>
              
              <button
                onClick={() => setShowStats(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                Statistiche
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 overflow-x-auto">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                  selectedGroup?.id === group.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Girone {group.name}
              </button>
            ))}
          </div>
        </div>

        {/* Group Content */}
        {selectedGroup && (
          <GroupView
            group={selectedGroup}
            onTeamUpdate={handleTeamUpdate}
            onDataUpdate={loadTournamentData}
            onTeamRosterClick={setSelectedTeamForRoster}
          />
        )}

        {/* Team Roster Modal */}
        {selectedTeamForRoster && (
          <TeamRosterModal
            team={selectedTeamForRoster}
            onClose={() => setSelectedTeamForRoster(null)}
            onUpdate={loadTournamentData}
          />
        )}
      </div>
    </div>
  );
};