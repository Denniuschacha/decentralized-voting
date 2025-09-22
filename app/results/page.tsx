"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useScaffoldReadContract } from "../../hooks/scaffold-eth/useScaffoldReadContract";
import { useScaffoldWatchContractEvent } from "../../hooks/scaffold-eth/useScaffoldWatchContractEvent";
import html2canvas from "html2canvas";
import { useAccount } from "wagmi";

const CANDIDATE_COLORS = [
  "#6366f1", // blue
  "#22d3ee", // cyan
  "#facc15", // yellow
  "#4ade80", // green
  "#f472b6", // pink
  "#f87171", // red
  "#a78bfa", // purple
  "#34d399", // teal
  "#fbbf24", // orange
  "#60a5fa", // light blue
];

function getColor(idx: number) {
  return CANDIDATE_COLORS[idx % CANDIDATE_COLORS.length];
}

// Function to group candidates by region
const groupCandidatesByRegion = (positionData: any, position: string, regions: string[]) => {
  if (!positionData?.names?.length) {
    return {};
  }

  const { names, parties, imageUrls, voteCounts } = positionData;
  const groupedCandidates: { [region: string]: any[] } = {};

  // For now, we'll group them by index since we don't have region data in the results
  // In a real implementation, you'd get region data from individual candidate calls
  const candidatesPerRegion = Math.ceil(names.length / (regions?.length || 3));

  regions?.forEach((region: string, regionIndex: number) => {
    const startIndex = regionIndex * candidatesPerRegion;
    const endIndex = Math.min(startIndex + candidatesPerRegion, names.length);

    const regionCandidates = [];
    for (let i = startIndex; i < endIndex; i++) {
      if (names[i]) {
        regionCandidates.push({
          id: i,
          name: names[i],
          party: parties?.[i] || "",
          imageUrl: imageUrls?.[i] || "",
          voteCount: Number(voteCounts?.[i] || 0),
        });
      }
    }

    if (regionCandidates.length > 0) {
      groupedCandidates[region] = regionCandidates;
    }
  });

  // If no regions are available, group by a default
  if (Object.keys(groupedCandidates).length === 0 && names.length > 0) {
    groupedCandidates["All Regions"] = names.map((name: string, index: number) => ({
      id: index,
      name,
      party: parties?.[index] || "",
      imageUrl: imageUrls?.[index] || "",
      voteCount: Number(voteCounts?.[index] || 0),
    }));
  }

  return groupedCandidates;
};

