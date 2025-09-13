import { createClient } from '@/lib/supabase/client';

/**
 * Debug utility for testing the voting system
 * Call this from browser console: window.testVoting()
 */
export async function testVotingSystem() {
  const supabase = createClient();

  console.log('🔍 Testing voting system...');

  try {
    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ User not authenticated:', userError);
      return;
    }
    console.log('✅ User authenticated:', user.id);

    // Get a test sidenote
    const { data: sidenotes, error: sidenotesError } = await supabase
      .from('sidenotes')
      .select('id, upvotes, downvotes, net_votes')
      .limit(1);

    if (sidenotesError || !sidenotes || sidenotes.length === 0) {
      console.error('❌ No sidenotes found:', sidenotesError);
      return;
    }

    const testSidenote = sidenotes[0];
    console.log('📝 Test sidenote:', testSidenote);

    // Check if vote columns exist
    if (testSidenote.upvotes === undefined) {
      console.error('❌ Vote columns missing! Run the migration first.');
      return;
    }

    // Test vote insertion
    console.log('🗳️ Testing vote insertion...');
    const { data: voteData, error: voteError } = await supabase
      .from('votes')
      .insert({
        user_id: user.id,
        sidenote_id: testSidenote.id,
        vote_type: 1
      })
      .select();

    if (voteError) {
      console.error('❌ Vote insertion failed:', voteError);

      // Check if it's a duplicate vote
      if (voteError.code === '23505') {
        console.log('ℹ️ Vote already exists, testing update...');

        // Try to update existing vote
        const { error: updateError } = await supabase
          .from('votes')
          .update({ vote_type: -1 })
          .eq('user_id', user.id)
          .eq('sidenote_id', testSidenote.id);

        if (updateError) {
          console.error('❌ Vote update failed:', updateError);
          return;
        }
        console.log('✅ Vote updated successfully');
      } else {
        return;
      }
    } else {
      console.log('✅ Vote inserted successfully:', voteData);
    }

    // Wait a moment for trigger to process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check updated vote counts
    const { data: updatedSidenote, error: updateError } = await supabase
      .from('sidenotes')
      .select('id, upvotes, downvotes, net_votes')
      .eq('id', testSidenote.id)
      .single();

    if (updateError) {
      console.error('❌ Failed to fetch updated sidenote:', updateError);
      return;
    }

    console.log('📊 Vote counts before:', testSidenote);
    console.log('📊 Vote counts after:', updatedSidenote);

    if (updatedSidenote.upvotes !== testSidenote.upvotes ||
        updatedSidenote.downvotes !== testSidenote.downvotes ||
        updatedSidenote.net_votes !== testSidenote.net_votes) {
      console.log('✅ Vote counts updated successfully! Triggers are working.');
    } else {
      console.error('❌ Vote counts did not update. Triggers may not be working.');
    }

    // Test the SQL test function
    console.log('🧪 Testing SQL test function...');
    const { data: testResult, error: testError } = await supabase
      .rpc('test_voting_system');

    if (testError) {
      console.error('❌ SQL test function failed:', testError);
    } else {
      console.log('✅ SQL test result:', testResult);
    }

  } catch (error) {
    console.error('❌ Testing failed:', error);
  }
}

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testVoting = testVotingSystem;
  console.log('🔧 Voting debug utility loaded. Run window.testVoting() to test.');
}