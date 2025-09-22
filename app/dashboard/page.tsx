"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth/useScaffoldReadContract";

function useCountdown(
  votingActive: boolean | undefined,
  votingStart: bigint | undefined,
  votingEnd: bigint | undefined,
) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  useEffect(() => {
    if (!votingActive || !votingEnd) {
      setTimeLeft("");
      return;
    }
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const end = Number(votingEnd);
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft("Voting ended");
        return;
      }
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s left to vote`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [votingActive, votingEnd]);
  return timeLeft;
}

function useCandidatesByPosition(position: string) {
  // Get candidate details directly from the contract using getResults
  const { data: candidateData } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getResults",
    args: [position],
  });

  // Transform the data into a more usable format
  const candidates = React.useMemo(() => {
    if (!candidateData) return [];

    const [candidateIds, names, parties, imageUrls, voteCounts] = candidateData;

    if (!candidateIds || candidateIds.length === 0) return [];

    return candidateIds.map((id: bigint, index: number) => ({
      id: Number(id),
      name: names[index] || `Candidate ${index + 1}`,
      party: parties[index] || "Independent",
      imageUrl: imageUrls[index] || "",
      voteCount: Number(voteCounts[index] || 0),
    }));
  }, [candidateData, position]);

  return candidates;
}

const CandidateSlideshow: React.FC<{ position: string }> = ({ position }) => {
  const candidates = useCandidatesByPosition(position);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"in" | "out">("in");

  useEffect(() => {
    if (candidates.length === 0) return;

    const interval = setInterval(() => {
      setSlideDirection("out");
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % candidates.length);
        setSlideDirection("in");
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, [candidates.length, position]);

  // Get candidate data
  const getCandidate = (i: number) => {
    if (candidates[i]) {
      return {
        ...candidates[i],
        img: candidates[i].imageUrl || "",
      };
    }
    return {
      name: position.charAt(0).toUpperCase() + position.slice(1),
      party: "Independent",
      img: "",
    };
  };

  // Don't render if no candidates
  if (candidates.length === 0) {
    return (
      <div className="relative h-40 w-full rounded-2xl overflow-hidden bg-gray-900 border border-gray-700 flex items-center justify-center">
        <span className="text-gray-400 text-lg">No candidates available</span>
      </div>
    );
  }

  return (
    <div className="relative h-80 w-full rounded-2xl overflow-hidden">
      {/* Stacking cards effect */}
      {candidates.map((_, idx) => {
        const candidate = getCandidate(idx);
        const isCurrent = idx === currentIndex;
        const isNext = idx === (currentIndex + 1) % candidates.length;
        const isPrev = idx === (currentIndex - 1 + candidates.length) % candidates.length;

        let transform = "";
        let opacity = 0;
        let zIndex = 0;

        if (isCurrent) {
          transform = slideDirection === "in" ? "translateY(0)" : "translateY(-100%)";
          opacity = slideDirection === "in" ? 1 : 0;
          zIndex = 20;
        } else if (isNext) {
          transform = "translateY(100%)";
          opacity = 0;
          zIndex = 10;
        } else if (isPrev) {
          transform = "translateY(-100%)";
          opacity = 0;
          zIndex = 5;
        } else {
          transform = "translateY(100%)";
          opacity = 0;
          zIndex = 1;
        }

        return (
          <div
            key={idx}
            className="absolute inset-0 transition-all duration-500 ease-in-out"
            style={{
              transform,
              opacity,
              zIndex,
            }}
          >
            {/* Full coverage background image */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${candidate.img})`,
              }}
            />

            {/* Background image */}
            <img
              src={candidate.img}
              alt={candidate.name}
              className="absolute inset-0 w-full h-full object-cover opacity-0"
            />

            {/* Subtle gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {/* Position tag - floating at top */}
            <div className="absolute top-6 left-6">
              <span className="bg-black/60 text-white text-sm px-4 py-2 rounded-full shadow-lg backdrop-blur-sm border border-white/20">
                {position.charAt(0).toUpperCase() + position.slice(1)}
              </span>
            </div>

            {/* Candidate name - floating at bottom */}
            <div className="absolute bottom-6 left-0 w-full flex justify-center">
              <span className="bg-black/70 text-white font-bold px-4 py-2 rounded-full text-xl shadow-xl backdrop-blur-sm border border-white/20">
                {candidate.name}
              </span>
            </div>

            {/* Party info - floating at bottom right */}
            <div className="absolute bottom-6 right-6">
              <span className="bg-black/60 text-white text-sm px-2 py-1 rounded-full shadow-lg backdrop-blur-sm border border-white/20">
                {candidate.party}
              </span>
            </div>
          </div>
        );
      })}

      {/* Loading indicator */}
      <div className="absolute top-4 right-4 flex space-x-1">
        {candidates.map((_, idx) => (
          <div
            key={idx}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              idx === currentIndex ? "bg-white" : "bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const { address: connectedAddress } = useAccount();

  // Voting status
  const { data: electionStatus } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getElectionStatus",
  });
  const votingActive = electionStatus?.[1];
  const votingStart = electionStatus?.[4];
  const votingEnd = electionStatus?.[5];
  const timer = useCountdown(votingActive, votingStart, votingEnd);

  // User status
  const { data: voterInfo } = useScaffoldReadContract({
    contractName: "YourContract",
    functionName: "getVoterInfo",
    args: [connectedAddress],
    watch: true,
  });
  const isRegistered = voterInfo?.[0];

  // Layout
  return (
    <div className="min-h-screen bg-black text-white px-2 py-6">
      {/* Title and Timer */}
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-4xl md:text-6xl font-bold mb-2 text-center text-[#ff9d5c]">Vote Without Rigging</h1>
        <p className="text-lg text-gray-300 mb-2 text-center max-w-2xl">
          The only truly decentralized and transparent way of voting. <br /> Vote right. Vote your choice
        </p>
        <div className="bg-gray-900 text-green-400 px-6 py-2 rounded-full font-mono text-lg shadow mb-2">
          {votingActive ? timer : "Voting not started"}
        </div>
      </div>
      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Left Column */}
        <div className="flex flex-col gap-8">
          {/* Top Left: Presidentials */}
          <div className="bg-gray-950 rounded-3xl p-6 shadow-lg">
            <CandidateSlideshow position="president" />
          </div>
          {/* Bottom Left: Governors */}
          <div className="bg-gray-950 rounded-3xl p-6 shadow-lg">
            <CandidateSlideshow position="governor" />
          </div>
        </div>
        {/* Right Column: User Status and Results */}
        <div className="md:col-span-2 flex flex-col gap-8">
          <div className="bg-gray-950 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center min-h-[250px]">
            <h2 className="font-bold text-2xl mb-4">Your Voting Status</h2>
            <div className="mb-3">
              <span className="text-gray-300 text-base">Connected Address:</span>
              <div className="mt-1">
                <Address address={connectedAddress} />
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-300 text-base">Approval Status:</span>
              {isRegistered ? (
                <>
                  <CheckCircleIcon className="h-6 w-6 text-green-500" />
                  <span className="text-green-400 font-semibold text-base">Approved to vote</span>
                </>
              ) : (
                <>
                  <XCircleIcon className="h-6 w-6 text-red-500" />
                  <span className="text-red-400 font-semibold text-base">Not approved</span>
                </>
              )}
            </div>
            <div className="mb-4 text-center">
              {isRegistered ? (
                <span className="text-green-300 text-base">
                  You are approved! Go exercise your rights and vote for your favorite candidates.
                </span>
              ) : (
                <span className="text-red-300 text-base">
                  You are not approved to vote. You can still view the results and stay informed!
                </span>
              )}
            </div>
            {isRegistered ? (
              <div className="flex gap-3">
                <Link
                  href="/voting"
                  className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full text-base font-semibold transition"
                >
                  Go Vote
                </Link>
                <Link
                  href="/results"
                  className="mt-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full text-base font-semibold transition"
                >
                  View Results
                </Link>
              </div>
            ) : (
              <Link
                href="/results"
                className="mt-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full text-base font-semibold transition"
              >
                Go view results live
              </Link>
            )}
          </div>
          {/* Bottom Right: Senators */}
          <div className="bg-gray-950 rounded-3xl p-6 shadow-lg">
            <CandidateSlideshow position="senator" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
