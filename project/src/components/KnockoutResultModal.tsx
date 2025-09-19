import React, { useState } from 'react';
import { X, Target, Trophy } from 'lucide-react';
import { TournamentService } from '../services/tournamentService';

interface KnockoutResultModalProps {
  match: any;
  onClose: () => void;
  onSave: () => void;
}

export const KnockoutResultModal: React.FC<KnockoutResultModalProps> = ({
  match,
  onClose,
  onSave
}) => {
  const [homeScore, setHomeScore] = useState(match.home_score || 0);
  const [awayScore, setAwayScore] = useState(match.away_score || 0);
  const [homePenalties, setHomePenalties] = useState(match.home_penalties || 0);
  const [awayPenalties, setAwayPenalties] = useState(match.away_penalties || 0);
  const [scorersHome, setScorersHome] = useState('');
  const [scorersAway, setScorersAway] = useState('');
  const [saving, setSaving] = useState(false);

  const isDraw = homeScore === awayScore;
  const needsPenalties = isDraw && homeScore > 0;

  const handleSave = async () => {
    // Validazione: se pareggio, servono i rigori
    if (isDraw && (homePenalties === awayPenalties)) {
      alert('In caso di pareggio, una squadra deve vincere ai rigori');
      return;
    }

    setSaving(true);
    try {
      await TournamentService.updateKnockoutMatchResult(
        match.id,
        homeScore,
        awayScore,
        isDraw ? homePenalties : null,
        isDraw ? awayPenalties : null,
        scorersHome,
        scorersAway
      );
      
      onSave();
    } catch (error) {
      console.error('Error saving knockout result:', error);
      alert('Errore nel salvataggio del risultato');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Risultato Eliminatoria
            </h2>
            <p className="text-gray-600 mt-1">
              {match.home_team?.name || 'TBD'} vs {match.away_team?.name || 'TBD'}
            </p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Score Input */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Punteggio Tempi Regolamentari
            </h3>
            
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="font-semibold mb-2">{match.home_team?.name || 'TBD'}</div>
                <input
                  type="number"
                  min="0"
                  value={homeScore}
                  onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                  className="w-20 h-16 text-3xl font-bold text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="text-3xl font-bold text-gray-400">-</div>
              
              <div className="text-center">
                <div className="font-semibold mb-2">{match.away_team?.name || 'TBD'}</div>
                <input
                  type="number"
                  min="0"
                  value={awayScore}
                  onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                  className="w-20 h-16 text-3xl font-bold text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Penalties (if draw) */}
          {isDraw && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Calci di Rigore (Pareggio)
              </h3>
              
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="font-semibold mb-2">{match.home_team?.name || 'TBD'}</div>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={homePenalties}
                    onChange={(e) => setHomePenalties(parseInt(e.target.value) || 0)}
                    className="w-20 h-16 text-3xl font-bold text-center border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                
                <div className="text-3xl font-bold text-yellow-600">-</div>
                
                <div className="text-center">
                  <div className="font-semibold mb-2">{match.away_team?.name || 'TBD'}</div>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={awayPenalties}
                    onChange={(e) => setAwayPenalties(parseInt(e.target.value) || 0)}
                    className="w-20 h-16 text-3xl font-bold text-center border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="mt-4 text-sm text-yellow-700 text-center">
                In caso di pareggio, una squadra deve vincere ai rigori (max 5 per squadra)
              </div>
            </div>
          )}

          {/* Scorers */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Marcatori</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marcatori {match.home_team?.name || 'Casa'}
                </label>
                <textarea
                  value={scorersHome}
                  onChange={(e) => setScorersHome(e.target.value)}
                  placeholder="Formato: Rossi-2;Verdi-1 (Nome-Gol;Nome2-Gol...)"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marcatori {match.away_team?.name || 'Ospite'}
                </label>
                <textarea
                  value={scorersAway}
                  onChange={(e) => setScorersAway(e.target.value)}
                  placeholder="Formato: Bianchi-1;Neri-2 (Nome-Gol;Nome2-Gol...)"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Goalkeeper Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Portieri Automatici:</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div>• {match.home_team?.name || 'Casa'}: <code>P1_{match.home_team?.name || 'Casa'}</code> (gol subiti: {awayScore})</div>
              <div>• {match.away_team?.name || 'Ospite'}: <code>P1_{match.away_team?.name || 'Ospite'}</code> (gol subiti: {homeScore})</div>
              <div className="mt-2 text-xs">I portieri vengono creati automaticamente con questo formato</div>
            </div>
          </div>

          {/* Rules */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Regole Fase Eliminatoria:</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <div>• 2 tempi da 10 minuti non effettivi</div>
              <div>• In caso di pareggio: 5 calci di rigore</div>
              <div>• Il vincitore avanza alla fase successiva</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annulla
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving || !match.home_team || !match.away_team}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Salvataggio...' : 'Salva Risultato'}
          </button>
        </div>
      </div>
    </div>
  );
};