import { ethers } from "hardhat";
import { YourContract } from "../typechain-types";

async function main() {
  // Get the deployed contract
  const YourContractFactory = await ethers.getContractFactory("YourContract");

  // Replace this with your deployed contract address
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Default localhost address
  const contract = YourContractFactory.attach(contractAddress) as YourContract;

  // Get the signer (admin)
  const [admin] = await ethers.getSigners();
  console.log("Admin address:", admin.address);

  // Test candidates with simple, reliable image URLs
  const testCandidates = [
    // Presidential candidates
    {
      name: "John Smith",
      party: "Democratic Party",
      position: "president",
      region: "",
      imageUrl: "https://picsum.photos/400/300?random=1",
    },
    {
      name: "Sarah Johnson",
      party: "Republican Party",
      position: "president",
      region: "",
      imageUrl: "https://picsum.photos/400/300?random=2",
    },
    {
      name: "Michael Brown",
      party: "Independent",
      position: "president",
      region: "",
      imageUrl: "https://picsum.photos/400/300?random=3",
    },
    // Senator candidates
    {
      name: "Emily Davis",
      party: "Democratic Party",
      position: "senator",
      region: "California",
      imageUrl: "https://picsum.photos/400/300?random=4",
    },
    {
      name: "Robert Wilson",
      party: "Republican Party",
      position: "senator",
      region: "California",
      imageUrl: "https://picsum.photos/400/300?random=5",
    },
    {
      name: "Lisa Anderson",
      party: "Democratic Party",
      position: "senator",
      region: "Texas",
      imageUrl: "https://picsum.photos/400/300?random=6",
    },
    // Governor candidates
    {
      name: "David Martinez",
      party: "Republican Party",
      position: "governor",
      region: "California",
      imageUrl: "https://picsum.photos/400/300?random=7",
    },
    {
      name: "Jennifer Lee",
      party: "Democratic Party",
      position: "governor",
      region: "Texas",
      imageUrl: "https://picsum.photos/400/300?random=8",
    },
    {
      name: "Thomas Garcia",
      party: "Independent",
      position: "governor",
      region: "New York",
      imageUrl: "https://picsum.photos/400/300?random=9",
    },
  ];

  // Add regions first
  const regions = ["California", "Texas", "New York", "Florida", "Illinois"];
  console.log("Adding regions...");
  for (const region of regions) {
    try {
      const tx = await contract.addRegion(region);
      await tx.wait();
      console.log(`✅ Added region: ${region}`);
    } catch (error) {
      console.log(`⚠️  Region ${region} might already exist or error:`, error);
    }
  }

  // Add candidates
  console.log("\nAdding candidates...");
  for (const candidate of testCandidates) {
    try {
      const tx = await contract.addCandidate(
        candidate.name,
        candidate.party,
        candidate.position,
        candidate.region,
        candidate.imageUrl,
      );
      await tx.wait();
      console.log(`✅ Added candidate: ${candidate.name} (${candidate.position})`);
    } catch (error) {
      console.log(`❌ Failed to add candidate ${candidate.name}:`, error);
    }
  }

  // Set election periods (start immediately and run for 1 hour)
  const now = Math.floor(Date.now() / 1000);
  const oneHour = 3600;

  console.log("\nSetting election periods...");
  try {
    const tx = await contract.setElectionPeriods(
      now, // registration start
      now + oneHour, // registration end
      now + oneHour, // voting start
      now + 2 * oneHour, // voting end
    );
    await tx.wait();
    console.log("✅ Election periods set");
  } catch (error) {
    console.log("⚠️  Election periods might already be set or error:", error);
  }

  // Enable registration
  console.log("\nEnabling registration...");
  try {
    const tx = await contract.toggleRegistration();
    await tx.wait();
    console.log("✅ Registration enabled");
  } catch (error) {
    console.log("⚠️  Registration toggle error:", error);
  }

  // Enable voting
  console.log("\nEnabling voting...");
  try {
    const tx = await contract.toggleVoting();
    await tx.wait();
    console.log("✅ Voting enabled");
  } catch (error) {
    console.log("⚠️  Voting toggle error:", error);
  }

  // Verify setup
  console.log("\nVerifying setup...");
  const candidateCount = await contract.candidateCount();
  console.log(`Total candidates in contract: ${candidateCount}`);

  // Check candidates by position
  for (const position of ["president", "senator", "governor"]) {
    const candidates = await contract.getCandidatesByPosition(position);
    console.log(`${position} candidates: ${candidates.length}`);
  }

  // Check election status
  const electionStatus = await contract.getElectionStatus();
  console.log("\nElection Status:");
  console.log(`Registration Active: ${electionStatus.regActive}`);
  console.log(`Voting Active: ${electionStatus.votingActive_}`);
  console.log(
    `Registration Period: ${new Date(Number(electionStatus.regStart) * 1000).toLocaleString()} - ${new Date(Number(electionStatus.regEnd) * 1000).toLocaleString()}`,
  );
  console.log(
    `Voting Period: ${new Date(Number(electionStatus.voteStart) * 1000).toLocaleString()} - ${new Date(Number(electionStatus.voteEnd) * 1000).toLocaleString()}`,
  );

  console.log("\n🎉 Voting system setup complete!");
  console.log("You can now:");
  console.log("1. Register voters at /registration");
  console.log("2. Vote at /voting");
  console.log("3. View results at /results");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
