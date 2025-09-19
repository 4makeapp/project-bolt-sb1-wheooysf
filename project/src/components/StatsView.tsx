import React, { useState, useEffect } from 'react';
import { ArrowLeft, Target, Shield, Trophy } from 'lucide-react';
import { StatsService } from '../services/statsService';
import type { Tournament, PlayerScorer, GoalkeeperStats } from '../lib/supabase';

interface StatsViewProps {
  tournament: Tournament;
  onBack: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ tournament, onBack }) => {
  const [activeTab, setActiveTab] = useState<'scorers' | 'goalkeepers'>('scorers');
  const [topScorers, setTopScorers] = useState<PlayerScorer[]>([]);
  const [goalkeeperStats, setGoalkeeperStats] = useState<GoalkeeperStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [scorersData, goalkeeperData] = await Promise.all([
        StatsService.getTopScorers(),
        StatsService.getGoalkeeperStats()
      ]);
      
      setTopScorers(scorersData);
      setGoalkeeperStats(goalkeeperData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Caricamento statistiche...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Statistiche
              </h1>
              <p className="text-gray-600">{tournament.name} - Anno {tournament.year}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('scorers')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'scorers'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Target className="w-5 h-5" />
              Capocannonieri
            </button>
            
            <button
              onClick={() => setActiveTab('goalkeepers')}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'goalkeepers'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Shield className="w-5 h-5" />
              Migliori Portieri
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {activeTab === 'scorers' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-600" />
                Classifica Capocannonieri
              </h2>
              
              {topScorers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4">Pos</th>
                        <th className="text-left py-3 px-4">Giocatore</th>
                        <th className="text-left py-3 px-4">Squadra</th>
                        <th className="text-center py-3 px-4">Gol</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topScorers.map((scorer, index) => (
                        <tr
                          key={`${scorer.player_name}-${scorer.team_name}`}
                          className={`border-b border-gray-100 ${
                            index === 0 ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <td className="py-4 px-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-yellow-500 text-white' :
                              index === 1 ? 'bg-gray-400 text-white' :
                              index === 2 ? 'bg-orange-600 text-white' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-gray-800">
                              {scorer.player_name}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600">
                            {scorer.team_name}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {scorer.total_goals}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    Nessun marcatore registrato ancora
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    I marcatori appariranno qui dopo aver inserito i risultati delle partite
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'goalkeepers' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Classifica Portieri
              </h2>
              
              {goalkeeperStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4">Pos</th>
                        <th className="text-left py-3 px-4">Portiere</th>
                        <th className="text-left py-3 px-4">Squadra</th>
                        <th className="text-center py-3 px-4">Partite</th>
                        <th className="text-center py-3 px-4">Porte Inviolate</th>
                        <th className="text-center py-3 px-4">Gol Subiti</th>
                        <th className="text-center py-3 px-4">Media Gol</th>
                      </tr>
                    </thead>
                    <tbody>
                      {goalkeeperStats.map((gk, index) => (
                        <tr
                          key={gk.goalkeeper.id}
                          className={`border-b border-gray-100 ${
                            index === 0 ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="py-4 px-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-blue-500 text-white' :
                              index === 1 ? 'bg-gray-400 text-white' :
                              index === 2 ? 'bg-orange-600 text-white' :
                              'bg-gray-200 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-gray-800">
                              {gk.goalkeeper.name}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600">
                            {gk.team_name}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {gk.matches_played}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="text-green-600 font-semibold">
                              {gk.clean_sheets}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="text-red-600">
                              {gk.goals_conceded}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="font-semibold">
                              {gk.average_goals_conceded.toFixed(2)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    Nessuna statistica portieri disponibile
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Le statistiche appariranno qui dopo aver inserito i risultati delle partite
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <Target className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <div className="text-2xl font-bold text-gray-800">
              {topScorers.reduce((sum, scorer) => sum + scorer.total_goals, 0)}
            </div>
            <div className="text-gray-600">Gol Totali</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <div className="text-2xl font-bold text-gray-800">
              {goalkeeperStats.reduce((sum, gk) => sum + gk.clean_sheets, 0)}
            </div>
            <div className="text-gray-600">Porte Inviolate</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <Trophy className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <div className="text-2xl font-bold text-gray-800">
              {topScorers.length > 0 ? topScorers[0].total_goals : 0}
            </div>
            <div className="text-gray-600">Miglior Marcatore</div>
          </div>
        </div>
      </div>
    </div>
  );
};