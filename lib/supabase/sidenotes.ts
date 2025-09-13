import { createClient } from './client';
import type { SerializedRange } from '../highlights/modernRangeUtils';

export interface Sidenote {
  id: string;
  user_id: string;
  page_url: string;
  content: string;
  created_at: string;
  updated_at: string;
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

export interface FullSidenote extends Sidenote {
  highlights: Highlight[];
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
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Create sidenote
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
      throw sidenoteError;
    }

    // Create highlight - adapt new format to old database schema
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
      throw highlightError;
    }

    return {
      ...sidenote,
      highlights: [highlight]
    };
  } catch (error) {
    console.error('Error creating sidenote:', error);
    return null;
  }
}

/**
 * Get all sidenotes for a specific page
 */
export async function getSidenotesForPage(pageUrl: string): Promise<FullSidenote[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('sidenotes')
      .select(`
        *,
        highlights (*)
      `)
      .eq('page_url', pageUrl)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
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
    const { data, error } = await supabase
      .from('sidenotes')
      .select(`
        *,
        highlights (*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching sidenote:', error);
    return null;
  }
}