-- Add voting system for sidenotes and replies

-- Create votes table to track individual user votes
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sidenote_id UUID REFERENCES sidenotes(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES replies(id) ON DELETE CASCADE,
    vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 for downvote, 1 for upvote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Ensure user can only vote once per item
    CONSTRAINT unique_user_sidenote_vote UNIQUE(user_id, sidenote_id),
    CONSTRAINT unique_user_reply_vote UNIQUE(user_id, reply_id),
    -- Ensure vote is for either sidenote or reply, not both
    CONSTRAINT vote_target_check CHECK (
        (sidenote_id IS NOT NULL AND reply_id IS NULL) OR
        (sidenote_id IS NULL AND reply_id IS NOT NULL)
    )
);

-- Add vote counts to sidenotes table
ALTER TABLE sidenotes
ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_votes INTEGER DEFAULT 0;

-- Add vote counts to replies table
ALTER TABLE replies
ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS downvotes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_votes INTEGER DEFAULT 0;

-- Create indexes for votes table
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_sidenote_id ON votes(sidenote_id);
CREATE INDEX IF NOT EXISTS idx_votes_reply_id ON votes(reply_id);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at);

-- Enable Row Level Security on votes
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all votes (for displaying vote counts)
CREATE POLICY "Users can read all votes"
ON votes FOR SELECT
USING (true);

-- Policy: Authenticated users can create votes
CREATE POLICY "Authenticated users can create votes"
ON votes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own votes
CREATE POLICY "Users can update their own votes"
ON votes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own votes
CREATE POLICY "Users can delete their own votes"
ON votes FOR DELETE
USING (auth.uid() = user_id);

-- Function to update vote counts when votes are inserted/updated/deleted
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    target_table TEXT;
    target_id UUID;
BEGIN
    -- Determine target table and ID
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF NEW.sidenote_id IS NOT NULL THEN
            target_table := 'sidenotes';
            target_id := NEW.sidenote_id;
        ELSE
            target_table := 'replies';
            target_id := NEW.reply_id;
        END IF;
    ELSE -- DELETE
        IF OLD.sidenote_id IS NOT NULL THEN
            target_table := 'sidenotes';
            target_id := OLD.sidenote_id;
        ELSE
            target_table := 'replies';
            target_id := OLD.reply_id;
        END IF;
    END IF;

    -- Update vote counts
    IF target_table = 'sidenotes' THEN
        UPDATE sidenotes SET
            upvotes = (
                SELECT COUNT(*) FROM votes
                WHERE sidenote_id = target_id AND vote_type = 1
            ),
            downvotes = (
                SELECT COUNT(*) FROM votes
                WHERE sidenote_id = target_id AND vote_type = -1
            ),
            net_votes = (
                SELECT COALESCE(SUM(vote_type), 0) FROM votes
                WHERE sidenote_id = target_id
            )
        WHERE id = target_id;
    ELSE
        UPDATE replies SET
            upvotes = (
                SELECT COUNT(*) FROM votes
                WHERE reply_id = target_id AND vote_type = 1
            ),
            downvotes = (
                SELECT COUNT(*) FROM votes
                WHERE reply_id = target_id AND vote_type = -1
            ),
            net_votes = (
                SELECT COALESCE(SUM(vote_type), 0) FROM votes
                WHERE reply_id = target_id
            )
        WHERE id = target_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update vote counts
CREATE TRIGGER update_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_vote_counts();

-- Function to automatically update updated_at timestamp for votes
CREATE OR REPLACE FUNCTION update_votes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on vote updates
CREATE TRIGGER update_votes_updated_at_trigger
    BEFORE UPDATE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_votes_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON votes TO authenticated;