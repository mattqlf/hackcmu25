-- Create replies table for threaded comments on sidenotes
CREATE TABLE IF NOT EXISTS replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sidenote_id UUID NOT NULL REFERENCES sidenotes(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_replies_sidenote_id ON replies(sidenote_id);
CREATE INDEX IF NOT EXISTS idx_replies_parent_reply_id ON replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_replies_user_id ON replies(user_id);
CREATE INDEX IF NOT EXISTS idx_replies_created_at ON replies(created_at);

-- Enable Row Level Security
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all replies for sidenotes they can see
CREATE POLICY "Users can read replies on sidenotes they can see"
ON replies FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM sidenotes
        WHERE sidenotes.id = replies.sidenote_id
    )
);

-- Policy: Authenticated users can create replies
CREATE POLICY "Authenticated users can create replies"
ON replies FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own replies
CREATE POLICY "Users can update their own replies"
ON replies FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own replies
CREATE POLICY "Users can delete their own replies"
ON replies FOR DELETE
USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on updates
CREATE TRIGGER update_replies_updated_at_trigger
    BEFORE UPDATE ON replies
    FOR EACH ROW
    EXECUTE FUNCTION update_replies_updated_at();

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON replies TO authenticated;