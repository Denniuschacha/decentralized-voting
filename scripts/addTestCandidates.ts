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

  // Verify candidates were added
  console.log("\nVerifying candidates...");
  const candidateCount = await contract.candidateCount();
  console.log(`Total candidates in contract: ${candidateCount}`);

  // Check candidates by position
  for (const position of ["president", "senator", "governor"]) {
    const candidates = await contract.getCandidatesByPosition(position);
    console.log(`${position} candidates: ${candidates.length}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
