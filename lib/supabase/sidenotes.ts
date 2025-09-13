import { createClient } from './client';
import type { SerializedRange } from '../highlights/modernRangeUtils';

export interface Sidenote {
  id: string;
  user_id: string;
  page_url: string;
  content: string;
  created_at: string;
  updated_at: string;
  upvotes: number;
  downvotes: number;
  net_votes: number;
}

export interface Highlight {
  id: string;
  sidenote_id: string;
  start_container_path: string;
  start_offset: number;
  end_container_path: string;
  end_offset: number;
  highlighted_text: string;
  created_at: string;
}

export interface Reply {
  id: string;
  sidenote_id: string;
  parent_reply_id: string | null;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  upvotes: number;
  downvotes: number;
  net_votes: number;
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  replies?: Reply[];
  user_vote?: Vote | null; // Current user's vote on this reply
}

export interface Vote {
  id: string;
  user_id: string;
  sidenote_id: string | null;
  reply_id: string | null;
  vote_type: -1 | 1; // -1 for downvote, 1 for upvote
  created_at: string;
  updated_at: string;
}

export interface FullSidenote extends Sidenote {
  highlights: Highlight[];
  user_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  replies?: Reply[];
  user_vote?: Vote | null; // Current user's vote on this sidenote
}

/**
 * Create a new sidenote with associated highlight
 */
export async function createSidenote(
  content: string,
  range: SerializedRange,
  pageUrl: string
): Promise<FullSidenote | null> {
  const supabase = createClient();

  try {
    console.log('Starting sidenote creation with:', { content, pageUrl, range });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('User authentication error:', userError);
      throw new Error(`User authentication failed: ${userError.message}`);
    }
    if (!user) {
      console.error('No user found');
      throw new Error('User not authenticated - no user found');
    }

    console.log('User authenticated:', user.id);

    // Check if user profile exists, create if not
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    let userProfile = existingProfile;

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('Error checking user profile:', profileCheckError);
    }

    if (!existingProfile) {
      console.log('Creating user profile for:', user.id);
      const { data: newProfile, error: profileCreateError } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null
        })
        .select('id, full_name, avatar_url')
        .single();

      if (profileCreateError) {
        console.error('Error creating user profile:', profileCreateError);
        // Use fallback profile data
        userProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || `User ${user.id.substring(0, 8)}`,
          avatar_url: null
        };
      } else {
        userProfile = newProfile;
      }
    }

    // Create sidenote
    console.log('Inserting sidenote...');
    const { data: sidenote, error: sidenoteError } = await supabase
      .from('sidenotes')
      .insert({
        user_id: user.id,
        page_url: pageUrl,
        content
      })
      .select()
      .single();

    if (sidenoteError) {
      console.error('Error inserting sidenote:', sidenoteError);
      console.error('Sidenote error details:', {
        code: sidenoteError.code,
        message: sidenoteError.message,
        details: sidenoteError.details,
        hint: sidenoteError.hint
      });
      throw sidenoteError;
    }

    console.log('Sidenote created successfully:', sidenote.id);

    // Create highlight
    console.log('Creating highlight...');
    const { data: highlight, error: highlightError } = await supabase
      .from('highlights')
      .insert({
        sidenote_id: sidenote.id,
        start_container_path: range.containerSelector || '',
        start_offset: range.startOffset,
        end_container_path: range.containerSelector || '',
        end_offset: range.endOffset,
        highlighted_text: range.text
      })
      .select()
      .single();

    if (highlightError) {
      console.error('Error creating highlight:', highlightError);
      console.error('Highlight error details:', {
        code: highlightError.code,
        message: highlightError.message,
        details: highlightError.details,
        hint: highlightError.hint
      });
      throw highlightError;
    }

    console.log('Highlight created successfully:', highlight.id);


    return {
      ...sidenote,
      highlights: [highlight],
      user_profile: userProfile ? {
        full_name: userProfile.full_name,
        avatar_url: userProfile.avatar_url
      } : null,
      replies: []
    };
  } catch (error) {
    console.error('Error creating sidenote:', error);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    return null;
  }
}

