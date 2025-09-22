# Voting Results Page Setup Guide

This guide will help you set up the voting system and fix the issues with the results page.

## Issues Fixed

1. **Bar Graph Heights**: Fixed the bar height calculation to properly show differences in vote counts
2. **Donut Chart Data**: Fixed the voter data fetching to properly display total voters, voted, and not voted counts
3. **Recent Votes Table**: Fixed the voter address fetching and display to show the most recent votes with proper data

## Setup Instructions

### 1. Start the Local Blockchain
```bash
yarn chain
```

### 2. Deploy the Contract
```bash
yarn deploy
```

### 3. Set Up the Voting System
This will add regions, candidates, and enable voting phases:
```bash
yarn setup-voting
```

### 4. Add Test Votes (Optional)
To see the results page in action with sample data:
```bash
yarn add-test-votes
```

### 5. Test the Voting Flow (Optional)
To test the complete voting flow and debug issues:
```bash
yarn test-voting
```

### 6. Start the Frontend
```bash
yarn start
```

## What Each Script Does

### `yarn setup-voting`
- Adds 5 regions: California, Texas, New York, Florida, Illinois
- Adds 9 candidates across 3 positions:
  - **President**: John Smith (Democratic), Sarah Johnson (Republican), Michael Brown (Independent)
  - **Senator**: Emily Davis (Democratic - CA), Robert Wilson (Republican - CA), Lisa Anderson (Democratic - TX)
  - **Governor**: David Martinez (Republican - CA), Jennifer Lee (Democratic - TX), Thomas Garcia (Independent - NY)
- Sets election periods (1 hour each for registration and voting)
- Enables both registration and voting phases

### `yarn add-test-votes`
- Registers 5 test voters with different national IDs and regions
- Casts votes for different candidates to create varied results
- Shows the voting results in the console

### `yarn test-voting`
- Tests the complete voting flow step by step
- Registers 2 test voters and casts votes
- Shows detailed voter information and voting status
- Helps debug issues with the results page

## Results Page Features

### Bar Graphs
- **Fixed**: Bar heights now properly reflect vote count differences
- **Dynamic**: Bars scale based on the maximum vote count for each position
- **Color-coded**: Each candidate has a unique color
- **Real-time**: Updates automatically when new votes are cast

### Donut Chart
- **Fixed**: Now properly shows total registered voters, voted, and not voted counts
- **Accurate**: Only counts registered voters who have actually voted
- **Visual**: Uses SVG circles with proper percentages

### Recent Votes Table
- **Fixed**: Shows the most recent 20 registered voters
- **Complete**: Displays wallet address, truncated national ID, and voting status
- **Real-time**: Updates when new votes are cast
- **Filtered**: Only shows registered voters

## Manual Testing

### 1. Register Voters
Go to `/registration` and register voters with:
- National ID (e.g., "1234567890")
- Region (must be one of the added regions)

### 2. Cast Votes
Go to `/voting` and cast votes for different positions

### 3. View Results
Go to `/results` to see:
- Live bar graphs showing vote distribution
- Donut chart showing voter participation
- Recent votes table with voter details

## Debug Information

The results page includes a debug section that shows:
- Total voters count
- Voter count
- Number of candidates per position
- Number of recent votes

## Troubleshooting

### No Data Showing
1. Make sure you've run `yarn setup-voting`
2. Check that candidates were added successfully
3. Verify that voting is enabled
4. Check the debug information on the results page

### Bar Graphs Not Updating
1. Ensure you've cast some votes
2. Check the browser console for any errors
3. Verify the contract is properly deployed

### Donut Chart Empty
1. Make sure voters have been registered
2. Check that votes have been cast
3. Verify the voter data is being fetched correctly

### Recent Votes Table Empty
1. Ensure voters have been registered
2. Check that the voter addresses are being fetched
3. Verify the voter info is being retrieved properly

## Contract Functions Used

The results page uses these contract functions:
- `getLiveResults(position)` - Gets candidate data and vote counts
- `getTotalVoters()` - Gets total registered voters
- `voterCount` - Gets the number of voters
- `voterAddresses(index)` - Gets voter address by index
- `getVoterInfo(address)` - Gets detailed voter information

## Event Listening

The page listens for `VoteCast` events and automatically refreshes the data when new votes are cast.

## Customization

You can customize the results page by:
- Modifying the candidate colors in `CANDIDATE_COLORS`
- Changing the number of recent votes shown (currently 20)
- Adjusting the bar graph height (currently 40)
- Modifying the donut chart size (currently 160px)

## Next Steps

After setting up the voting system:
1. Test the registration process
2. Test the voting process
3. Verify the results page updates correctly
4. Add more candidates or regions as needed
5. Deploy to a testnet for further testing
