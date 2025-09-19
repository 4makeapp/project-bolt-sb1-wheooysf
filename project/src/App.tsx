import React, { useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { TournamentManager } from './components/TournamentManager';
import type { Tournament } from './lib/supabase';

function App() {
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  const handleTournamentSelect = (tournament: Tournament) => {
    setSelectedTournament(tournament);
  };

  const handleBackToDashboard = () => {
    setSelectedTournament(null);
  };

  return (
    <div className="min-h-screen">
      {selectedTournament ? (
        <TournamentManager
          tournament={selectedTournament}
          onBack={handleBackToDashboard}
        />
      ) : (
        <AdminDashboard onTournamentSelect={handleTournamentSelect} />
      )}
    </div>
  );
}

export default App;