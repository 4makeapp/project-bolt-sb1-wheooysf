import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, AlertTriangle } from 'lucide-react';
import { TournamentService } from '../services/tournamentService';
import type { Team } from '../lib/supabase';

interface TeamRosterModalProps {
  team: Team;
  onClose: () => void;
  onUpdate: () => void;
}

export const TeamRosterModal: React.FC<TeamRosterModalProps> = ({
  team,
  onClose,
  onUpdate
}) => {
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerIsFigc, setNewPlayerIsFigc] = useState(false);
  const [newPlayerFigcCategory, setNewPlayerFigcCategory] = useState('');
  const [newPlayerJersey, setNewPlayerJersey] = useState<number | undefined>();

  useEffect(() => {
    loadRoster();
  }, [team.id]);

  const loadRoster = async () => {
    try {
      const rosterData = await TournamentService.getTeamRoster(team.id);
      setRoster(rosterData);
    } catch (error) {
      console.error('Error loading roster:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) return;
    
    setAdding(true);
    try {
      await TournamentService.addPlayerToTeam(
        team.id,
        newPlayerName.trim(),
        newPlayerIsFigc,
        newPlayerFigcCategory || undefined,
        newPlayerJersey
      );
      
      await loadRoster();
      setNewPlayerName('');
      setNewPlayerIsFigc(false);
      setNewPlayerFigcCategory('');
      setNewPlayerJersey(undefined);
      onUpdate();
    } catch (error) {
      console.error('Error adding player:', error);
      alert(error instanceof Error ? error.message : 'Errore nell\'aggiunta del giocatore');
    } finally {
      setAdding(false);
    }
  };

  const figcCount = roster.filter(r => r.players?.is_figc).length;
  const canAddFigc = figcCount < 3;
  const canAddPlayer = roster.length < 10;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Rosa {team.name}
            </h2>
            <p className="text-gray-600 mt-1">
              {roster.length}/10 giocatori • {figcCount}/3 tesserati FIGC
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Add Player Form */}
          {canAddPlayer && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-green-600" />
                Aggiungi Giocatore
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Giocatore *
                  </label>
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nome e cognome"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numero Maglia
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={newPlayerJersey || ''}
                    onChange={(e) => setNewPlayerJersey(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Opzionale"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newPlayerIsFigc}
                    onChange={(e) => setNewPlayerIsFigc(e.target.checked)}
                    disabled={!canAddFigc && !newPlayerIsFigc}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Tesserato FIGC {!canAddFigc && !newPlayerIsFigc && '(limite raggiunto)'}
                  </span>
                </label>
                
                {newPlayerIsFigc && (
                  <div className="mt-2">
                    <select
                      value={newPlayerFigcCategory}
                      onChange={(e) => setNewPlayerFigcCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Seleziona categoria FIGC</option>
                      <option value="prima_categoria_plus">Prima Categoria o superiore (Calcio 11)</option>
                      <option value="calcio_a_5">Calcio a 5 FIGC</option>
                      <option value="professional_abroad">Professionista estero</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                onClick={handleAddPlayer}
                disabled={adding || !newPlayerName.trim() || (newPlayerIsFigc && !newPlayerFigcCategory)}
                className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {adding ? 'Aggiunta...' : 'Aggiungi Giocatore'}
              </button>
            </div>
          )}

          {/* Roster List */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Rosa Attuale
              </h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">
                Caricamento rosa...
              </div>
            ) : roster.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nessun giocatore in rosa
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {roster.map((player, index) => (
                  <div key={player.id} className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {player.jersey_number || index + 1}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">
                        {player.players?.name}
                        {player.is_captain && (
                          <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            Capitano
                          </span>
                        )}
                      </div>
                      
                      {player.players?.is_figc && (
                        <div className="text-sm text-orange-600 flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-4 h-4" />
                          Tesserato FIGC
                          {player.players.figc_category && (
                            <span className="text-gray-500">
                              ({player.players.figc_category.replace('_', ' ')})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      Aggiunto: {new Date(player.added_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rules Info */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Regole Rose:</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <div>• Massimo 10 giocatori per squadra</div>
              <div>• Massimo 3 tesserati FIGC per squadra</div>
              <div>• Tesserati FIGC: Prima categoria+ (calcio 11), Calcio a 5 FIGC, Professionisti esteri</div>
              <div>• La rosa può essere integrata anche a torneo in corso</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};