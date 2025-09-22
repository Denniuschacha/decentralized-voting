import { ethers } from "hardhat";
import { YourContract } from "../typechain-types";

async function main() {
  // Get the deployed contract
  const YourContractFactory = await ethers.getContractFactory("YourContract");

  // Replace this with your deployed contract address
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Default localhost address
  const contract = YourContractFactory.attach(contractAddress) as YourContract;

  // Get signers (we'll use multiple accounts to simulate different voters)
  const [admin, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners();
  console.log("Admin address:", admin.address);

  // Test voter registrations and votes
  const testVoters = [
    {
      signer: voter1,
      nationalId: "1234567890",
      region: "California",
      votes: [1, 4, 7], // president, senator, governor candidate IDs
    },
    {
      signer: voter2,
      nationalId: "2345678901",
      region: "Texas",
      votes: [2, 6, 8], // president, senator, governor candidate IDs
    },
    {
      signer: voter3,
      nationalId: "3456789012",
      region: "New York",
      votes: [3, 4, 9], // president, senator, governor candidate IDs
    },
    {
      signer: voter4,
      nationalId: "4567890123",
      region: "California",
      votes: [1, 5, 7], // president, senator, governor candidate IDs
    },
    {
      signer: voter5,
      nationalId: "5678901234",
      region: "Texas",
      votes: [2, 6, 8], // president, senator, governor candidate IDs
    },
  ];

  // Check if voting is active
  const electionStatus = await contract.getElectionStatus();
  console.log("Election Status:");
  console.log(`Registration Active: ${electionStatus.regActive}`);
  console.log(`Voting Active: ${electionStatus.votingActive_}`);

  if (!electionStatus.regActive) {
    console.log("❌ Registration is not active. Please enable registration first.");
    return;
  }

  if (!electionStatus.votingActive_) {
    console.log("❌ Voting is not active. Please enable voting first.");
    return;
  }

  // Register and vote for each test voter
  for (const voter of testVoters) {
    try {
      console.log(`\nProcessing voter: ${voter.signer.address}`);

      // Register voter
      console.log(`Registering voter with National ID: ${voter.nationalId}`);
      const registerTx = await contract.connect(voter.signer).registerVoter(voter.nationalId, voter.region);
      await registerTx.wait();
      console.log(`✅ Registered voter: ${voter.nationalId}`);

      // Cast votes
      console.log("Casting votes...");
      for (let i = 0; i < voter.votes.length; i++) {
        const candidateId = voter.votes[i];
        const positions = ["president", "senator", "governor"];
        const position = positions[i];

        try {
          const voteTx = await contract.connect(voter.signer).vote(candidateId);
          await voteTx.wait();
          console.log(`✅ Voted for ${position} candidate ID: ${candidateId}`);
        } catch (error) {
          console.log(`❌ Failed to vote for ${position} candidate ID ${candidateId}:`, error);
        }
      }
    } catch (error) {
      console.log(`❌ Failed to process voter ${voter.signer.address}:`, error);
    }
  }

  // Verify results
  console.log("\n📊 Verifying results...");

  for (const position of ["president", "senator", "governor"]) {
    console.log(`\n${position.toUpperCase()} Results:`);
    const results = await contract.getLiveResults(position);

    for (let i = 0; i < results.names.length; i++) {
      console.log(`${results.names[i]} (${results.parties[i]}): ${results.voteCounts[i]} votes`);
    }
  }

  // Check total voters
  const totalVoters = await contract.getTotalVoters();
  console.log(`\nTotal registered voters: ${totalVoters}`);

  console.log("\n🎉 Test votes added successfully!");
  console.log("You can now view the results at /results");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
