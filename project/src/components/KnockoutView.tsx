import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Target, Clock } from 'lucide-react';
import { TournamentService } from '../services/tournamentService';
import { KnockoutResultModal } from './KnockoutResultModal';
import type { Tournament, KnockoutPhase } from '../lib/supabase';

interface KnockoutViewProps {
  tournament: Tournament;
  onBack: () => void;
}

export const KnockoutView: React.FC<KnockoutViewProps> = ({ tournament, onBack }) => {
  const [phases, setPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  useEffect(() => {
    loadKnockoutData();
  }, [tournament.id]);

  const loadKnockoutData = async () => {
    try {
      const phasesData = await TournamentService.getKnockoutPhases(tournament.id);
      setPhases(phasesData);
    } catch (error) {
      console.error('Error loading knockout data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQualifyTeams = async () => {
    try {
      await TournamentService.qualifyTeamsToQuarterfinals(tournament.id);
      await loadKnockoutData();
    } catch (error) {
      console.error('Error qualifying teams:', error);
    }
  };

  const getPhaseTitle = (phaseType: string) => {
    switch (phaseType) {
      case 'quarterfinals': return 'Quarti di Finale';
      case 'semifinals': return 'Semifinali';
      case 'third_place': return 'Finale 3° Posto';
      case 'final': return 'Finale';
      default: return phaseType;
    }
  };

  const getMatchStatus = (match: any) => {
    if (match.winner_id) {
      const winnerName = match.winner?.name || 'Vincitore';
      return {
        status: 'completed',
        text: `${match.home_score || 0} - ${match.away_score || 0}${
          match.home_penalties !== null ? ` (${match.home_penalties}-${match.away_penalties} dcr)` : ''
        }`,
        winner: winnerName,
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    } else if (match.home_id && match.away_id) {
      return {
        status: 'scheduled',
        text: 'Da giocare',
        className: 'bg-blue-100 text-blue-600 border-blue-200'
      };
    } else {
      return {
        status: 'waiting',
        text: 'In attesa qualificazioni',
        className: 'bg-gray-100 text-gray-600 border-gray-200'
      };
    }
  };

  const handleMatchResult = async () => {
    await loadKnockoutData();
    setSelectedMatch(null);
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Caricamento fase eliminatoria...</div>
      </div>
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
                  Fase Eliminatoria
                </h1>
                <p className="text-gray-600">{tournament.name} - Anno {tournament.year}</p>
              </div>
            </div>

            <button
              onClick={handleQualifyTeams}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              <Trophy className="w-5 h-5" />
              Qualifica Squadre
            </button>
          </div>
        </div>

        {/* Match Result Modal */}
        {selectedMatch && (
          <KnockoutResultModal
            match={selectedMatch}
            onClose={() => setSelectedMatch(null)}
            onSave={handleMatchResult}
          />
        )}

        {/* Phases */}
        <div className="space-y-8">
          {phases.map((phase) => (
            <div key={phase.id} className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-600" />
                {getPhaseTitle(phase.phase_type)}
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                {phase.knockout_matches?.map((match: any, index: number) => {
                  const status = getMatchStatus(match);
                  
                  return (
                    <div
                      key={match.id}
                      className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${
                        match.home_id && match.away_id && !match.winner_id ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => {
                        if (match.home_id && match.away_id && !match.winner_id) {
                          setSelectedMatch(match);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-gray-500">
                          {getPhaseTitle(phase.phase_type)} {index + 1}
                        </div>
                        <div className={`px-3 py-1 rounded-full border text-sm font-medium ${status.className}`}>
                          {status.text}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Home Team */}
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {match.home_team?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="font-semibold flex-1">
                            {match.home_team?.name || 'TBD'}
                          </span>
                          {match.home_score !== null && (
                            <div className="text-2xl font-bold text-green-600">
                              {match.home_score}
                            </div>
                          )}
                        </div>

                        <div className="text-center text-gray-400 font-bold">VS</div>

                        {/* Away Team */}
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {match.away_team?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="font-semibold flex-1">
                            {match.away_team?.name || 'TBD'}
                          </span>
                          {match.away_score !== null && (
                            <div className="text-2xl font-bold text-green-600">
                              {match.away_score}
                            </div>
                          )}
                        </div>

                        {/* Winner */}
                        {status.winner && (
                          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-center">
                            <div className="text-sm text-yellow-800">
                              <Trophy className="w-4 h-4 inline mr-1" />
                              Vincitore: <strong>{status.winner}</strong>
                            </div>
                          </div>
                        )}

                        {/* Penalties */}
                        {match.home_penalties !== null && (
                          <div className="text-center text-sm text-gray-600">
                            Calci di rigore: {match.home_penalties} - {match.away_penalties}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Phase Rules */}
              {phase.phase_type === 'quarterfinals' && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Accoppiamenti Quarti:</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>• 1° Girone A vs 2° Girone B</div>
                    <div>• 1° Girone B vs 2° Girone A</div>
                    <div>• 1° Girone C vs 2° Girone D</div>
                    <div>• 1° Girone D vs 2° Girone C</div>
                  </div>
                </div>
              )}

              {phase.phase_type === 'semifinals' && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Regole Semifinali:</h4>
                  <div className="text-sm text-green-700">
                    In caso di parità, si procede con 5 calci di rigore
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tournament Rules */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Regole Fase Eliminatoria
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Durata Partite:</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• 2 tempi da 10 minuti non effettivi</li>
                <li>• In caso di parità: 5 calci di rigore</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Qualificazioni:</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Prime 2 squadre di ogni girone</li>
                <li>• Accoppiamenti incrociati ai quarti</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Miglior Portiere:</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Deve raggiungere i quarti di finale</li>
                <li>• Meno reti subite (gironi + quarti)</li>
                <li>• In caso di parità: semifinali, finale</li>
                <li>• Ultimo criterio: età (più giovane)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Capocannoniere:</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Maggior numero di reti totali</li>
                <li>• In caso di parità: criteri da definire</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};