import React, { useState, useEffect } from 'react';
import { X, Target } from 'lucide-react';
import { TournamentService } from '../services/tournamentService';

interface MatchResultModalProps {
  match: any;
  onClose: () => void;
  onSave: () => void;
}

export const MatchResultModal: React.FC<MatchResultModalProps> = ({
  match,
  onClose,
  onSave
}) => {
  const [homeScore, setHomeScore] = useState(match.home_score || 0);
  const [awayScore, setAwayScore] = useState(match.away_score || 0);
  const [scorersHome, setScorersHome] = useState('');
  const [scorersAway, setScorersAway] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Initialize existing data if match already has result
    if (match.home_score !== null) {
      setHomeScore(match.home_score);
      setAwayScore(match.away_score);
    }
  }, [match]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await TournamentService.updateMatchResult(
        match.id,
        homeScore,
        awayScore,
        scorersHome,
        scorersAway
      );
      
      onSave();
    } catch (error) {
      console.error('Error saving match result:', error);
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
              Risultato Partita
            </h2>
            <p className="text-gray-600 mt-1">
              {match.home_team.name} vs {match.away_team.name}
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
              Punteggio
            </h3>
            
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="font-semibold mb-2">{match.home_team.name}</div>
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
                <div className="font-semibold mb-2">{match.away_team.name}</div>
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

          {/* Scorers */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Marcatori</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marcatori {match.home_team.name}
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
                  Marcatori {match.away_team.name}
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
              <div>• {match.home_team.name}: <code>P1_{match.home_team.name}</code> (gol subiti: {awayScore})</div>
              <div>• {match.away_team.name}: <code>P1_{match.away_team.name}</code> (gol subiti: {homeScore})</div>
              <div className="mt-2 text-xs">I portieri vengono creati automaticamente con questo formato</div>
            </div>
          </div>

          {/* Format Help */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Formato Marcatori:</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div>• Un marcatore: <code>Rossi-2</code> (Rossi ha fatto 2 gol)</div>
              <div>• Più marcatori: <code>Rossi-2;Verdi-1;Bianchi-1</code></div>
              <div>• Separare sempre con punto e virgola (;)</div>
              <div>• Il numero di gol deve corrispondere al punteggio totale</div>
            </div>
          </div>

          {/* Tournament Rules Info */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Regole Torneo:</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <div>• Partite: 2 tempi da 10 minuti non effettivi</div>
              <div>• Classifica: Punti → Scontro diretto → Diff. reti → Gol fatti → Gol subiti</div>
              <div>• Si qualificano le prime 2 di ogni girone</div>
              <div>• Rose: max 10 giocatori, max 3 tesserati FIGC</div>
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
            disabled={saving}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Salvataggio...' : 'Salva Risultato'}
          </button>
        </div>
      </div>
    </div>
  );
};