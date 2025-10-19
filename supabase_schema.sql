-- Create tables
CREATE TABLE IF NOT EXISTS sims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  number TEXT NOT NULL UNIQUE,
  last_charged TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  charged_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sims_last_charged ON sims(last_charged);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to sims table
DROP TRIGGER IF EXISTS update_sims_updated_at ON sims;
CREATE TRIGGER update_sims_updated_at
BEFORE UPDATE ON sims
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Grant privileges to service_role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;