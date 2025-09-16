import { createClient } from '@/lib/supabase/client';

export interface Paper {
  id: string;
  title: string;
  abstract: string;
}

export interface FavoritePaper {
  id: string;
  user_id: string;
  paper_id: string;
  paper_title: string;
  paper_abstract: string;
  created_at: string;
}

export interface ViewHistoryEntry {
  id: string;
  user_id: string;
  paper_id: string;
  paper_title: string;
  paper_abstract: string;
  viewed_at: string;
}

// Favorites functions
export async function addToFavorites(paper: Paper): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: user.id,
        paper_id: paper.id,
        paper_title: paper.title,
        paper_abstract: paper.abstract
      });

    if (error) {
      console.error('Error adding to favorites:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return false;
  }
}

export async function removeFromFavorites(paperId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('paper_id', paperId);

    if (error) {
      console.error('Error removing from favorites:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return false;
  }
}

export async function getUserFavorites(): Promise<FavoritePaper[]> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching favorites:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }
}

export async function isFavorited(paperId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('paper_id', paperId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking favorite status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
}

// View history functions
export async function addToViewHistory(paper: Paper): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false; // Don't error for unauthenticated users

    // Check if this paper was already viewed recently (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentView } = await supabase
      .from('user_view_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('paper_id', paper.id)
      .gte('viewed_at', oneHourAgo)
      .single();

    // If viewed recently, don't add duplicate entry
    if (recentView) return true;

    const { error } = await supabase
      .from('user_view_history')
      .upsert({
        user_id: user.id,
        paper_id: paper.id,
        paper_title: paper.title,
        paper_abstract: paper.abstract,
        viewed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,paper_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error adding to view history:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error adding to view history:', error);
    return false;
  }
}

export async function getUserViewHistory(limit: number = 50): Promise<ViewHistoryEntry[]> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_view_history')
      .select('*')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching view history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching view history:', error);
    return [];
  }
}

export async function clearViewHistory(): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('user_view_history')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing view history:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error clearing view history:', error);
    return false;
  }
}

