//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

// Useful for debugging. Remove when deploying to a live network.
import "hardhat/console.sol";

contract YourContract {
    // Election administrator
    address public admin;
    
    // Election state
    bool public votingActive = false;
    bool public registrationActive = false;
    
    // Voting periods
    uint256 public registrationStart;
    uint256 public registrationEnd;
    uint256 public votingStart;
    uint256 public votingEnd;
    
    // Structs
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        string region; // State/Province/Region identifier
        string nationalId; // National ID for unique identification
        address voterAddress;
    }
    
    struct Candidate {
        uint256 id;
        string name;
        string party;
        string position; // "president", "senator", "governor"
        string region; // Empty for president, specific region for others
        string imageUrl; // URL to candidate's image
        uint256 voteCount;
        bool isActive;
    }
    
    // Mappings
    mapping(address => Voter) public voters;
    mapping(string => address) public nationalIdToAddress; // nationalId => wallet address
    mapping(address => bool) public addressUsed; // prevent address reuse
    mapping(uint256 => Candidate) public candidates;
    mapping(address => mapping(string => bool)) public hasVotedForPosition; // voter => position => hasVoted
    mapping(string => string[]) public regionPositions; // region => available positions
    
    // Live results tracking
    mapping(string => uint256) public totalVotesByPosition; // position => total votes cast
    mapping(string => mapping(string => uint256)) public totalVotesByRegion; // position => region => total votes
    
    // Arrays
    address[] public voterAddresses;
    uint256[] public candidateIds;
    string[] public regions;
    
    // Counters
    uint256 public candidateCount = 0;
    uint256 public voterCount = 0;
    
    // Events
    event VoterRegistered(address indexed voter, string nationalId, string region);
    event CandidateAdded(uint256 indexed candidateId, string name, string position, string region, string imageUrl);
    event VoteCast(address indexed voter, uint256 indexed candidateId, string position, uint256 newVoteCount);
    event ElectionPhaseChanged(string phase, bool active);
    event LiveResultsUpdate(string position, uint256 totalVotes);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyDuringRegistration() {
        require(registrationActive, "Registration is not active");
        require(block.timestamp >= registrationStart && block.timestamp <= registrationEnd, "Outside registration period");
        _;
    }
    
    modifier onlyDuringVoting() {
        require(votingActive, "Voting is not active");
        require(block.timestamp >= votingStart && block.timestamp <= votingEnd, "Outside voting period");
        _;
    }
    
    modifier onlyRegisteredVoter() {
        require(voters[msg.sender].isRegistered, "Voter not registered");
        _;
    }
    
    constructor(address _admin) {
        admin = _admin;
    }
    
    // Admin functions
    function setElectionPeriods(
        uint256 _registrationStart,
        uint256 _registrationEnd,
        uint256 _votingStart,
        uint256 _votingEnd
    ) external onlyAdmin {
        require(_registrationStart < _registrationEnd, "Invalid registration period");
        require(_registrationEnd < _votingStart, "Registration must end before voting");
        require(_votingStart < _votingEnd, "Invalid voting period");
        
        registrationStart = _registrationStart;
        registrationEnd = _registrationEnd;
        votingStart = _votingStart;
        votingEnd = _votingEnd;
    }
    
    function toggleRegistration() external onlyAdmin {
        registrationActive = !registrationActive;
        emit ElectionPhaseChanged("registration", registrationActive);
    }
    
    function toggleVoting() external onlyAdmin {
        votingActive = !votingActive;
        emit ElectionPhaseChanged("voting", votingActive);
    }
    
    function addRegion(string memory _region) external onlyAdmin {
        regions.push(_region);
        // Initialize available positions for this region
        regionPositions[_region].push("president");
        regionPositions[_region].push("senator");
        regionPositions[_region].push("governor");
    }
    
    function addCandidate(
        string memory _name,
        string memory _party,
        string memory _position,
        string memory _region,
        string memory _imageUrl
    ) external onlyAdmin {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_party).length > 0, "Party cannot be empty");
        require(
            keccak256(bytes(_position)) == keccak256(bytes("president")) ||
            keccak256(bytes(_position)) == keccak256(bytes("senator")) ||
            keccak256(bytes(_position)) == keccak256(bytes("governor")),
            "Invalid position"
        );
        
        // For president, region should be empty
        if (keccak256(bytes(_position)) == keccak256(bytes("president"))) {
            _region = "";
        } else {
            require(bytes(_region).length > 0, "Region required for non-presidential candidates");
        }
        
        candidateCount++;
        candidates[candidateCount] = Candidate({
            id: candidateCount,
            name: _name,
            party: _party,
            position: _position,
            region: _region,
            imageUrl: _imageUrl,
            voteCount: 0,
            isActive: true
        });
        
        candidateIds.push(candidateCount);
        emit CandidateAdded(candidateCount, _name, _position, _region, _imageUrl);
    }
    
    function deactivateCandidate(uint256 _candidateId) external onlyAdmin {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate ID");
        candidates[_candidateId].isActive = false;
    }
    
    // Voter functions
    function registerVoter(string memory _nationalId, string memory _region) external onlyDuringRegistration {
        require(!voters[msg.sender].isRegistered, "Voter already registered");
        require(!addressUsed[msg.sender], "Address already used");
        require(bytes(_nationalId).length > 0, "National ID cannot be empty");
        require(bytes(_region).length > 0, "Region cannot be empty");
        require(isValidRegion(_region), "Invalid region");
        require(nationalIdToAddress[_nationalId] == address(0), "National ID already registered");
        
        voters[msg.sender] = Voter({
            isRegistered: true,
            hasVoted: false,
            region: _region,
            nationalId: _nationalId,
            voterAddress: msg.sender
        });
        
        nationalIdToAddress[_nationalId] = msg.sender;
        addressUsed[msg.sender] = true;
        voterAddresses.push(msg.sender);
        voterCount++;
        
        emit VoterRegistered(msg.sender, _nationalId, _region);
    }
    
    function vote(uint256 _candidateId) external onlyDuringVoting onlyRegisteredVoter {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate ID");
        require(candidates[_candidateId].isActive, "Candidate is not active");
        
        Candidate storage candidate = candidates[_candidateId];
        Voter storage voter = voters[msg.sender];
        
        // Check if voter already voted for this position
        require(!hasVotedForPosition[msg.sender][candidate.position], "Already voted for this position");
        
        // Check if voter is eligible to vote for this candidate
        if (keccak256(bytes(candidate.position)) != keccak256(bytes("president"))) {
            require(
                keccak256(bytes(candidate.region)) == keccak256(bytes(voter.region)),
                "Cannot vote for candidate outside your region"
            );
        }
        
        // Cast vote
        candidate.voteCount++;
        hasVotedForPosition[msg.sender][candidate.position] = true;
        
        // Update live results tracking
        totalVotesByPosition[candidate.position]++;
        if (keccak256(bytes(candidate.position)) != keccak256(bytes("president"))) {
            totalVotesByRegion[candidate.position][voter.region]++;
        }
        
        // Check if voter has voted for all positions
        if (hasVotedForAllPositions(msg.sender)) {
            voter.hasVoted = true;
        }
        
        emit VoteCast(msg.sender, _candidateId, candidate.position, candidate.voteCount);
        emit LiveResultsUpdate(candidate.position, totalVotesByPosition[candidate.position]);
    }
    
    // View functions
    function getCandidatesByPosition(string memory _position) external view returns (uint256[] memory) {
        uint256[] memory positionCandidates = new uint256[](candidateCount);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= candidateCount; i++) {
            if (candidates[i].isActive && 
                keccak256(bytes(candidates[i].position)) == keccak256(bytes(_position))) {
                positionCandidates[count] = i;
                count++;
            }
        }
        
        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = positionCandidates[i];
        }
        
        return result;
    }
    
    function getCandidatesByRegion(string memory _region) external view returns (uint256[] memory) {
        uint256[] memory regionCandidates = new uint256[](candidateCount);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= candidateCount; i++) {
            if (candidates[i].isActive && 
                (keccak256(bytes(candidates[i].region)) == keccak256(bytes(_region)) ||
                 keccak256(bytes(candidates[i].position)) == keccak256(bytes("president")))) {
                regionCandidates[count] = i;
                count++;
            }
        }
        
        // Resize array
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = regionCandidates[i];
        }
        
        return result;
    }
    
    function getResults(string memory _position) external view returns (
        uint256[] memory candidateIds_,
        string[] memory names,
        string[] memory parties,
        string[] memory imageUrls,
        uint256[] memory voteCounts
    ) {
        // Results now available live during voting
        uint256[] memory positionCandidates = this.getCandidatesByPosition(_position);
        uint256 count = positionCandidates.length;
        
        candidateIds_ = new uint256[](count);
        names = new string[](count);
        parties = new string[](count);
        imageUrls = new string[](count);
        voteCounts = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 candidateId = positionCandidates[i];
            candidateIds_[i] = candidateId;
            names[i] = candidates[candidateId].name;
            parties[i] = candidates[candidateId].party;
            imageUrls[i] = candidates[candidateId].imageUrl;
            voteCounts[i] = candidates[candidateId].voteCount;
        }
    }
    
    function getVoterInfo(address _voter) external view returns (
        bool isRegistered,
        bool hasVoted,
        string memory region,
        string memory nationalId,
        bool[] memory votedPositions
    ) {
        Voter memory voter = voters[_voter];
        votedPositions = new bool[](3);
        
        votedPositions[0] = hasVotedForPosition[_voter]["president"];
        votedPositions[1] = hasVotedForPosition[_voter]["senator"];
        votedPositions[2] = hasVotedForPosition[_voter]["governor"];
        
        return (voter.isRegistered, voter.hasVoted, voter.region, voter.nationalId, votedPositions);
    }
    
    function getTotalVoters() external view returns (uint256) {
        return voterCount;
    }
    
    function getAllRegions() external view returns (string[] memory) {
        return regions;
    }
    
    function getElectionStatus() external view returns (
        bool regActive,
        bool votingActive_,
        uint256 regStart,
        uint256 regEnd,
        uint256 voteStart,
        uint256 voteEnd
    ) {
        return (
            registrationActive,
            votingActive,
            registrationStart,
            registrationEnd,
            votingStart,
            votingEnd
        );
    }
    
    // New functions for live results and voter verification
    function getLiveResults(string memory _position) external view returns (
        uint256[] memory candidateIds_,
        string[] memory names,
        string[] memory parties,
        string[] memory imageUrls,
        uint256[] memory voteCounts,
        uint256 totalVotes
    ) {
        uint256[] memory positionCandidates = this.getCandidatesByPosition(_position);
        uint256 count = positionCandidates.length;
        
        candidateIds_ = new uint256[](count);
        names = new string[](count);
        parties = new string[](count);
        imageUrls = new string[](count);
        voteCounts = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            uint256 candidateId = positionCandidates[i];
            candidateIds_[i] = candidateId;
            names[i] = candidates[candidateId].name;
            parties[i] = candidates[candidateId].party;
            imageUrls[i] = candidates[candidateId].imageUrl;
            voteCounts[i] = candidates[candidateId].voteCount;
        }
        
        totalVotes = totalVotesByPosition[_position];
    }
    
    function getVoterByNationalId(string memory _nationalId) external view returns (
        address voterAddress,
        bool isRegistered,
        string memory region
    ) {
        address addr = nationalIdToAddress[_nationalId];
        if (addr != address(0)) {
            Voter memory voter = voters[addr];
            return (addr, voter.isRegistered, voter.region);
        }
        return (address(0), false, "");
    }
    
    function getTotalVotesForPosition(string memory _position) external view returns (uint256) {
        return totalVotesByPosition[_position];
    }
    
    function getRegionalVotes(string memory _position, string memory _region) external view returns (uint256) {
        return totalVotesByRegion[_position][_region];
    }
    
    function isNationalIdRegistered(string memory _nationalId) external view returns (bool) {
        return nationalIdToAddress[_nationalId] != address(0);
    }
    
    // Helper functions
    function isValidRegion(string memory _region) internal view returns (bool) {
        for (uint256 i = 0; i < regions.length; i++) {
            if (keccak256(bytes(regions[i])) == keccak256(bytes(_region))) {
                return true;
            }
        }
        return false;
    }
    
    function hasVotedForAllPositions(address _voter) internal view returns (bool) {
        return hasVotedForPosition[_voter]["president"] &&
               hasVotedForPosition[_voter]["senator"] &&
               hasVotedForPosition[_voter]["governor"];
    }
    
    // Emergency functions
    function emergencyStop() external onlyAdmin {
        votingActive = false;
        registrationActive = false;
    }
    
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        admin = _newAdmin;
    }
}
