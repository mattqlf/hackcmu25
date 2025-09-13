-- Fix highlights table RLS policies
-- Add missing INSERT, UPDATE, and DELETE policies for highlights table

-- Policy: Authenticated users can create highlights when creating sidenotes
CREATE POLICY "Authenticated users can create highlights"
ON highlights FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM sidenotes
        WHERE sidenotes.id = highlights.sidenote_id
        AND sidenotes.user_id = auth.uid()
    )
);

-- Policy: Users can update highlights for their own sidenotes
CREATE POLICY "Users can update highlights for their own sidenotes"
ON highlights FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM sidenotes
        WHERE sidenotes.id = highlights.sidenote_id
        AND sidenotes.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sidenotes
        WHERE sidenotes.id = highlights.sidenote_id
        AND sidenotes.user_id = auth.uid()
    )
);

-- Policy: Users can delete highlights for their own sidenotes
CREATE POLICY "Users can delete highlights for their own sidenotes"
ON highlights FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM sidenotes
        WHERE sidenotes.id = highlights.sidenote_id
        AND sidenotes.user_id = auth.uid()
    )
);

-- Grant additional permissions for highlights
GRANT INSERT, UPDATE, DELETE ON highlights TO authenticated;