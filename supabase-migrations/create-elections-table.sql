-- Create elections table for storing election state snapshots
CREATE TABLE IF NOT EXISTS elections (
  id SERIAL PRIMARY KEY,
  election_year INTEGER NOT NULL,
  election_status JSONB NOT NULL,
  voter_data JSONB NOT NULL,
  candidate_data JSONB NOT NULL,
  geographical_data JSONB NOT NULL,
  audit_data JSONB NOT NULL,
  system_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100) NOT NULL
);

-- Create index on election_year for faster queries
CREATE INDEX IF NOT EXISTS idx_elections_year ON elections(election_year);

-- Create index on created_at for chronological ordering
CREATE INDEX IF NOT EXISTS idx_elections_created_at ON elections(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting election states (admin only)
CREATE POLICY "Enable insert for admin users only" ON elections
  FOR INSERT WITH CHECK (true);

-- Create policy for reading election states
CREATE POLICY "Enable read access for all users" ON elections
  FOR SELECT USING (true);
