-- Create sidenotes table if it doesn't exist
CREATE TABLE IF NOT EXISTS sidenotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    page_url TEXT NOT NULL,
    content TEXT NOT NULL CHECK (length(content) > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sidenotes_user_id ON sidenotes(user_id);
CREATE INDEX IF NOT EXISTS idx_sidenotes_page_url ON sidenotes(page_url);
CREATE INDEX IF NOT EXISTS idx_sidenotes_created_at ON sidenotes(created_at);

-- Enable Row Level Security
ALTER TABLE sidenotes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all sidenotes (for collaborative features)
CREATE POLICY "Users can read all sidenotes"
ON sidenotes FOR SELECT
USING (true);

-- Policy: Authenticated users can create sidenotes
CREATE POLICY "Authenticated users can create sidenotes"
ON sidenotes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own sidenotes
CREATE POLICY "Users can update their own sidenotes"
ON sidenotes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own sidenotes
CREATE POLICY "Users can delete their own sidenotes"
ON sidenotes FOR DELETE
USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sidenotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on updates
CREATE TRIGGER update_sidenotes_updated_at_trigger
    BEFORE UPDATE ON sidenotes
    FOR EACH ROW
    EXECUTE FUNCTION update_sidenotes_updated_at();

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON sidenotes TO authenticated;