/*
  # Fix scorers table for knockout matches

  1. Changes
    - Add knockout_match_id column to scorers table
    - Add constraint to ensure either match_id or knockout_match_id is set
    - Add foreign key to knockout_matches
    - Add similar constraint to goalkeeper_stats table

  2. Security
    - Maintain existing RLS policies
*/

-- Add knockout_match_id to scorers table
ALTER TABLE scorers ADD COLUMN IF NOT EXISTS knockout_match_id uuid;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'scorers_knockout_match_id_fkey'
  ) THEN
    ALTER TABLE scorers ADD CONSTRAINT scorers_knockout_match_id_fkey 
    FOREIGN KEY (knockout_match_id) REFERENCES knockout_matches(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add constraint to ensure either match_id or knockout_match_id is set (but not both)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'scorers_match_type_check'
  ) THEN
    ALTER TABLE scorers ADD CONSTRAINT scorers_match_type_check 
    CHECK (
      (match_id IS NOT NULL AND knockout_match_id IS NULL) OR 
      (match_id IS NULL AND knockout_match_id IS NOT NULL)
    );
  END IF;
END $$;

-- Add knockout_match_id to goalkeeper_stats table
ALTER TABLE goalkeeper_stats ADD COLUMN IF NOT EXISTS knockout_match_id uuid;

-- Add foreign key constraint for goalkeeper_stats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'goalkeeper_stats_knockout_match_id_fkey'
  ) THEN
    ALTER TABLE goalkeeper_stats ADD CONSTRAINT goalkeeper_stats_knockout_match_id_fkey 
    FOREIGN KEY (knockout_match_id) REFERENCES knockout_matches(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add constraint to ensure either match_id or knockout_match_id is set for goalkeeper_stats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'goalkeeper_stats_match_type_check'
  ) THEN
    ALTER TABLE goalkeeper_stats ADD CONSTRAINT goalkeeper_stats_match_type_check 
    CHECK (
      (match_id IS NOT NULL AND knockout_match_id IS NULL) OR 
      (match_id IS NULL AND knockout_match_id IS NOT NULL)
    );
  END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scorers_knockout_match ON scorers(knockout_match_id);
CREATE INDEX IF NOT EXISTS idx_goalkeeper_stats_knockout_match ON goalkeeper_stats(knockout_match_id);