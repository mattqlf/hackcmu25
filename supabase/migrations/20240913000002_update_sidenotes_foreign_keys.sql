-- Ensure sidenotes table has proper foreign key to user_profiles
-- Add foreign key constraint if it doesn't exist (this will error if constraint already exists, which is fine)
DO $$
BEGIN
    -- Try to add the foreign key constraint
    BEGIN
        ALTER TABLE sidenotes
        ADD CONSTRAINT sidenotes_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN
            -- Constraint already exists, do nothing
            NULL;
    END;
END
$$;

-- Ensure highlights table exists and has proper structure
CREATE TABLE IF NOT EXISTS highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sidenote_id UUID NOT NULL REFERENCES sidenotes(id) ON DELETE CASCADE,
    start_container_path TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_container_path TEXT NOT NULL,
    end_offset INTEGER NOT NULL,
    highlighted_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for highlights if they don't exist
CREATE INDEX IF NOT EXISTS idx_highlights_sidenote_id ON highlights(sidenote_id);

-- Enable RLS for highlights
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

-- Highlights policies: Users can read highlights for sidenotes they can see
CREATE POLICY "Users can read highlights" ON highlights FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM sidenotes
        WHERE sidenotes.id = highlights.sidenote_id
    )
);

-- Grant permissions
GRANT SELECT ON highlights TO authenticated;