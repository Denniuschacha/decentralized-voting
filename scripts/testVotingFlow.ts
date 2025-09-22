import { ethers } from "hardhat";
import { YourContract } from "../typechain-types";

async function main() {
  // Get the deployed contract
  const YourContractFactory = await ethers.getContractFactory("YourContract");

  // Replace this with your deployed contract address
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Default localhost address
  const contract = YourContractFactory.attach(contractAddress) as YourContract;

  // Get signers
  const [admin, voter1, voter2] = await ethers.getSigners();
  console.log("Admin address:", admin.address);
  console.log("Voter 1 address:", voter1.address);
  console.log("Voter 2 address:", voter2.address);

  // Check election status
  const electionStatus = await contract.getElectionStatus();
  console.log("\n=== Election Status ===");
  console.log(`Registration Active: ${electionStatus.regActive}`);
  console.log(`Voting Active: ${electionStatus.votingActive_}`);

  if (!electionStatus.regActive || !electionStatus.votingActive_) {
    console.log("❌ Registration or voting is not active. Please run setup-voting first.");
    return;
  }

  // Check current state
  console.log("\n=== Current State ===");
  const totalVoters = await contract.getTotalVoters();
  const voterCount = await contract.voterCount();
  console.log(`Total Voters: ${totalVoters}`);
  console.log(`Voter Count: ${voterCount}`);

  // Get candidate information
  console.log("\n=== Candidates ===");
  for (const position of ["president", "senator", "governor"]) {
    const candidates = await contract.getCandidatesByPosition(position);
    console.log(`${position} candidates: ${candidates.length}`);
    for (const candidateId of candidates) {
      const candidate = await contract.candidates(candidateId);
      console.log(`  ID ${candidateId}: ${candidate.name} (${candidate.party}) - ${candidate.voteCount} votes`);
    }
  }

  // Test voter registration and voting
  console.log("\n=== Testing Voter Registration and Voting ===");

  try {
    // Register voter 1
    console.log(`\nRegistering ${voter1.address}...`);
    const registerTx1 = await contract.connect(voter1).registerVoter("TEST123456", "California");
    await registerTx1.wait();
    console.log("✅ Voter 1 registered");

    // Get voter info
    const voterInfo1 = await contract.getVoterInfo(voter1.address);
    console.log("Voter 1 info:", {
      isRegistered: voterInfo1.isRegistered,
      hasVoted: voterInfo1.hasVoted,
      nationalId: voterInfo1.nationalId,
      votedPositions: voterInfo1.votedPositions,
    });

    // Vote for president (candidate ID 1)
    console.log("\nVoting for president (candidate ID 1)...");
    const voteTx1 = await contract.connect(voter1).vote(1);
    await voteTx1.wait();
    console.log("✅ Voter 1 voted for president");

    // Get updated voter info
    const voterInfo1After = await contract.getVoterInfo(voter1.address);
    console.log("Voter 1 info after voting:", {
      isRegistered: voterInfo1After.isRegistered,
      hasVoted: voterInfo1After.hasVoted,
      nationalId: voterInfo1After.nationalId,
      votedPositions: voterInfo1After.votedPositions,
    });

    // Register voter 2
    console.log(`\nRegistering ${voter2.address}...`);
    const registerTx2 = await contract.connect(voter2).registerVoter("TEST789012", "Texas");
    await registerTx2.wait();
    console.log("✅ Voter 2 registered");

    // Vote for president (candidate ID 2)
    console.log("\nVoting for president (candidate ID 2)...");
    const voteTx2 = await contract.connect(voter2).vote(2);
    await voteTx2.wait();
    console.log("✅ Voter 2 voted for president");

    // Vote for senator (candidate ID 6 - Texas senator)
    console.log("\nVoting for senator (candidate ID 6)...");
    const voteTx3 = await contract.connect(voter2).vote(6);
    await voteTx3.wait();
    console.log("✅ Voter 2 voted for senator");

    // Vote for governor (candidate ID 8 - Texas governor)
    console.log("\nVoting for governor (candidate ID 8)...");
    const voteTx4 = await contract.connect(voter2).vote(8);
    await voteTx4.wait();
    console.log("✅ Voter 2 voted for governor");

    // Get updated voter info for voter 2
    const voterInfo2After = await contract.getVoterInfo(voter2.address);
    console.log("Voter 2 info after voting:", {
      isRegistered: voterInfo2After.isRegistered,
      hasVoted: voterInfo2After.hasVoted,
      nationalId: voterInfo2After.nationalId,
      votedPositions: voterInfo2After.votedPositions,
    });
  } catch (error) {
    console.log("❌ Error during testing:", error);
  }

  // Check final state
  console.log("\n=== Final State ===");
  const finalTotalVoters = await contract.getTotalVoters();
  const finalVoterCount = await contract.voterCount();
  console.log(`Total Voters: ${finalTotalVoters}`);
  console.log(`Voter Count: ${finalVoterCount}`);

  // Get updated candidate information
  console.log("\n=== Updated Candidates ===");
  for (const position of ["president", "senator", "governor"]) {
    const candidates = await contract.getCandidatesByPosition(position);
    console.log(`${position} candidates: ${candidates.length}`);
    for (const candidateId of candidates) {
      const candidate = await contract.candidates(candidateId);
      console.log(`  ID ${candidateId}: ${candidate.name} (${candidate.party}) - ${candidate.voteCount} votes`);
    }
  }

  // Get voter addresses
  console.log("\n=== Voter Addresses ===");
  for (let i = 0; i < finalVoterCount; i++) {
    try {
      const address = await contract.voterAddresses(i);
      const voterInfo = await contract.getVoterInfo(address);
      console.log(
        `Voter ${i}: ${address} - Registered: ${voterInfo.isRegistered}, Voted: ${voterInfo.hasVoted}, National ID: ${voterInfo.nationalId}`,
      );
    } catch (error) {
      console.log(`Error getting voter ${i}:`, error);
    }
  }

  console.log("\n🎉 Test completed! Check the results page to see if the data is updating correctly.");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