/**
 * Get all sidenotes for a specific page
 */
export async function getSidenotesForPage(pageUrl: string): Promise<FullSidenote[]> {
  const supabase = createClient();

  try {
    // First, get sidenotes with highlights
    const { data: sidenotesData, error: sidenotesError } = await supabase
      .from('sidenotes')
      .select(`
        *,
        highlights (*)
      `)
      .eq('page_url', pageUrl)
      .order('created_at', { ascending: true });

    if (sidenotesError) {
      console.error('Error fetching sidenotes:', sidenotesError);
      throw sidenotesError;
    }

    if (!sidenotesData || sidenotesData.length === 0) {
      return [];
    }

    // Get user profiles for all sidenote authors
    const userIds = sidenotesData.map(s => s.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
    }

    // Create a map of user profiles
    const profilesMap = new Map();
    (profilesData || []).forEach(profile => {
      profilesMap.set(profile.id, profile);
    });

    // For any missing profiles, add placeholder entries so we don't show 'Anonymous'
    const missingUserIds = userIds.filter(id => !profilesMap.has(id));
    if (missingUserIds.length > 0) {
      console.warn('Missing user profiles for:', missingUserIds);

      // Add fallback profile data for missing users
      missingUserIds.forEach(userId => {
        profilesMap.set(userId, {
          id: userId,
          full_name: `User ${userId.substring(0, 8)}`, // Show partial ID instead of Anonymous
          avatar_url: null
        });
      });
    }

    // Combine sidenotes with user profiles and replies
    // Get current user's votes on all sidenotes
    const { data: { user } } = await supabase.auth.getUser();
    let userVotes: Map<string, any> = new Map();

    if (user) {
      const sidenoteIds = sidenotesData.map(s => s.id);
      const { data: votesData } = await supabase
        .from('votes')
        .select('*')
        .eq('user_id', user.id)
        .in('sidenote_id', sidenoteIds);

      if (votesData) {
        votesData.forEach(vote => {
          if (vote.sidenote_id) {
            userVotes.set(vote.sidenote_id, vote);
          }
        });
      }
    }

    const sidenotesWithReplies = await Promise.all(
      sidenotesData.map(async (sidenote) => {
        const replies = await getRepliesForSidenote(sidenote.id);
        const userProfile = profilesMap.get(sidenote.user_id);

        return {
          ...sidenote,
          user_profile: userProfile ? {
            full_name: userProfile.full_name,
            avatar_url: userProfile.avatar_url
          } : null,
          replies: replies,
          user_vote: userVotes.get(sidenote.id) || null
        };
      })
    );

    return sidenotesWithReplies;
  } catch (error) {
    console.error('Error fetching sidenotes:', error);
    return [];
  }
}

/**
 * Update sidenote content
 */
export async function updateSidenote(id: string, content: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('sidenotes')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error updating sidenote:', error);
    return false;
  }
}

/**
 * Delete a sidenote and its highlights
 */
export async function deleteSidenote(id: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('sidenotes')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting sidenote:', error);
    return false;
  }
}

/**
 * Subscribe to real-time changes for a page
 */
