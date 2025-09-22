"use client";

import { useEffect, useState } from "react";
import { Voter, clientHelpers } from "../lib/supabase-client";

export default function VoterRegistration() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [newVoter, setNewVoter] = useState<Voter | null>(null);

  useEffect(() => {
    // Load initial voters
    const loadVoters = async () => {
      const allVoters = await clientHelpers.getAllVoters();
      setVoters(allVoters);
    };

    loadVoters();

    // Subscribe to real-time voter registrations
    const subscription = clientHelpers.subscribeToVoterRegistrations(voter => {
      setNewVoter(voter);
      setVoters(prev => [voter, ...prev]);

      // Show notification for new voter
      console.log("New voter registered:", voter);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Voter Registration</h2>

      {/* Real-time notification */}
      {newVoter && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          New voter registered: {newVoter.first_name} {newVoter.last_name} from {newVoter.region}
        </div>
      )}

      {/* Voters list */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Registered Voters ({voters.length})</h3>
        {voters.map(voter => (
          <div key={voter.id} className="border p-3 rounded">
            <p>
              <strong>
                {voter.first_name} {voter.last_name}
              </strong>
            </p>
            <p className="text-sm text-gray-600">Region: {voter.region}</p>
            <p className="text-sm text-gray-600">Wallet: {voter.wallet}</p>
            <p className="text-xs text-gray-500">Registered: {new Date(voter.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