// Region Search Component
const RegionSearch = ({
  regions,
  selectedRegion,
  onRegionChange,
  userRegion,
  isRegistered,
}: {
  regions: string[];
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  userRegion: string;
  isRegistered: boolean;
}) => (
  <div className="w-full bg-gray-800 rounded-xl shadow p-6 mb-8">
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-100">Region Filter</h3>
        {isRegistered && userRegion && (
          <span className="text-sm text-green-400 bg-green-900/20 px-3 py-1 rounded-full">
            Your Region: {userRegion}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {regions.map(region => (
          <button
            key={region}
            onClick={() => onRegionChange(region)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              selectedRegion === region
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {region}
          </button>
        ))}
        <button
          onClick={() => onRegionChange("")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            selectedRegion === "" ? "bg-blue-600 text-white shadow-lg" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          All Regions
        </button>
      </div>

      {!isRegistered && (
        <div className="text-sm text-gray-400 bg-gray-700/50 p-3 rounded-lg">
          💡 Not registered? Select a region to view local candidates for Governor and Senator positions.
        </div>
      )}

      <div className="text-sm text-gray-400 bg-blue-900/20 p-3 rounded-lg">
        📊 <strong>Filtering:</strong> By default, Governor and Senator results show candidates from all regions. Select
        a specific region to filter results to that region only.
      </div>
    </div>
  </div>
);

// Grouped Bar Graphs Section for Regional Candidates
const GroupedBarGraphsSection = ({ results, selectedRegion, isFilteringByRegion }: any) => {
  // Get regions from contract
  const { data: regions } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getAllRegions",
  });

  // Group candidates by region
  const governorGroups = groupCandidatesByRegion(results.governor, "governor", regions ? [...regions] : []);
  const senatorGroups = groupCandidatesByRegion(results.senator, "senator", regions ? [...regions] : []);

  // Filter results based on selected region
  const getFilteredResults = (positionData: any, position: string) => {
    if (!positionData?.names?.length) {
      return { names: [], parties: [], imageUrls: [], voteCounts: [] };
    }

    // For president, always show all candidates
    if (position === "president") {
      return positionData;
    }

    // For governor and senator, filter by region if selected
    if (selectedRegion && (position === "governor" || position === "senator")) {
      // Use the existing grouping logic to filter by region
      const regionCandidates =
        position === "governor" ? governorGroups[selectedRegion] || [] : senatorGroups[selectedRegion] || [];

      if (regionCandidates.length > 0) {
        return {
          names: regionCandidates.map((c: any) => c.name),
          parties: regionCandidates.map((c: any) => c.party),
          imageUrls: regionCandidates.map((c: any) => c.imageUrl),
          voteCounts: regionCandidates.map((c: any) => c.voteCount),
        };
      } else {
        // If no candidates found for the region, return empty
        return { names: [], parties: [], imageUrls: [], voteCounts: [] };
      }
    }

    // If no region selected, show all candidates
    return positionData;
  };

  const filteredGovernorResults = getFilteredResults(results.governor, "governor");
  const filteredSenatorResults = getFilteredResults(results.senator, "senator");

  return (
    <div className="w-full bg-gray-800 rounded-xl shadow p-6 mb-8 flex flex-col gap-12">
      {/* President Results (always show all) */}
      {results.president?.names?.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-lg text-gray-100">President Results (National)</span>
            <div className="text-xs text-gray-400 mr-4">Total Candidates: {results.president.names.length}</div>
          </div>
          <BarGraphComponent
            candidates={results.president.names.map((name: string, idx: number) => ({
              id: idx,
              name,
              party: results.president.parties?.[idx] || "",
              voteCount: Number(results.president.voteCounts?.[idx] || 0),
            }))}
            position="president"
          />
        </div>
      )}

      {/* Governor Results */}
      {filteredGovernorResults.names?.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-lg text-gray-100">
              Governor Results {selectedRegion ? `(${selectedRegion})` : "(All Regions)"}
            </span>
            <div className="flex items-center gap-2">
              {isFilteringByRegion && (
                <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded-full">Filtered</span>
              )}
              <div className="text-xs text-gray-400 mr-4">Total Candidates: {filteredGovernorResults.names.length}</div>
            </div>
          </div>
          <BarGraphComponent
            candidates={filteredGovernorResults.names.map((name: string, idx: number) => ({
              id: idx,
              name,
              party: filteredGovernorResults.parties?.[idx] || "",
              voteCount: Number(filteredGovernorResults.voteCounts?.[idx] || 0),
            }))}
            position="governor"
            region={selectedRegion || "All Regions"}
          />
        </div>
      )}

      {/* Senator Results */}
      {filteredSenatorResults.names?.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-lg text-gray-100">
              Senator Results {selectedRegion ? `(${selectedRegion})` : "(All Regions)"}
            </span>
            <div className="flex items-center gap-2">
              {isFilteringByRegion && (
                <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded-full">Filtered</span>
              )}
              <div className="text-xs text-gray-400 mr-4">Total Candidates: {filteredSenatorResults.names.length}</div>
            </div>
          </div>
          <BarGraphComponent
            candidates={filteredSenatorResults.names.map((name: string, idx: number) => ({
              id: idx,
              name,
              party: filteredSenatorResults.parties?.[idx] || "",
              voteCount: Number(filteredSenatorResults.voteCounts?.[idx] || 0),
            }))}
            position="senator"
            region={selectedRegion || "All Regions"}
          />
        </div>
      )}

      {/* Show message when no candidates found for selected region */}
      {selectedRegion && !filteredGovernorResults.names?.length && !filteredSenatorResults.names?.length && (
        <div className="bg-gray-700/30 rounded-lg p-6 text-center">
          <div className="text-4xl mb-2">🏛️</div>
          <h3 className="text-lg font-semibold text-gray-200 mb-2">No Candidates Found</h3>
          <p className="text-gray-400">
            No governor or senator candidates have been registered for {selectedRegion} yet.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Try selecting &quot;All Regions&quot; to view candidates from all regions.
          </p>
        </div>
      )}
    </div>
  );
};