export function subscribeSidenotes(
  pageUrl: string,
  onInsert: (sidenote: FullSidenote) => void,
  onUpdate: (sidenote: Sidenote) => void,
  onDelete: (id: string) => void
) {
  const supabase = createClient();

  const channel = supabase
    .channel(`sidenotes-${encodeURIComponent(pageUrl)}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sidenotes',
        filter: `page_url=eq.${pageUrl}`
      },
      async (payload) => {
        // Fetch the full sidenote with highlights
        const fullSidenote = await getSidenoteById(payload.new.id);
        if (fullSidenote) {
          onInsert(fullSidenote);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sidenotes',
        filter: `page_url=eq.${pageUrl}`
      },
      (payload) => {
        onUpdate(payload.new as Sidenote);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'sidenotes',
        filter: `page_url=eq.${pageUrl}`
      },
      (payload) => {
        onDelete(payload.old.id);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Get a single sidenote by ID with highlights
 */
async function getSidenoteById(id: string): Promise<FullSidenote | null> {
  const supabase = createClient();

  try {
    // Get sidenote with highlights
    const { data: sidenoteData, error: sidenoteError } = await supabase
      .from('sidenotes')
      .select(`
        *,
        highlights (*)
      `)
      .eq('id', id)
      .single();

    if (sidenoteError) {
      console.error('Error fetching sidenote:', sidenoteError);
      throw sidenoteError;
    }

    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, avatar_url')
      .eq('id', sidenoteData.user_id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    const replies = await getRepliesForSidenote(id);

    return {
      ...sidenoteData,
      user_profile: profileData || {
        full_name: `User ${sidenoteData.user_id.substring(0, 8)}`,
        avatar_url: null
      },
      replies: replies
    };
  } catch (error) {
    console.error('Error fetching sidenote:', error);
    return null;
  }
}

/**
 * Get all replies for a sidenote, organized in a tree structure
 */
export async function getRepliesForSidenote(sidenoteId: string): Promise<Reply[]> {
  const supabase = createClient();

  try {
    // First get replies
    const { data: repliesData, error: repliesError } = await supabase
      .from('replies')
      .select('*')
      .eq('sidenote_id', sidenoteId)
      .order('created_at', { ascending: true });

    if (repliesError) {
      console.error('Error fetching replies:', repliesError);
      throw repliesError;
    }

    if (!repliesData || repliesData.length === 0) {
      return [];
    }

    // Get user profiles for all reply authors
    const userIds = repliesData.map(r => r.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles for replies:', profilesError);
    }

    // Create a map of user profiles
    const profilesMap = new Map();
    (profilesData || []).forEach(profile => {
      profilesMap.set(profile.id, profile);
    });

    // For any missing reply author profiles, add placeholder entries
    const missingReplyUserIds = userIds.filter(id => !profilesMap.has(id));
    if (missingReplyUserIds.length > 0) {
      console.warn('Missing reply author profiles for:', missingReplyUserIds);

      // Add fallback profile data for missing reply authors
      missingReplyUserIds.forEach(userId => {
        profilesMap.set(userId, {
          id: userId,
          full_name: `User ${userId.substring(0, 8)}`, // Show partial ID instead of Anonymous
          avatar_url: null
        });
      });
    }

    // Get current user's votes on all replies
    const { data: { user } } = await supabase.auth.getUser();
    let userVotesOnReplies: Map<string, any> = new Map();

    if (user && repliesData.length > 0) {
      const replyIds = repliesData.map(r => r.id);
      const { data: votesData } = await supabase
        .from('votes')
        .select('*')
        .eq('user_id', user.id)
        .in('reply_id', replyIds);

      if (votesData) {
        votesData.forEach(vote => {
          if (vote.reply_id) {
            userVotesOnReplies.set(vote.reply_id, vote);
          }
        });
      }
    }

    const repliesWithProfile = repliesData.map(reply => ({
      ...reply,
      user_profile: profilesMap.get(reply.user_id) || {
        full_name: `User ${reply.user_id.substring(0, 8)}`,
        avatar_url: null
      },
      user_vote: userVotesOnReplies.get(reply.id) || null
    }));

    return buildReplyTree(repliesWithProfile);
  } catch (error) {
    console.error('Error fetching replies:', error);
    return [];
  }
}

/**
 * Vote on a sidenote
 */
export async function voteSidenote(sidenoteId: string, voteType: -1 | 1): Promise<boolean> {
  try {
    const supabase = createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if user already has a vote
    const { data: existingVote, error: checkError } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', user.id)
      .eq('sidenote_id', sidenoteId)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Same vote - remove it
        const { error: deleteError } = await supabase
          .from('votes')
          .delete()
          .eq('id', existingVote.id);

        if (deleteError) throw deleteError;
      } else {
        // Different vote - update it
        const { error: updateError } = await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);

        if (updateError) throw updateError;
      }
    } else {
      // New vote - insert it
      const { error: insertError } = await supabase
        .from('votes')
        .insert({
          user_id: user.id,
          sidenote_id: sidenoteId,
          vote_type: voteType
        });

      if (insertError) throw insertError;
    }

    return true;
  } catch (error) {
    console.error('Error voting on sidenote:', error);
    return false;
  }
}

/**
 * Vote on a reply
 */
export async function voteReply(replyId: string, voteType: -1 | 1): Promise<boolean> {
  try {
    const supabase = createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if user already has a vote
    const { data: existingVote, error: checkError } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', user.id)
      .eq('reply_id', replyId)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Same vote - remove it
        const { error: deleteError } = await supabase
          .from('votes')
          .delete()
          .eq('id', existingVote.id);

        if (deleteError) throw deleteError;
      } else {
        // Different vote - update it
        const { error: updateError } = await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);

        if (updateError) throw updateError;
      }
    } else {
      // New vote - insert it
      const { error: insertError } = await supabase
        .from('votes')
        .insert({
          user_id: user.id,
          reply_id: replyId,
          vote_type: voteType
        });

      if (insertError) throw insertError;
    }

    return true;
  } catch (error) {
    console.error('Error voting on reply:', error);
    return false;
  }
}

/**
 * Get user's vote on a sidenote
 */
export async function getUserVoteOnSidenote(sidenoteId: string): Promise<Vote | null> {
  try {
    const supabase = createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', user.id)
      .eq('sidenote_id', sidenoteId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting user vote on sidenote:', error);
    return null;
  }
}

/**
 * Get user's vote on a reply
 */
export async function getUserVoteOnReply(replyId: string): Promise<Vote | null> {
  try {
    const supabase = createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('user_id', user.id)
      .eq('reply_id', replyId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting user vote on reply:', error);
    return null;
  }
}

/**
 * Build a tree structure from flat reply array
 */
function buildReplyTree(replies: (Reply & { user_profiles?: { full_name: string | null; avatar_url: string | null } })[]): Reply[] {
  const replyMap = new Map<string, Reply>();
  const rootReplies: Reply[] = [];

  replies.forEach(reply => {
    replyMap.set(reply.id, { ...reply, replies: [] });
  });

  replies.forEach(reply => {
    const replyWithChildren = replyMap.get(reply.id)!;

    if (reply.parent_reply_id) {
      const parent = replyMap.get(reply.parent_reply_id);
      if (parent) {
        parent.replies!.push(replyWithChildren);
      }
    } else {
      rootReplies.push(replyWithChildren);
    }
  });

  return rootReplies;
}

/**
 * Create a new reply
 */
export async function createReply(
  sidenoteId: string,
  content: string,
  parentReplyId?: string
): Promise<Reply | null> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User not authenticated:', userError);
      throw new Error('User not authenticated');
    }

    // Insert the reply
    const { data: replyData, error: replyError } = await supabase
      .from('replies')
      .insert({
        sidenote_id: sidenoteId,
        parent_reply_id: parentReplyId || null,
        user_id: user.id,
        content
      })
      .select('*')
      .single();

    if (replyError) {
      console.error('Error inserting reply:', replyError);
      throw replyError;
    }

    // Get user profile separately
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    const { data: sidenoteData, error: sidenoteError } = await supabase
      .from('sidenotes')
      .select('page_url')
      .eq('id', sidenoteId)
      .single();

    if (!sidenoteError && sidenoteData) {
    }

    return {
      ...replyData,
      user_profile: profileData || {
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || `User ${user.id.substring(0, 8)}`,
        avatar_url: null
      },
      replies: []
    };
  } catch (error) {
    console.error('Error creating reply:', error);
    return null;
  }
}

/**
 * Update a reply
 */
export async function updateReply(id: string, content: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('replies')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error updating reply:', error);
    return false;
  }
}

/**
 * Delete a reply and all its children
 */
export async function deleteReply(id: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('replies')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting reply:', error);
    return false;
  }
}