"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth/useScaffoldReadContract";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth/useScaffoldWriteContract";
import { notification } from "~~/utils/scaffold-eth";

const POSITIONS = ["president", "governor", "senator"];
const POSITION_COLORS: Record<string, string> = {
  president: "bg-[#1B034A]",
  governor: "bg-[#272343]",
  senator: "bg-[#052C2E]",
};

const VotingPage = () => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [voterRegion, setVoterRegion] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<{
    id: bigint;
    name: string;
    position: string;
  } | null>(null);

  // Voting period and status
  const { data: electionStatus } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getElectionStatus",
  });
  const votingStart = electionStatus?.[4];
  const votingEnd = electionStatus?.[5];

  // Voter authentication check
  const { refetch: refetchVoterInfo } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getVoterInfo",
    args: [address],
    watch: false,
    query: { enabled: false },
  });

  // President stats
  const { data: presidentResults } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getLiveResults",
    args: ["president"],
  });

  // Total votes and contestants for president
  const totalVotes = presidentResults?.[5] || 0n; // Fixed: use index 5 for totalVotes
  const totalContestants = presidentResults?.[0]?.length || 0;

  // Voting write hook
  const { writeContractAsync: voteAsync } = useScaffoldWriteContract({ contractName: "YourContract" });

  // Helper to format unix timestamp
  const formatDate = (ts?: bigint) => {
    if (!ts) return "-";
    const d = new Date(Number(ts) * 1000);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  // Check voter authentication on mount and when address changes
  useEffect(() => {
    const checkAuthentication = async () => {
      if (!isConnected || !address) {
        setIsAuthenticated(false);
        setVoterRegion("");
        setIsLoading(false);
        return;
      }

      try {
        const result = await refetchVoterInfo();
        const voter = result.data;

        if (voter && voter[0]) {
          // voter[0] is isRegistered
          setIsAuthenticated(true);
          setVoterRegion(voter[2] || ""); // voter[2] is region
        } else {
          setIsAuthenticated(false);
          setVoterRegion("");
          notification.error("Please login first to access voting");
          router.push("/login");
        }
      } catch (error) {
        console.error("Error checking voter authentication:", error);
        setIsAuthenticated(false);
        setVoterRegion("");
        notification.error("Error checking voter status");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, [isConnected, address, refetchVoterInfo, router]);

  // Fetch all candidates and results for each position
  const { data: presidentData } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getResults",
    args: ["president"],
    watch: true,
  });

  const { data: governorData } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getResults",
    args: ["governor"],
    watch: true,
  });

  const { data: senatorData } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getResults",
    args: ["senator"],
    watch: true,
  });

  // Voting handler
  const handleVoteClick = (candidateId: bigint, candidateName: string, position: string) => {
    if (!isAuthenticated) {
      notification.error("Please login first to vote");
      router.push("/login");
      return;
    }

    setSelectedCandidate({ id: candidateId, name: candidateName, position });
    setShowConfirmation(true);
  };

  const handleConfirmVote = async () => {
    if (!selectedCandidate) return;

    try {
      await voteAsync({ functionName: "vote", args: [selectedCandidate.id] });
      notification.success("Vote cast successfully!");
      setShowConfirmation(false);
      setSelectedCandidate(null);
    } catch (error: any) {
      console.error("Voting error:", error);
      notification.error(error?.message || "Failed to cast vote");
    }
  };

  const handleCancelVote = () => {
    setShowConfirmation(false);
    setSelectedCandidate(null);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#ff9d5c] mx-auto mb-4"></div>
          <p className="text-xl">Checking voter authentication...</p>
        </div>
      </div>
    );
  }

  // Show authentication required message
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4 text-[#ff9d5c]">Authentication Required</h1>
          <p className="text-lg text-gray-300 mb-6">You need to be a registered voter to access the voting page.</p>
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full text-lg font-semibold transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-2 py-8">
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-4xl md:text-6xl font-bold mb-2 text-center text-[#ff9d5c]">
          Presidential Blockchain Voting
        </h1>
        <p className="text-lg text-gray-300 mb-2 text-center max-w-2xl">
          Cast your vote securely and transparently on the blockchain. Your voice matters in shaping the future of
          democracy.
        </p>

        {/* Voter Info */}
        <div className="bg-gray-800 px-6 py-3 rounded-full mb-4 border border-gray-700">
          <span className="text-green-400 font-semibold">Region: {voterRegion}</span>
        </div>

        {/* Voting period */}
        <div className="flex flex-col md:flex-row gap-2 items-center mb-4">
          <span className="bg-gray-900 text-green-400 px-4 py-1 rounded-full font-mono text-base shadow">
            {`Voting: ${formatDate(votingStart)} - ${formatDate(votingEnd)}`}
          </span>
        </div>
        {/* Stats bar */}
        <div className="flex gap-4 mb-2">
          <button className="bg-gray-800 px-4 py-2 rounded-full font-semibold border border-gray-700">
            {totalVotes.toString()} vote{totalVotes === 1n ? "" : "s"}
          </button>
          <button className="bg-gray-800 px-4 py-2 rounded-full font-semibold border border-gray-700">
            {totalContestants} presidential contestant{totalContestants === 1 ? "" : "s"}
          </button>
        </div>
      </div>

      {/* Contestants Section */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center">Contestants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {POSITIONS.map(position => {
            const rawData =
              position === "president" ? presidentData : position === "governor" ? governorData : senatorData;

            if (!rawData) return null;
            const [candidateIds, names, parties, imageUrls, voteCounts] = rawData;

            return candidateIds?.map((id: bigint, idx: number) => {
              const imageUrl = imageUrls?.[idx];

              return (
                <div
                  key={id.toString()}
                  className={`rounded-3xl shadow-lg flex flex-col items-center ${POSITION_COLORS[position]} bg-opacity-80 border border-gray-700 overflow-hidden relative`}
                >
                  <div className="w-full h-48 relative">
                    {imageUrl ? (
                      <div
                        className="w-full h-full bg-cover bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${imageUrl})` }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-6xl font-bold uppercase">
                        {names?.[idx]?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                  <div className="p-6 w-full">
                    <div className="text-xl font-bold mb-1">{names?.[idx]}</div>
                    <div className="text-sm text-gray-300 mb-2">{parties?.[idx]}</div>
                    <div className="mb-2">
                      <span className="bg-gray-800 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                        {position}
                      </span>
                    </div>
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-lg font-semibold transition mb-2 w-full"
                      onClick={() => handleVoteClick(id, names?.[idx] || "Unknown", position)}
                    >
                      Vote
                    </button>
                    <div className="flex items-center gap-2 text-sm text-gray-200">
                      <span className="font-semibold">{voteCounts?.[idx]?.toString() || 0}</span> vote
                      {Number(voteCounts?.[idx] || 0) === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4 text-center">Confirm Your Vote</h3>
            <p className="text-gray-300 text-center mb-6">
              Do you want to vote for <span className="text-[#ff9d5c] font-semibold">{selectedCandidate.name}</span> for{" "}
              <span className="text-[#ff9d5c] font-semibold">{selectedCandidate.position}</span>?
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleCancelVote}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-full font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVote}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold transition"
              >
                Confirm Vote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingPage;