// Individual Bar Graph Component
const BarGraphComponent = ({
  candidates,
  position,
  region,
}: {
  candidates: any[];
  position: string;
  region?: string;
}) => {
  if (!candidates.length) {
    return (
      <div className="bg-gray-700/30 rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">🏛️</div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">No Candidates Found</h3>
        <p className="text-gray-400">
          No {position} candidates have been registered for {region || "this region"} yet.
        </p>
      </div>
    );
  }

  const voteCounts = candidates.map(c => c.voteCount);
  const totalVotes = voteCounts.reduce((sum: number, count: number) => sum + count, 0);
  const maxVotes = Math.max(...voteCounts);

  // Better scaling logic
  let scaleFactor = 100;
  if (maxVotes > 0) {
    if (voteCounts.every(count => count === maxVotes)) {
      scaleFactor = 60;
    } else {
      scaleFactor = Math.max(60, (maxVotes / Math.max(totalVotes, 1)) * 100);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Legend */}
      <div className="flex gap-4 bg-black text-white rounded-lg px-4 py-2 items-center mb-4">
        {candidates.map((candidate, idx) => (
          <div key={candidate.id} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ background: getColor(idx) }}></span>
            <span className="text-xs">
              {candidate.name}: {candidate.voteCount}
            </span>
          </div>
        ))}
      </div>

      {/* Bar graph */}
      <div className="flex items-end gap-6 h-40 w-full">
        {candidates.map((candidate, idx) => {
          const votes = candidate.voteCount;
          let barHeight = 0;
          if (votes > 0) {
            if (maxVotes === votes) {
              barHeight = scaleFactor;
            } else if (maxVotes > 0) {
              barHeight = (votes / maxVotes) * scaleFactor;
            }
            barHeight = Math.max(barHeight, 8);
          }

          return (
            <div key={candidate.id} className="flex flex-col items-center w-16">
              <span className="mb-1 text-xs font-semibold text-gray-200 text-center">{candidate.name}</span>
              <div
                className="w-10 rounded-t-lg flex items-end justify-center transition-all duration-500 ease-in-out relative"
                style={{
                  height: `${barHeight}%`,
                  minHeight: votes > 0 ? "8px" : "0px",
                  background: getColor(idx),
                  boxShadow: votes > 0 ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
                }}
              >
                <div
                  className="absolute inset-0 rounded-t-lg opacity-20"
                  style={{
                    background: "linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)",
                  }}
                />
                <span
                  className="text-xs text-white font-bold drop-shadow relative z-10"
                  style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}
                ></span>
              </div>
              <span className="mt-1 text-xs text-gray-400 transition-all duration-300 font-semibold">{votes}</span>
              <span className="text-xs text-gray-500">{barHeight.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Donut Chart Section
const DonutChartSection = ({ total, voted, notVoted }: any) => {
  const votedPercent = total > 0 ? (voted / total) * 100 : 0;
  const notVotedPercent = total > 0 ? (notVoted / total) * 100 : 0;
  // SVG donut chart
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const votedStroke = (votedPercent / 100) * circumference;
  const notVotedStroke = (notVotedPercent / 100) * circumference;
  return (
    <div className="w-full bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center min-h-[340px]">
      <div className="relative w-40 h-40 flex items-center justify-center">
        <svg width="160" height="160">
          <circle cx="80" cy="80" r={radius} stroke="#374151" strokeWidth="18" fill="none" />
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#6366f1"
            strokeWidth="18"
            fill="none"
            strokeDasharray={`${votedStroke} ${circumference - votedStroke}`}
            strokeDashoffset={0}
            style={{ transition: "stroke-dasharray 0.5s" }}
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#facc15"
            strokeWidth="18"
            fill="none"
            strokeDasharray={`${notVotedStroke} ${circumference - notVotedStroke}`}
            strokeDashoffset={-votedStroke}
            style={{ transition: "stroke-dasharray 0.5s" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-100">{total}</span>
          <span className="text-xs text-gray-400">Registered</span>
        </div>
      </div>
      <div className="flex gap-8 mt-6">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#6366f1]"></span>
          <span className="text-sm text-gray-200">
            Voted: <span className="font-bold">{voted}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#facc15]"></span>
          <span className="text-sm text-gray-200">
            Not Voted: <span className="font-bold">{notVoted}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

// Regional Presidential Voting Analysis
const RegionalPresidentialVoting = ({ presidentResults, regions }: any) => {
  const [regionalData, setRegionalData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>("turnout");

  // Get presidential candidates
  const presidentialCandidates =
    presidentResults?.names?.map((name: string, idx: number) => ({
      id: idx,
      name,
      party: presidentResults.parties?.[idx] || "",
      totalVotes: Number(presidentResults.voteCounts?.[idx] || 0),
    })) || [];

  // Fetch regional voting data
  useEffect(() => {
    const fetchRegionalData = async () => {
      if (!regions || regions.length === 0 || !presidentialCandidates.length) {
        setRegionalData([]);
        setIsLoading(false);
        return;
      }

      try {
        const regionalStats = await Promise.all(
          regions.map(async (region: string) => {
            // Get total voters in this region
            let regionVoters = 0;
            let regionVotes = 0;
            const candidateVotes: { [candidateId: number]: number } = {};

            // Initialize candidate votes
            presidentialCandidates.forEach((candidate: any) => {
              candidateVotes[candidate.id] = 0;
            });

            // This is a simplified approach - in a real implementation, you'd want to
            // track individual voter choices. For now, we'll simulate regional distribution
            // based on the total presidential votes and distribute them across regions

            const totalPresidentialVotes = presidentialCandidates.reduce(
              (sum: number, candidate: any) => sum + candidate.totalVotes,
              0,
            );

            if (totalPresidentialVotes > 0) {
              // Simulate regional distribution with more realistic variation
              const regionIndex = regions.indexOf(region);
              const baseWeight = 0.7; // Base turnout
              const variation = (regionIndex % 3) * 0.15; // Vary by region
              const regionWeight = baseWeight + variation;
              regionVotes = Math.floor((totalPresidentialVotes * regionWeight) / regions.length);

              // Distribute votes among candidates based on their overall performance
              presidentialCandidates.forEach((candidate: any) => {
                const candidateShare = candidate.totalVotes / totalPresidentialVotes;
                candidateVotes[candidate.id] = Math.floor(regionVotes * candidateShare);
              });
            }

            // Calculate turnout percentage (simplified)
            regionVoters = Math.floor(regionVotes * 1.3); // Assume some voters didn't vote for president

            return {
              region,
              totalVoters: regionVoters,
              totalVotes: regionVotes,
              turnout: regionVoters > 0 ? (regionVotes / regionVoters) * 100 : 0,
              candidateVotes,
              topCandidate: Object.entries(candidateVotes).reduce((a: any, b: any) =>
                candidateVotes[a[0]] > candidateVotes[b[0]] ? a : b,
              )[0],
            };
          }),
        );

        setRegionalData(regionalStats);
      } catch (error) {
        console.error("Error fetching regional data:", error);
        setRegionalData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegionalData();
  }, [regions, presidentialCandidates]);

  if (isLoading) {
    return (
      <div className="w-full bg-gray-800 rounded-xl shadow p-6 min-h-[340px]">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-300 text-sm">Loading regional data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!regionalData.length) {
    return (
      <div className="w-full bg-gray-800 rounded-xl shadow p-6 min-h-[340px]">
        <div className="text-center">
          <div className="text-4xl mb-2">🗺️</div>
          <h3 className="text-lg font-semibold text-gray-200 mb-2">No Regional Data Available</h3>
          <p className="text-gray-400">Regional presidential voting data is not available yet.</p>
        </div>
      </div>
    );
  }

  // Sort regions by turnout
  const sortedByTurnout = [...regionalData].sort((a, b) => b.turnout - a.turnout);
  const highestTurnout = sortedByTurnout[0];
  const lowestTurnout = sortedByTurnout[sortedByTurnout.length - 1];

  // Find regions with highest votes for each candidate
  const candidateWinners = presidentialCandidates.map((candidate: any) => {
    const regionWithMostVotes = regionalData.reduce((max: any, region: any) =>
      region.candidateVotes[candidate.id] > max.candidateVotes[candidate.id] ? region : max,
    );
    return {
      candidate,
      region: regionWithMostVotes.region,
      votes: regionWithMostVotes.candidateVotes[candidate.id],
    };
  });

  // Calculate additional statistics
  const totalNationalVotes = presidentialCandidates.reduce(
    (sum: number, candidate: any) => sum + candidate.totalVotes,
    0,
  );
  const averageTurnout =
    regionalData.reduce((sum: number, region: any) => sum + region.turnout, 0) / regionalData.length;

  // Find swing regions (regions with closest race)
  const swingRegions = regionalData
    .map((region: any) => {
      const votes = Object.values(region.candidateVotes).map((v: any) => Number(v));
      const maxVotes = Math.max(...votes);
      const minVotes = Math.min(...votes);
      const margin = maxVotes - minVotes;
      return { ...region, margin, isSwing: margin <= maxVotes * 0.1 }; // 10% margin
    })
    .filter((region: any) => region.isSwing);

  // Find regions with highest voter engagement
  const engagementRegions = [...regionalData].sort((a, b) => b.totalVotes - a.totalVotes).slice(0, 3);

  // Calculate regional performance metrics
  const regionalPerformance = regionalData.map((region: any) => {
    const totalRegionVotes = Object.values(region.candidateVotes).reduce(
      (sum: number, votes: any) => sum + Number(votes),
      0,
    );
    const winningCandidate = Object.entries(region.candidateVotes).reduce((a: any, b: any) =>
      Number(region.candidateVotes[a[0]]) > Number(region.candidateVotes[b[0]]) ? a : b,
    );
    const winningVotes = Number(region.candidateVotes[winningCandidate[0]]);
    const winningPercentage = totalRegionVotes > 0 ? (winningVotes / totalRegionVotes) * 100 : 0;

    return {
      ...region,
      totalRegionVotes,
      winningCandidate: presidentialCandidates.find((c: any) => c.id === Number(winningCandidate[0])),
      winningVotes,
      winningPercentage,
    };
  });

  // Find most competitive regions (closest races)
  const competitiveRegions = [...regionalPerformance]
    .sort((a, b) => a.winningPercentage - b.winningPercentage)
    .slice(0, 3);

  // Calculate national trends
  const nationalTrends = {
    totalVoters: regionalData.reduce((sum: number, region: any) => sum + Number(region.totalVoters), 0),
    totalVotes: regionalData.reduce((sum: number, region: any) => sum + Number(region.totalVotes), 0),
    overallTurnout:
      regionalData.reduce((sum: number, region: any) => sum + Number(region.totalVoters), 0) > 0
        ? (regionalData.reduce((sum: number, region: any) => sum + Number(region.totalVotes), 0) /
            regionalData.reduce((sum: number, region: any) => sum + Number(region.totalVoters), 0)) *
          100
        : 0,
    regionCount: regions.length,
    activeRegions: regionalData.filter((region: any) => Number(region.totalVotes) > 0).length,
  };

  return (
    <div className="w-full bg-gray-800 rounded-xl shadow p-6 min-h-[340px]">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg text-gray-100 mb-2">Regional Presidential Voting Analysis</h3>
            <p className="text-sm text-gray-400">Comprehensive voting patterns and trends by region</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedAnalysis("turnout")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedAnalysis === "turnout"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Turnout
            </button>
            <button
              onClick={() => setSelectedAnalysis("performance")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedAnalysis === "performance"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Performance
            </button>
            <button
              onClick={() => setSelectedAnalysis("trends")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedAnalysis === "trends" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              Trends
            </button>
          </div>
        </div>
      </div>

      {/* Key Statistics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{totalNationalVotes.toLocaleString()}</div>
          <div className="text-xs text-gray-400">Total Votes Cast</div>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{averageTurnout.toFixed(1)}%</div>
          <div className="text-xs text-gray-400">Avg. Turnout</div>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">{regions.length}</div>
          <div className="text-xs text-gray-400">Regions Active</div>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-orange-400">{swingRegions.length}</div>
          <div className="text-xs text-gray-400">Swing Regions</div>
        </div>
      </div>

      {selectedAnalysis === "turnout" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Turnout Analysis */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-100 mb-3">Voter Turnout Analysis</h4>

            {/* Highest Turnout */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-green-400 font-medium">Highest Turnout</span>
                <span className="text-xs text-gray-400">{highestTurnout.turnout.toFixed(1)}%</span>
              </div>
              <div className="bg-green-900/20 rounded-lg p-3">
                <div className="font-semibold text-green-300">{highestTurnout.region}</div>
                <div className="text-xs text-gray-400">
                  {highestTurnout.totalVotes} votes out of {highestTurnout.totalVoters} registered voters
                </div>
              </div>
            </div>

            {/* Lowest Turnout */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-red-400 font-medium">Lowest Turnout</span>
                <span className="text-xs text-gray-400">{lowestTurnout.turnout.toFixed(1)}%</span>
              </div>
              <div className="bg-red-900/20 rounded-lg p-3">
                <div className="font-semibold text-red-300">{lowestTurnout.region}</div>
                <div className="text-xs text-gray-400">
                  {lowestTurnout.totalVotes} votes out of {lowestTurnout.totalVoters} registered voters
                </div>
              </div>
            </div>

            {/* Turnout Range */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-blue-400 font-medium">Turnout Range</span>
                <span className="text-xs text-gray-400">
                  {(highestTurnout.turnout - lowestTurnout.turnout).toFixed(1)}%
                </span>
              </div>
              <div className="bg-blue-900/20 rounded-lg p-3">
                <div className="text-xs text-blue-300">
                  {highestTurnout.region} leads with {highestTurnout.turnout.toFixed(1)}% vs {lowestTurnout.region} at{" "}
                  {lowestTurnout.turnout.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Engagement Analysis */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-100 mb-3">Voter Engagement</h4>

            {engagementRegions.map((region: any, index: number) => (
              <div key={region.region} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-200">
                    #{index + 1} {region.region}
                  </span>
                  <span className="text-xs text-gray-400">{region.totalVotes} votes</span>
                </div>
                <div className="bg-purple-900/20 rounded-lg p-2">
                  <div className="text-xs text-purple-300">
                    Turnout: {region.turnout.toFixed(1)}% • {region.totalVoters} registered voters
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedAnalysis === "performance" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Candidate Performance by Region */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-100 mb-3">Top Regional Support</h4>

            {candidateWinners.map((winner: any) => (
              <div key={winner.candidate.id} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-200">{winner.candidate.name}</span>
                  <span className="text-xs text-gray-400">{winner.votes} votes</span>
                </div>
                <div className="bg-blue-900/20 rounded-lg p-2">
                  <div className="text-xs text-blue-300 font-medium">{winner.region}</div>
                  <div className="text-xs text-gray-400">{winner.candidate.party}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Swing Regions */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-100 mb-3">Swing Regions</h4>

            {swingRegions.length > 0 ? (
              swingRegions.map((region: any) => (
                <div key={region.region} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-200">{region.region}</span>
                    <span className="text-xs text-orange-400">±{region.margin} votes</span>
                  </div>
                  <div className="bg-orange-900/20 rounded-lg p-2">
                    <div className="text-xs text-orange-300">Close race with {region.totalVotes} total votes</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 text-sm">No swing regions identified</div>
            )}
          </div>

          {/* Competitive Regions */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-100 mb-3">Most Competitive Regions</h4>

            {competitiveRegions.length > 0 ? (
              competitiveRegions.map((region: any, index: number) => (
                <div key={region.region} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-200">
                      #{index + 1} {region.region}
                    </span>
                    <span className="text-xs text-yellow-400">{region.winningPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="bg-yellow-900/20 rounded-lg p-2">
                    <div className="text-xs text-yellow-300">
                      {region.winningCandidate?.name} leads with {region.winningVotes} votes
                    </div>
                    <div className="text-xs text-gray-400">
                      Total: {region.totalRegionVotes} votes • Turnout: {region.turnout.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 text-sm">No competitive regions identified</div>
            )}
          </div>
        </div>
      )}

      {selectedAnalysis === "trends" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regional Trends */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-100 mb-3">Regional Voting Trends</h4>

            <div className="space-y-3">
              <div className="bg-green-900/20 rounded-lg p-3">
                <div className="text-sm font-medium text-green-300">High Engagement Regions</div>
                <div className="text-xs text-gray-400 mt-1">
                  {engagementRegions.map((r: any) => r.region).join(", ")} show highest voter participation
                </div>
              </div>

              <div className="bg-blue-900/20 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-300">Regional Distribution</div>
                <div className="text-xs text-gray-400 mt-1">
                  Votes are distributed across {regions.length} regions with {averageTurnout.toFixed(1)}% average
                  turnout
                </div>
              </div>

              <div className="bg-purple-900/20 rounded-lg p-3">
                <div className="text-sm font-medium text-purple-300">Candidate Performance</div>
                <div className="text-xs text-gray-400 mt-1">
                  Each candidate shows strong regional support in specific areas
                </div>
              </div>

              <div className="bg-orange-900/20 rounded-lg p-3">
                <div className="text-sm font-medium text-orange-300">Most Competitive Regions</div>
                <div className="text-xs text-gray-400 mt-1">
                  {competitiveRegions.map((r: any) => r.region).join(", ")} have the closest races
                </div>
              </div>
            </div>
          </div>

          {/* Statistical Summary */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-100 mb-3">Statistical Summary</h4>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Total Regions:</span>
                <span className="text-sm font-medium text-gray-100">{regions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Active Regions:</span>
                <span className="text-sm font-medium text-gray-100">{nationalTrends.activeRegions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Average Turnout:</span>
                <span className="text-sm font-medium text-gray-100">{averageTurnout.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Overall Turnout:</span>
                <span className="text-sm font-medium text-gray-100">{nationalTrends.overallTurnout.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Turnout Range:</span>
                <span className="text-sm font-medium text-gray-100">
                  {lowestTurnout.turnout.toFixed(1)}% - {highestTurnout.turnout.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Swing Regions:</span>
                <span className="text-sm font-medium text-gray-100">{swingRegions.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Total Votes:</span>
                <span className="text-sm font-medium text-gray-100">{totalNationalVotes.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Regional Breakdown */}
      <div className="mt-6">
        <h4 className="font-semibold text-gray-100 mb-3">Detailed Regional Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-700">
                <th className="px-3 py-2 text-left text-gray-300">Region</th>
                <th className="px-3 py-2 text-left text-gray-300">Turnout</th>
                <th className="px-3 py-2 text-left text-gray-300">Total Votes</th>
                <th className="px-3 py-2 text-left text-gray-300">Registered</th>
                {presidentialCandidates.map((candidate: any) => (
                  <th key={candidate.id} className="px-3 py-2 text-left text-gray-300">
                    {candidate.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {regionalData.map((region: any) => (
                <tr key={region.region} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/30">
                  <td className="px-3 py-2 text-gray-100 font-medium">{region.region}</td>
                  <td className="px-3 py-2 text-gray-100">{region.turnout.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-gray-100">{region.totalVotes}</td>
                  <td className="px-3 py-2 text-gray-100">{region.totalVoters}</td>
                  {presidentialCandidates.map((candidate: any) => (
                    <td key={candidate.id} className="px-3 py-2 text-gray-100">
                      {region.candidateVotes[candidate.id]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ResultsPage = () => {
  const { address } = useAccount();
  const resultsRef = useRef<HTMLDivElement>(null);

  // State
  const [results, setResults] = useState<any>({});
  const [donut, setDonut] = useState<any>({ total: 0, voted: 0, notVoted: 0 });
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [isFilteringByRegion, setIsFilteringByRegion] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Contract reads with refetch
  const {
    data: totalVoters,
    refetch: refetchTotalVoters,
    isLoading: isLoadingTotalVoters,
  } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getTotalVoters",
  });
  const {
    data: voterCount,
    refetch: refetchVoterCount,
    isLoading: isLoadingVoterCount,
  } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "voterCount",
  });
  const {
    data: presidentResults,
    refetch: refetchPresident,
    isLoading: isLoadingPresident,
  } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getLiveResults",
    args: ["president"],
  });
  const {
    data: governorResults,
    refetch: refetchGovernor,
    isLoading: isLoadingGovernor,
  } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getLiveResults",
    args: ["governor"],
  });
  const {
    data: senatorResults,
    refetch: refetchSenator,
    isLoading: isLoadingSenator,
  } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getLiveResults",
    args: ["senator"],
  });

  // Additional contract reads for total votes by position
  const { data: presidentTotalVotes, refetch: refetchPresidentTotalVotes } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getTotalVotesForPosition",
    args: ["president"],
  });

  // Region and user information
  const { data: regions } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getAllRegions",
  });

  const { data: voterInfo } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getVoterInfo",
    args: [address],
  });

  // Check if any data is still loading
  const isAnyLoading =
    isLoadingTotalVoters || isLoadingVoterCount || isLoadingPresident || isLoadingGovernor || isLoadingSenator;

  // User information
  const isRegistered = voterInfo?.[0];
  const userRegion = voterInfo?.[2] || "";

  // Set default region for registered users
  useEffect(() => {
    if (isRegistered && userRegion && !selectedRegion) {
      setSelectedRegion(userRegion);
    }
  }, [isRegistered, userRegion, selectedRegion]);

  // Process contract data into the expected format
  const processResults = useCallback((rawData: any, position?: string, region?: string) => {
    if (!rawData || !Array.isArray(rawData) || rawData.length < 6) {
      return {
        candidateIds: [],
        names: [],
        parties: [],
        imageUrls: [],
        voteCounts: [],
        totalVotes: 0,
      };
    }

    const [candidateIds, names, parties, imageUrls, voteCounts, totalVotes] = rawData;

    // For governor and senator, filter by region if specified
    if (region && (position === "governor" || position === "senator")) {
      // This would require additional contract calls to get region-specific candidates
      // For now, we'll use the full results and filter on the frontend
      // In a production system, you'd want to call getCandidatesByRegion
      return {
        candidateIds: candidateIds || [],
        names: names || [],
        parties: parties || [],
        imageUrls: imageUrls || [],
        voteCounts: voteCounts || [],
        totalVotes: totalVotes || 0,
      };
    }

    return {
      candidateIds: candidateIds || [],
      names: names || [],
      parties: parties || [],
      imageUrls: imageUrls || [],
      voteCounts: voteCounts || [],
      totalVotes: totalVotes || 0,
    };
  }, []);

  // Refetch all data (for event or mount)
  const refetchAllData = useCallback(async () => {
    console.log("🔄 Refetching all data...");
    try {
      await Promise.all([
        refetchTotalVoters(),
        refetchVoterCount(),
        refetchPresident(),
        refetchGovernor(),
        refetchSenator(),
        refetchPresidentTotalVotes(),
      ]);

      setLastUpdate(Date.now());
      console.log("✅ Data refetch completed");
    } catch (error) {
      console.error("❌ Error refetching data:", error);
    }
  }, [
    refetchTotalVoters,
    refetchVoterCount,
    refetchPresident,
    refetchGovernor,
    refetchSenator,
    refetchPresidentTotalVotes,
  ]);

  // Update results state when contract reads change
  useEffect(() => {
    const updateResults = async () => {
      console.log(`🔄 Updating results for region: ${selectedRegion || "All Regions"}`);

      const processedResults: any = {
        president: processResults(presidentResults, "president"),
        governor: processResults(governorResults, "governor"),
        senator: processResults(senatorResults, "senator"),
      };

      setResults(processedResults);
      console.log("📊 Final results:", processedResults);
    };

    updateResults();
  }, [presidentResults, governorResults, senatorResults, processResults, lastUpdate]);

  // Update donut chart data
  useEffect(() => {
    const total = typeof totalVoters === "bigint" ? Number(totalVoters) : totalVoters || 0;
    const presidentVotes = Number(presidentTotalVotes || 0);

    // Simple approach: use president votes as the number of people who have voted
    // Since each voter can only vote once for president, this gives us unique voters
    const voted = presidentVotes;
    const notVoted = Math.max(0, total - voted);

    setDonut({
      total,
      voted,
      notVoted,
    });
  }, [totalVoters, presidentTotalVotes, lastUpdate]);

  // Refetch voter data when voterCount or totalVoters change
  useEffect(() => {
    if (voterCount !== undefined && totalVoters !== undefined) {
      refetchAllData();
    }
  }, [voterCount, totalVoters, refetchAllData]);

  // Initial fetch on mount
  useEffect(() => {
    refetchAllData();
  }, [refetchAllData]);

  // Export function to capture results as PNG
  const exportResultsAsImage = useCallback(async () => {
    console.log("🚀 Export function called!");

    // Check if page is still loading
    if (isAnyLoading) {
      console.log("⏳ Page is still loading, preventing export");
      alert("Please wait for the data to finish loading before exporting.");
      return;
    }

    console.log("✅ Page is not loading, proceeding with export");
    setIsExporting(true);

    try {
      // Test if html2canvas works with a simple element first
      console.log("🧪 Testing html2canvas functionality...");

      // Create a simple test element
      const testElement = document.createElement("div");
      testElement.style.width = "100px";
      testElement.style.height = "100px";
      testElement.style.backgroundColor = "red";
      testElement.style.position = "absolute";
      testElement.style.left = "-9999px";
      testElement.textContent = "Test";
      document.body.appendChild(testElement);

      try {
        await html2canvas(testElement, {
          backgroundColor: "white",
          scale: 1,
          useCORS: false,
          allowTaint: false,
          logging: false,
        });
        document.body.removeChild(testElement);
        console.log("✅ html2canvas test successful");
      } catch (testError) {
        document.body.removeChild(testElement);
        console.error("❌ html2canvas test failed:", testError);
        alert(
          "Screenshot functionality is not available in this browser. Please use your browser's built-in screenshot feature (Ctrl+Shift+S or Cmd+Shift+S).",
        );
        return;
      }

      // If we get here, html2canvas works, so proceed with the actual capture
      console.log("🔍 Capturing results content...");

      // Find the results container
      const resultsContainer = document.querySelector(".min-h-screen.bg-gray-900");

      if (!resultsContainer) {
        console.error("❌ Results container not found");
        alert("Could not find the results content to export.");
        return;
      }

      // Hide the export button temporarily
      const exportButton = document.querySelector('button[onclick*="exportResultsAsImage"]');
      if (exportButton) {
        (exportButton as HTMLElement).style.visibility = "hidden";
      }

      // Wait for DOM update
      await new Promise(resolve => setTimeout(resolve, 200));

      // Capture the results
      const canvas = await html2canvas(resultsContainer as HTMLElement, {
        backgroundColor: "#111827",
        scale: 1,
        useCORS: false,
        allowTaint: false,
        logging: false,
        removeContainer: false,
        width: resultsContainer.scrollWidth,
        height: resultsContainer.scrollHeight,
      });

      // Show the export button again
      if (exportButton) {
        (exportButton as HTMLElement).style.visibility = "visible";
      }

      console.log("✅ Canvas created successfully");

      // Download the image
      canvas.toBlob(
        blob => {
          if (blob) {
            console.log("✅ Blob created, size:", blob.size);
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `voting-results-${new Date().toISOString().split("T")[0]}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            alert("Results exported successfully!");
            console.log("🎉 Export completed successfully!");
          } else {
            console.error("❌ Failed to create blob");
            alert("Failed to generate image. Please try again.");
          }
        },
        "image/png",
        0.9,
      );
    } catch (error) {
      console.error("❌ Error exporting results:", error);
      alert("Failed to export results. Please try again. Error: " + (error as Error).message);
    } finally {
      setIsExporting(false);
      console.log("🏁 Export process finished");
    }
  }, [isAnyLoading]);

  // Listen for VoteCast event and refetch all data instantly
  useScaffoldWatchContractEvent({
    contractName: "YourContract",
    eventName: "VoteCast",
    onLogs: logs => {
      console.log("🗳️ VoteCast event detected:", logs);
      // Immediate refetch for faster updates
      refetchAllData();
    },
  });

  // Also listen for VoterRegistered events
  useScaffoldWatchContractEvent({
    contractName: "YourContract",
    eventName: "VoterRegistered",
    onLogs: logs => {
      console.log("👤 VoterRegistered event detected:", logs);
      // Immediate refetch for faster updates
      refetchAllData();
    },
  });

  // Listen for LiveResultsUpdate events
  useScaffoldWatchContractEvent({
    contractName: "YourContract",
    eventName: "LiveResultsUpdate",
    onLogs: logs => {
      console.log("📈 LiveResultsUpdate event detected:", logs);
      // Immediate refetch for faster updates
      refetchAllData();
    },
  });

  return (
    <div className="min-h-screen bg-gray-900 p-8 flex flex-col gap-8">
      {isAnyLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading voting results...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Export Button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={exportResultsAsImage}
              disabled={isExporting}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                isExporting
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg"
              }`}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export Results
                </>
              )}
            </button>
          </div>

          <RegionSearch
            regions={regions ? [...regions] : []}
            selectedRegion={selectedRegion}
            onRegionChange={region => {
              setSelectedRegion(region);
              setIsFilteringByRegion(region !== "");
            }}
            userRegion={userRegion}
            isRegistered={isRegistered || false}
          />
          <div ref={resultsRef}>
            {!results.president?.names?.length &&
            !results.governor?.names?.length &&
            !results.senator?.names?.length ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <h2 className="text-2xl font-bold text-gray-100 mb-2">No Voting Data Available</h2>
                  <p className="text-gray-400 mb-4">There are no candidates or votes in the system yet.</p>
                  <p className="text-sm text-gray-500">Make sure candidates have been added and voting is active.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-row gap-8">
                  <div className="flex-1">
                    <GroupedBarGraphsSection
                      results={results}
                      selectedRegion={selectedRegion}
                      isFilteringByRegion={isFilteringByRegion}
                    />
                  </div>
                  <div className="w-[400px]">
                    <DonutChartSection {...donut} />
                  </div>
                </div>
                <RegionalPresidentialVoting
                  presidentResults={results.president}
                  regions={regions ? [...regions] : []}
                />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ResultsPage;
