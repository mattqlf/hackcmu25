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

export interface WatchlistPaper {
  id: string;
  user_id: string;
  paper_id: string;
  paper_title: string;
  paper_abstract: string;
  created_at: string;
}

export interface SearchHistoryEntry {
  id: string;
  user_id: string;
  search_query: string;
  search_type: string;
  results_count: number;
  created_at: string;
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

// Watchlist functions
export async function addToWatchlist(paper: Paper): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_watchlist')
      .insert({
        user_id: user.id,
        paper_id: paper.id,
        paper_title: paper.title,
        paper_abstract: paper.abstract
      });

    if (error) {
      console.error('Error adding to watchlist:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    return false;
  }
}

export async function removeFromWatchlist(paperId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('paper_id', paperId);

    if (error) {
      console.error('Error removing from watchlist:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    return false;
  }
}

export async function getUserWatchlist(): Promise<WatchlistPaper[]> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_watchlist')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching watchlist:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return [];
  }
}

export async function isWatched(paperId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_watchlist')
      .select('id')
      .eq('user_id', user.id)
      .eq('paper_id', paperId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking watchlist status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking watchlist status:', error);
    return false;
  }
}

// Search history functions
export async function addToSearchHistory(
  searchQuery: string,
  resultsCount: number,
  searchType: string = 'general'
): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false; // Don't error for unauthenticated users

    const { error } = await supabase
      .from('user_search_history')
      .insert({
        user_id: user.id,
        search_query: searchQuery,
        search_type: searchType,
        results_count: resultsCount
      });

    if (error) {
      console.error('Error adding to search history:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error adding to search history:', error);
    return false;
  }
}

export async function getUserSearchHistory(limit: number = 50): Promise<SearchHistoryEntry[]> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching search history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching search history:', error);
    return [];
  }
}

export async function clearSearchHistory(): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('user_search_history')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing search history:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error clearing search history:', error);
    return false;
  }
}