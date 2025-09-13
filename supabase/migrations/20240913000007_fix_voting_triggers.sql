-- Fix voting system triggers - add security definer and proper permissions

-- Drop existing trigger and function to recreate with proper permissions
DROP TRIGGER IF EXISTS update_vote_counts_trigger ON votes;
DROP FUNCTION IF EXISTS update_vote_counts();

-- Recreate the vote counting function with proper security definer
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql
AS $$
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

    -- Update vote counts for sidenotes
    IF target_table = 'sidenotes' THEN
        UPDATE public.sidenotes SET
            upvotes = (
                SELECT COUNT(*) FROM public.votes
                WHERE sidenote_id = target_id AND vote_type = 1
            ),
            downvotes = (
                SELECT COUNT(*) FROM public.votes
                WHERE sidenote_id = target_id AND vote_type = -1
            ),
            net_votes = (
                SELECT COALESCE(SUM(vote_type), 0) FROM public.votes
                WHERE sidenote_id = target_id
            )
        WHERE id = target_id;
    ELSE
        -- Update vote counts for replies
        UPDATE public.replies SET
            upvotes = (
                SELECT COUNT(*) FROM public.votes
                WHERE reply_id = target_id AND vote_type = 1
            ),
            downvotes = (
                SELECT COUNT(*) FROM public.votes
                WHERE reply_id = target_id AND vote_type = -1
            ),
            net_votes = (
                SELECT COALESCE(SUM(vote_type), 0) FROM public.votes
                WHERE reply_id = target_id
            )
        WHERE id = target_id;
    END IF;

    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_vote_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.votes
    FOR EACH ROW
    EXECUTE FUNCTION update_vote_counts();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_vote_counts() TO authenticated;

-- Test the trigger functionality by creating a test function
CREATE OR REPLACE FUNCTION test_voting_system()
RETURNS TEXT
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
    test_result TEXT;
    test_sidenote_id UUID;
    test_user_id UUID;
    vote_count INTEGER;
BEGIN
    -- Get the current user
    SELECT auth.uid() INTO test_user_id;

    IF test_user_id IS NULL THEN
        RETURN 'ERROR: No authenticated user found. Please log in to test the voting system.';
    END IF;

    -- Get a random sidenote ID for testing
    SELECT id INTO test_sidenote_id FROM public.sidenotes LIMIT 1;

    IF test_sidenote_id IS NULL THEN
        RETURN 'ERROR: No sidenotes found. Please create a sidenote first to test voting.';
    END IF;

    -- Check current vote counts
    SELECT net_votes INTO vote_count FROM public.sidenotes WHERE id = test_sidenote_id;

    RETURN 'SUCCESS: Voting system appears to be working. Test sidenote ' || test_sidenote_id || ' has ' || COALESCE(vote_count, 0) || ' net votes.';

EXCEPTION WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- Grant execute permission on test function
GRANT EXECUTE ON FUNCTION test_voting_system() TO authenticated;