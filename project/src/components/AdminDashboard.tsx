import React, { useState, useEffect } from 'react';
import { Plus, Trophy, Users, Calendar } from 'lucide-react';
import { TournamentService } from '../services/tournamentService';
import type { Tournament } from '../lib/supabase';

interface AdminDashboardProps {
  onTournamentSelect: (tournament: Tournament) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onTournamentSelect }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentYear, setNewTournamentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const data = await TournamentService.getTournaments();
      setTournaments(data);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!newTournamentName.trim()) return;
    
    setCreating(true);
    try {
      const tournament = await TournamentService.createTournament(
        newTournamentName.trim(), 
        newTournamentYear
      );
      
      await loadTournaments();
      setNewTournamentName('');
      setNewTournamentYear(new Date().getFullYear());
      
      // Auto-select the new tournament
      onTournamentSelect(tournament);
    } catch (error) {
      console.error('Error creating tournament:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Caricamento dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-12 h-12 text-green-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              Gestione Torneo Calcio
            </h1>
          </div>
          <p className="text-xl text-gray-600">
            Sistema di gestione per tornei a 16 squadre con gironi
          </p>
        </div>

        {/* Create Tournament Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-6 h-6 text-green-600" />
            Crea Nuovo Torneo
          </h2>
          
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Nome del torneo"
              value={newTournamentName}
              onChange={(e) => setNewTournamentName(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            
            <input
              type="number"
              placeholder="Anno"
              value={newTournamentYear}
              onChange={(e) => setNewTournamentYear(parseInt(e.target.value))}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-24"
            />
            
            <button
              onClick={handleCreateTournament}
              disabled={creating || !newTournamentName.trim()}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {creating ? 'Creazione...' : 'Crea Torneo'}
            </button>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <strong>Il sistema creerà automaticamente:</strong>
            <ul className="mt-2 space-y-1 ml-4">
              <li>• 4 gironi (A, B, C, D)</li>
              <li>• 16 squadre placeholder (Sq1-Sq16)</li>
              <li>• Calendario completo round-robin (24 partite)</li>
            </ul>
          </div>
        </div>

        {/* Tournaments List */}
        {tournaments.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Tornei Esistenti
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onTournamentSelect(tournament)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    <h3 className="font-semibold text-lg">{tournament.name}</h3>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Anno: {tournament.year}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>16 squadre • 4 gironi</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm text-blue-600 font-medium">
                    Clicca per gestire →
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tournaments.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Nessun Torneo Creato
            </h3>
            <p className="text-gray-500">
              Crea il tuo primo torneo per iniziare a gestire le squadre e le partite
            </p>
          </div>
        )}
      </div>
    </div>
  );
};