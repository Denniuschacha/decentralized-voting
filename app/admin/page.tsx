"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const AdminPage = () => {
  const { address } = useAccount();

  // State for download dropdown
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const [isSavingState, setIsSavingState] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDownloadDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Write contract hooks
  const { writeContractAsync: writeYourContractAsync } = useScaffoldWriteContract({
    contractName: "YourContract",
  });

  // Read contract hooks
  const { data: admin } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "admin",
  });

  const { data: electionStatus } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getElectionStatus",
  });

  const { data: regions } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getAllRegions",
  });

  const { data: totalVoters } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getTotalVoters",
  });

  const { data: candidateCount } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "candidateCount",
  });

  // Get candidates for each position
  const { data: presidentCandidates } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getResults",
    args: ["president"],
  });

  const { data: senatorCandidates } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getResults",
    args: ["senator"],
  });

  const { data: governorCandidates } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getResults",
    args: ["governor"],
  });

  // State for forms
  const [electionPeriods, setElectionPeriods] = useState({
    registrationStart: "",
    registrationEnd: "",
    votingStart: "",
    votingEnd: "",
  });

  const [newRegion, setNewRegion] = useState("");
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    party: "",
    position: "president",
    region: "",
    imageUrl: "",
  });

  // Check if current user is admin
  const isAdmin = admin && address && admin.toLowerCase() === address.toLowerCase();

  // Format timestamp to readable date
  const formatTimestamp = (timestamp: bigint | undefined) => {
    if (!timestamp) return "Not set";
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  // Convert date string to Unix timestamp
  const dateToUnix = (dateString: string) => {
    if (!dateString) return "";
    return Math.floor(new Date(dateString).getTime() / 1000).toString();
  };

  // Transform candidate data into a usable format
  const allCandidates = useMemo(() => {
    const candidates: Array<{
      id: number;
      name: string;
      party: string;
      position: string;
      region: string;
      imageUrl: string;
      voteCount: number;
    }> = [];

    // Add president candidates
    if (presidentCandidates) {
      const [candidateIds, names, parties, imageUrls, voteCounts] = presidentCandidates;
      candidateIds?.forEach((id: bigint, index: number) => {
        candidates.push({
          id: Number(id),
          name: names[index] || "",
          party: parties[index] || "",
          position: "president",
          region: "National", // President is national
          imageUrl: imageUrls[index] || "",
          voteCount: Number(voteCounts[index] || 0),
        });
      });
    }

    // Add senator candidates
    if (senatorCandidates) {
      const [candidateIds, names, parties, imageUrls, voteCounts] = senatorCandidates;
      candidateIds?.forEach((id: bigint, index: number) => {
        candidates.push({
          id: Number(id),
          name: names[index] || "",
          party: parties[index] || "",
          position: "senator",
          region: "Regional", // We'll show this as regional for now
          imageUrl: imageUrls[index] || "",
          voteCount: Number(voteCounts[index] || 0),
        });
      });
    }

    // Add governor candidates
    if (governorCandidates) {
      const [candidateIds, names, parties, imageUrls, voteCounts] = governorCandidates;
      candidateIds?.forEach((id: bigint, index: number) => {
        candidates.push({
          id: Number(id),
          name: names[index] || "",
          party: parties[index] || "",
          position: "governor",
          region: "Regional", // We'll show this as regional for now
          imageUrl: imageUrls[index] || "",
          voteCount: Number(voteCounts[index] || 0),
        });
      });
    }

    return candidates;
  }, [presidentCandidates, senatorCandidates, governorCandidates]);

  // Download functions
  const downloadAsCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      notification.error("No data available for download");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadVoterTurnout = () => {
    const totalVotes = allCandidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);
    const turnoutPercentage = totalVoters ? ((totalVotes / Number(totalVoters)) * 100).toFixed(2) : 0;

    const data = [
      {
        "Total Registered Voters": totalVoters?.toString() || "0",
        "Total Votes Cast": totalVotes.toString(),
        "Voter Turnout (%)": turnoutPercentage,
        "Remaining Voters": totalVoters ? (Number(totalVoters) - totalVotes).toString() : "0",
        "Report Date": new Date().toLocaleDateString(),
        "Report Time": new Date().toLocaleTimeString(),
      },
    ];

    downloadAsCSV(data, "voter_turnout_report");
    notification.success("Voter turnout report downloaded");
  };

  const downloadRegisteredVoters = () => {
    const data = [
      {
        "Total Registered Voters": totalVoters?.toString() || "0",
        "Registration Status": electionStatus?.[0] ? "Active" : "Inactive",
        "Registration Start": formatTimestamp(electionStatus?.[2]),
        "Registration End": formatTimestamp(electionStatus?.[3]),
        "Report Date": new Date().toLocaleDateString(),
      },
    ];

    downloadAsCSV(data, "registered_voters_summary");
    notification.success("Registered voters report downloaded");
  };

  const downloadCandidatesReport = () => {
    const data = allCandidates.map(candidate => ({
      "Candidate ID": candidate.id.toString(),
      Name: candidate.name,
      Party: candidate.party,
      Position: candidate.position,
      Region: candidate.region,
      "Votes Received": candidate.voteCount.toString(),
      "Image URL": candidate.imageUrl,
    }));

    downloadAsCSV(data, "candidates_report");
    notification.success("Candidates report downloaded");
  };

  const downloadGeographicalDistribution = () => {
    // Group candidates by region and position
    const regionData: { [key: string]: any } = {};

    allCandidates.forEach(candidate => {
      const region = candidate.region;
      if (!regionData[region]) {
        regionData[region] = {
          Region: region,
          "Total Candidates": 0,
          "Total Votes": 0,
          "President Candidates": 0,
          "Senator Candidates": 0,
          "Governor Candidates": 0,
          "President Votes": 0,
          "Senator Votes": 0,
          "Governor Votes": 0,
        };
      }

      regionData[region]["Total Candidates"]++;
      regionData[region]["Total Votes"] += candidate.voteCount;

      if (candidate.position === "president") {
        regionData[region]["President Candidates"]++;
        regionData[region]["President Votes"] += candidate.voteCount;
      } else if (candidate.position === "senator") {
        regionData[region]["Senator Candidates"]++;
        regionData[region]["Senator Votes"] += candidate.voteCount;
      } else if (candidate.position === "governor") {
        regionData[region]["Governor Candidates"]++;
        regionData[region]["Governor Votes"] += candidate.voteCount;
      }
    });

    const data = Object.values(regionData);
    downloadAsCSV(data, "geographical_distribution");
    notification.success("Geographical distribution report downloaded");
  };

  const downloadElectionAudit = () => {
    const totalVotes = allCandidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);
    const turnoutPercentage = totalVoters ? ((totalVotes / Number(totalVoters)) * 100).toFixed(2) : 0;

    const data = [
      {
        "Election Status": electionStatus?.[1] ? "Active" : "Inactive",
        "Registration Status": electionStatus?.[0] ? "Active" : "Inactive",
        "Total Registered Voters": totalVoters?.toString() || "0",
        "Total Candidates": candidateCount?.toString() || "0",
        "Total Votes Cast": totalVotes.toString(),
        "Voter Turnout (%)": turnoutPercentage,
        "Number of Regions": regions?.length || 0,
        "Registration Start": formatTimestamp(electionStatus?.[2]),
        "Registration End": formatTimestamp(electionStatus?.[3]),
        "Voting Start": formatTimestamp(electionStatus?.[4]),
        "Voting End": formatTimestamp(electionStatus?.[5]),
        "Audit Date": new Date().toLocaleDateString(),
        "Audit Time": new Date().toLocaleTimeString(),
      },
    ];

    downloadAsCSV(data, "election_audit_report");
    notification.success("Election audit report downloaded");
  };

  const downloadDetailedResults = () => {
    const data = allCandidates.map(candidate => ({
      "Candidate ID": candidate.id.toString(),
      Name: candidate.name,
      Party: candidate.party,
      Position: candidate.position,
      Region: candidate.region,
      "Votes Received": candidate.voteCount.toString(),
      "Percentage of Total Votes": totalVoters
        ? ((candidate.voteCount / Number(totalVoters)) * 100).toFixed(2) + "%"
        : "0%",
      "Image URL": candidate.imageUrl,
      "Report Date": new Date().toLocaleDateString(),
    }));

    downloadAsCSV(data, "detailed_results");
    notification.success("Detailed results report downloaded");
  };

  const downloadSystemLogs = () => {
    const data = [
      {
        "Admin Address": admin || "Not set",
        "Current User": address || "Not connected",
        "Is Admin": isAdmin ? "Yes" : "No",
        "Contract Status": "Active",
        "Last Updated": new Date().toLocaleString(),
        "System Version": "1.0.0",
        "Blockchain Network": "Local/Testnet",
        "Total Transactions": "N/A",
        "System Health": "Good",
      },
    ];

    downloadAsCSV(data, "system_logs");
    notification.success("System logs downloaded");
  };

  // Save current election state to database
  const handleSaveCurrentState = async () => {
    try {
      setIsSavingState(true);

      const totalVotes = allCandidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);
      const turnoutPercentage = totalVoters ? ((totalVotes / Number(totalVoters)) * 100).toFixed(2) : 0;

      // Prepare election status data
      const electionStatusData = {
        registrationActive: electionStatus?.[0] || false,
        votingActive: electionStatus?.[1] || false,
        registrationStart: formatTimestamp(electionStatus?.[2]),
        registrationEnd: formatTimestamp(electionStatus?.[3]),
        votingStart: formatTimestamp(electionStatus?.[4]),
        votingEnd: formatTimestamp(electionStatus?.[5]),
      };

      // Prepare voter data
      const voterData = {
        totalVoters: totalVoters?.toString() || "0",
        totalVotesCast: totalVotes.toString(),
        voterTurnoutPercentage: turnoutPercentage,
        remainingVoters: totalVoters ? (Number(totalVoters) - totalVotes).toString() : "0",
      };

      // Prepare candidate data
      const candidateData = allCandidates.map(candidate => ({
        id: candidate.id,
        name: candidate.name,
        party: candidate.party,
        position: candidate.position,
        region: candidate.region,
        voteCount: candidate.voteCount,
        imageUrl: candidate.imageUrl,
      }));

      // Prepare geographical data
      const regionData: { [key: string]: any } = {};
      allCandidates.forEach(candidate => {
        const region = candidate.region;
        if (!regionData[region]) {
          regionData[region] = {
            totalCandidates: 0,
            totalVotes: 0,
            presidentCandidates: 0,
            senatorCandidates: 0,
            governorCandidates: 0,
            presidentVotes: 0,
            senatorVotes: 0,
            governorVotes: 0,
          };
        }

        regionData[region].totalCandidates++;
        regionData[region].totalVotes += candidate.voteCount;

        if (candidate.position === "president") {
          regionData[region].presidentCandidates++;
          regionData[region].presidentVotes += candidate.voteCount;
        } else if (candidate.position === "senator") {
          regionData[region].senatorCandidates++;
          regionData[region].senatorVotes += candidate.voteCount;
        } else if (candidate.position === "governor") {
          regionData[region].governorCandidates++;
          regionData[region].governorVotes += candidate.voteCount;
        }
      });

      // Prepare audit data
      const auditData = {
        electionStatus: electionStatusData,
        totalRegisteredVoters: totalVoters?.toString() || "0",
        totalCandidates: candidateCount?.toString() || "0",
        totalVotesCast: totalVotes.toString(),
        voterTurnoutPercentage: turnoutPercentage,
        numberOfRegions: regions?.length || 0,
        auditDate: new Date().toLocaleDateString(),
        auditTime: new Date().toLocaleTimeString(),
      };

      // Prepare system data
      const systemData = {
        adminAddress: admin || "Not set",
        currentUser: address || "Not connected",
        isAdmin: isAdmin,
        contractStatus: "Active",
        lastUpdated: new Date().toLocaleString(),
        systemVersion: "1.0.0",
        blockchainNetwork: "Local/Testnet",
        systemHealth: "Good",
      };

      // Save to database
      const response = await fetch("/api/save-election-state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          electionStatus: electionStatusData,
          voterData: voterData,
          candidateData: candidateData,
          geographicalData: regionData,
          auditData: auditData,
          systemData: systemData,
          createdBy: address || "Unknown",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save election state");
      }

      const result = await response.json();

      if (result.success) {
        notification.success(`Election state saved successfully for ${new Date().getFullYear()}`);
      } else {
        throw new Error(result.error || "Failed to save election state");
      }
    } catch (error) {
      console.error("Error saving election state:", error);
      notification.error("Failed to save election state");
    } finally {
      setIsSavingState(false);
    }
  };

  // Handle election periods setting
  const handleSetElectionPeriods = async () => {
    try {
      const { registrationStart, registrationEnd, votingStart, votingEnd } = electionPeriods;

      if (!registrationStart || !registrationEnd || !votingStart || !votingEnd) {
        notification.error("All fields are required");
        return;
      }

      const regStartUnix = dateToUnix(registrationStart);
      const regEndUnix = dateToUnix(registrationEnd);
      const voteStartUnix = dateToUnix(votingStart);
      const voteEndUnix = dateToUnix(votingEnd);

      await writeYourContractAsync({
        functionName: "setElectionPeriods",
        args: [BigInt(regStartUnix), BigInt(regEndUnix), BigInt(voteStartUnix), BigInt(voteEndUnix)],
      });

      notification.success("Election periods set successfully");
      setElectionPeriods({ registrationStart: "", registrationEnd: "", votingStart: "", votingEnd: "" });
    } catch (error) {
      notification.error("Failed to set election periods");
      console.error(error);
    }
  };

  // Handle registration toggle
  const handleToggleRegistration = async () => {
    try {
      await writeYourContractAsync({
        functionName: "toggleRegistration",
      });
      notification.success("Registration status toggled");
    } catch (error) {
      notification.error("Failed to toggle registration");
      console.error(error);
    }
  };

  // Handle voting toggle
  const handleToggleVoting = async () => {
    try {
      await writeYourContractAsync({
        functionName: "toggleVoting",
      });
      notification.success("Voting status toggled");
    } catch (error) {
      notification.error("Failed to toggle voting");
      console.error(error);
    }
  };

  // Handle adding region
  const handleAddRegion = async () => {
    try {
      if (!newRegion.trim()) {
        notification.error("Region name is required");
        return;
      }

      await writeYourContractAsync({
        functionName: "addRegion",
        args: [newRegion.trim()],
      });

      notification.success("Region added successfully");
      setNewRegion("");
    } catch (error) {
      notification.error("Failed to add region");
      console.error(error);
    }
  };

  // Handle adding candidate
  const handleAddCandidate = async () => {
    try {
      const { name, party, position, region, imageUrl } = newCandidate;

      if (!name.trim() || !party.trim()) {
        notification.error("Name and party are required");
        return;
      }

      if (position !== "president" && !region.trim()) {
        notification.error("Region is required for non-presidential candidates");
        return;
      }

      await writeYourContractAsync({
        functionName: "addCandidate",
        args: [name.trim(), party.trim(), position, position === "president" ? "" : region.trim(), imageUrl.trim()],
      });

      notification.success("Candidate added successfully");
      setNewCandidate({ name: "", party: "", position: "president", region: "", imageUrl: "" });
    } catch (error) {
      notification.error("Failed to add candidate");
      console.error(error);
    }
  };

  // Handle deleting candidate
  const handleDeleteCandidate = async (candidateId: number) => {
    try {
      await writeYourContractAsync({
        functionName: "deactivateCandidate",
        args: [BigInt(candidateId)],
      });
      notification.success("Candidate deactivated successfully");
    } catch (error) {
      notification.error("Failed to deactivate candidate");
      console.error(error);
    }
  };

  // Handle emergency stop
  const handleEmergencyStop = async () => {
    try {
      await writeYourContractAsync({
        functionName: "emergencyStop",
      });
      notification.success("Emergency stop activated");
    } catch (error) {
      notification.error("Failed to activate emergency stop");
      console.error(error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
            <p className="text-gray-300">
              You are not authorized to access the admin dashboard. Only the contract admin can view this page.
            </p>
            <div className="mt-4">
              <p className="text-sm text-gray-400">
                Current Admin: <Address address={admin} />
              </p>
              <p className="text-sm text-gray-400">
                Your Address: <Address address={address} />
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-blue-400 mb-2">Election Admin Dashboard</h1>
              <p className="text-gray-400">Manage election settings, candidates, and monitor voting progress</p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              {/* Save Current State Button */}
              <button
                onClick={handleSaveCurrentState}
                disabled={isSavingState}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2"
              >
                <span>{isSavingState ? "⏳" : "💾"}</span>
                <span>{isSavingState ? "Saving..." : "Save Current State"}</span>
              </button>

              {/* Download Reports Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2"
                >
                  <span>📊</span>
                  <span>Download Reports</span>
                  <span className={`transform transition-transform ${isDownloadDropdownOpen ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                </button>

                {isDownloadDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-blue-400 mb-3">Download Audit Reports</h3>
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            downloadVoterTurnout();
                            setIsDownloadDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm transition-colors flex items-center space-x-2"
                        >
                          <span>📈</span>
                          <span>Voter Turnout Report</span>
                        </button>

                        <button
                          onClick={() => {
                            downloadRegisteredVoters();
                            setIsDownloadDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm transition-colors flex items-center space-x-2"
                        >
                          <span>👥</span>
                          <span>Registered Voters Summary</span>
                        </button>

                        <button
                          onClick={() => {
                            downloadCandidatesReport();
                            setIsDownloadDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm transition-colors flex items-center space-x-2"
                        >
                          <span>🏛️</span>
                          <span>Candidates Report</span>
                        </button>

                        <button
                          onClick={() => {
                            downloadGeographicalDistribution();
                            setIsDownloadDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm transition-colors flex items-center space-x-2"
                        >
                          <span>🗺️</span>
                          <span>Geographical Distribution</span>
                        </button>

                        <button
                          onClick={() => {
                            downloadDetailedResults();
                            setIsDownloadDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm transition-colors flex items-center space-x-2"
                        >
                          <span>📋</span>
                          <span>Detailed Results</span>
                        </button>

                        <button
                          onClick={() => {
                            downloadElectionAudit();
                            setIsDownloadDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm transition-colors flex items-center space-x-2"
                        >
                          <span>🔍</span>
                          <span>Complete Election Audit</span>
                        </button>

                        <button
                          onClick={() => {
                            downloadSystemLogs();
                            setIsDownloadDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded text-sm transition-colors flex items-center space-x-2"
                        >
                          <span>⚙️</span>
                          <span>System Logs</span>
                        </button>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <p className="text-xs text-gray-400">All reports are downloaded as CSV files with timestamps</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Total Voters</h3>
            <p className="text-3xl font-bold">{totalVoters?.toString() || "0"}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-green-400 mb-2">Total Candidates</h3>
            <p className="text-3xl font-bold">{candidateCount?.toString() || "0"}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">Regions</h3>
            <p className="text-3xl font-bold">{regions?.length || "0"}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Current Time</h3>
            <p className="text-sm">{new Date().toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Election Status */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-blue-400 mb-6">Election Status</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Registration Active:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    electionStatus?.[0] ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                  }`}
                >
                  {electionStatus?.[0] ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Voting Active:</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    electionStatus?.[1] ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                  }`}
                >
                  {electionStatus?.[1] ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <span className="text-gray-300 text-sm">Registration Start:</span>
                <p className="text-white">{formatTimestamp(electionStatus?.[2])}</p>
              </div>
              <div>
                <span className="text-gray-300 text-sm">Registration End:</span>
                <p className="text-white">{formatTimestamp(electionStatus?.[3])}</p>
              </div>
              <div>
                <span className="text-gray-300 text-sm">Voting Start:</span>
                <p className="text-white">{formatTimestamp(electionStatus?.[4])}</p>
              </div>
              <div>
                <span className="text-gray-300 text-sm">Voting End:</span>
                <p className="text-white">{formatTimestamp(electionStatus?.[5])}</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleToggleRegistration}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Toggle Registration
              </button>
              <button
                onClick={handleToggleVoting}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Toggle Voting
              </button>
            </div>
          </div>

          {/* Election Periods */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-blue-400 mb-6">Set Election Periods</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Registration Start</label>
                <input
                  type="datetime-local"
                  value={electionPeriods.registrationStart}
                  onChange={e => setElectionPeriods(prev => ({ ...prev, registrationStart: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                {electionPeriods.registrationStart && (
                  <p className="text-xs text-gray-400 mt-1">Unix: {dateToUnix(electionPeriods.registrationStart)}</p>
                )}
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Registration End</label>
                <input
                  type="datetime-local"
                  value={electionPeriods.registrationEnd}
                  onChange={e => setElectionPeriods(prev => ({ ...prev, registrationEnd: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                {electionPeriods.registrationEnd && (
                  <p className="text-xs text-gray-400 mt-1">Unix: {dateToUnix(electionPeriods.registrationEnd)}</p>
                )}
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Voting Start</label>
                <input
                  type="datetime-local"
                  value={electionPeriods.votingStart}
                  onChange={e => setElectionPeriods(prev => ({ ...prev, votingStart: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                {electionPeriods.votingStart && (
                  <p className="text-xs text-gray-400 mt-1">Unix: {dateToUnix(electionPeriods.votingStart)}</p>
                )}
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Voting End</label>
                <input
                  type="datetime-local"
                  value={electionPeriods.votingEnd}
                  onChange={e => setElectionPeriods(prev => ({ ...prev, votingEnd: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                {electionPeriods.votingEnd && (
                  <p className="text-xs text-gray-400 mt-1">Unix: {dateToUnix(electionPeriods.votingEnd)}</p>
                )}
              </div>
              <button
                onClick={handleSetElectionPeriods}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                Set Election Periods
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Add Region */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-blue-400 mb-6">Add Region</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Region Name</label>
                <input
                  type="text"
                  value={newRegion}
                  onChange={e => setNewRegion(e.target.value)}
                  placeholder="e.g., Kisumu, Nairobi, Mombasa"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleAddRegion}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                Add Region
              </button>
            </div>

            {regions && regions.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-300 mb-3">Existing Regions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {regions.map((region, index) => (
                    <div key={index} className="bg-gray-700 px-3 py-2 rounded text-sm">
                      {region}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Add Candidate */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-blue-400 mb-6">Add Candidate</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">Name</label>
                <input
                  type="text"
                  value={newCandidate.name}
                  onChange={e => setNewCandidate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Candidate full name"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Party</label>
                <input
                  type="text"
                  value={newCandidate.party}
                  onChange={e => setNewCandidate(prev => ({ ...prev, party: e.target.value }))}
                  placeholder="Political party"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Position</label>
                <select
                  value={newCandidate.position}
                  onChange={e => setNewCandidate(prev => ({ ...prev, position: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="president">President</option>
                  <option value="senator">Senator</option>
                  <option value="governor">Governor</option>
                </select>
              </div>
              {newCandidate.position !== "president" && (
                <div>
                  <label className="block text-gray-300 text-sm mb-2">Region</label>
                  <input
                    type="text"
                    value={newCandidate.region}
                    onChange={e => setNewCandidate(prev => ({ ...prev, region: e.target.value }))}
                    placeholder="Region for this position"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-gray-300 text-sm mb-2">Image URL</label>
                <input
                  type="url"
                  value={newCandidate.imageUrl}
                  onChange={e => setNewCandidate(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://example.com/candidate-image.jpg"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Provide a direct link to the candidate&apos;s image (JPG, PNG, etc.)
                </p>
              </div>
              <button
                onClick={handleAddCandidate}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                Add Candidate
              </button>
            </div>
          </div>
        </div>

        {/* Manage Candidates */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-blue-400 mb-6">Manage Candidates</h2>

          <div className="space-y-4">
            {allCandidates.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-400 text-lg">No candidates added yet.</p>
                <p className="text-gray-500 text-sm mt-2">Add candidates using the form above.</p>
              </div>
            )}

            {allCandidates.map(candidate => (
              <div
                key={candidate.id}
                className="bg-gray-700 rounded-lg p-6 flex items-center justify-between border border-gray-600 hover:border-gray-500 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-600 flex items-center justify-center">
                    {candidate.imageUrl ? (
                      <img
                        src={candidate.imageUrl}
                        alt={candidate.name}
                        className="w-full h-full object-cover"
                        onError={e => {
                          e.currentTarget.src = "/placeholder.png";
                        }}
                      />
                    ) : (
                      <div className="text-gray-400 text-2xl">👤</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{candidate.name}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          candidate.position === "president"
                            ? "bg-purple-900 text-purple-300"
                            : candidate.position === "senator"
                              ? "bg-blue-900 text-blue-300"
                              : "bg-green-900 text-green-300"
                        }`}
                      >
                        {candidate.position.charAt(0).toUpperCase() + candidate.position.slice(1)}
                      </span>
                    </div>
                    <p className="text-gray-300 font-medium mb-1">{candidate.party}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>Region: {candidate.region}</span>
                      <span>Votes: {candidate.voteCount}</span>
                      <span>ID: #{candidate.id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => handleDeleteCandidate(candidate.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2"
                  >
                    <span>🗑️</span>
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {allCandidates.length > 0 && (
            <div className="mt-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
              <div className="flex justify-between items-center text-sm text-gray-400">
                <span>Total Candidates: {allCandidates.length}</span>
                <span>Total Votes Cast: {allCandidates.reduce((sum, candidate) => sum + candidate.voteCount, 0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Emergency Controls */}
        <div className="mt-8 bg-red-900/20 border border-red-500 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Emergency Controls</h2>
          <p className="text-gray-300 mb-4">
            Use these controls only in emergency situations. This will immediately stop all voting and registration
            activities.
          </p>
          <button
            onClick={handleEmergencyStop}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Emergency Stop
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
