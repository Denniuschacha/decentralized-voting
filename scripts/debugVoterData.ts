import { ethers } from "hardhat";
import { YourContract } from "../typechain-types";

async function main() {
  // Get the deployed contract
  const YourContractFactory = await ethers.getContractFactory("YourContract");

  // Replace this with your deployed contract address
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Default localhost address
  const contract = YourContractFactory.attach(contractAddress) as YourContract;

  console.log("🔍 Debugging Voter Data...\n");

  // Get basic contract info
  const totalVoters = await contract.getTotalVoters();
  const voterCount = await contract.voterCount();

  console.log("=== Contract State ===");
  console.log(`Total Voters: ${totalVoters}`);
  console.log(`Voter Count: ${voterCount}`);

  if (Number(voterCount) === 0) {
    console.log("❌ No voters found. Please register some voters first.");
    return;
  }

  // Get all voter addresses
  console.log("\n=== Voter Details ===");
  let totalRegistered = 0;
  let totalVoted = 0;
  let votersWithVotes = 0;

  for (let i = 0; i < Number(voterCount); i++) {
    try {
      const address = await contract.voterAddresses(i);
      const voterInfo = await contract.getVoterInfo(address);

      console.log(`\nVoter ${i + 1}:`);
      console.log(`  Address: ${address}`);
      console.log(`  National ID: ${voterInfo.nationalId}`);
      console.log(`  Region: ${voterInfo.region}`);
      console.log(`  Is Registered: ${voterInfo.isRegistered}`);
      console.log(`  Has Voted: ${voterInfo.hasVoted}`);
      console.log(
        `  Voted Positions: [${voterInfo.votedPositions
          .map((v: boolean, idx: number) => {
            const positions = ["President", "Senator", "Governor"];
            return v ? positions[idx] : "None";
          })
          .join(", ")}]`,
      );

      if (voterInfo.isRegistered) {
        totalRegistered++;
      }

      if (voterInfo.hasVoted) {
        totalVoted++;
      }

      // Check if they voted for any position
      const hasVotedForAny = voterInfo.votedPositions.some((v: boolean) => v);
      if (hasVotedForAny) {
        votersWithVotes++;
      }
    } catch (error) {
      console.log(`Error getting voter ${i}:`, error);
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total Registered Voters: ${totalRegistered}`);
  console.log(`Voters with hasVoted=true: ${totalVoted}`);
  console.log(`Voters who voted for any position: ${votersWithVotes}`);
  console.log(`Voters who haven't voted: ${totalRegistered - votersWithVotes}`);

  // Check candidate vote counts
  console.log("\n=== Candidate Vote Counts ===");
  for (const position of ["president", "senator", "governor"]) {
    console.log(`\n${position.toUpperCase()}:`);
    const candidates = await contract.getCandidatesByPosition(position);
    for (const candidateId of candidates) {
      const candidate = await contract.candidates(candidateId);
      console.log(`  ${candidate.name} (${candidate.party}): ${candidate.voteCount} votes`);
    }
  }

  // Calculate expected donut data
  console.log("\n=== Expected Donut Data ===");
  console.log(`Total: ${totalRegistered}`);
  console.log(`Voted: ${votersWithVotes}`);
  console.log(`Not Voted: ${totalRegistered - votersWithVotes}`);
  console.log(`Voted %: ${totalRegistered > 0 ? ((votersWithVotes / totalRegistered) * 100).toFixed(1) : 0}%`);
  console.log(
    `Not Voted %: ${totalRegistered > 0 ? (((totalRegistered - votersWithVotes) / totalRegistered) * 100).toFixed(1) : 0}%`,
  );

  console.log("\n🎯 Debug completed! Check the results page to see if it matches this data.");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
