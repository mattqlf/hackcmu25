'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/components/providers/SidenotesProvider';
import { AnchorBase, actions } from 'sidenotes';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Edit2, Trash2, Save, X } from 'lucide-react';
import { HighlightPopover } from './HighlightPopover';
import { SidenoteSidebarOverlay } from './SidenoteSidebarOverlay';
import { MinimalEditor } from './MinimalEditor';
import {
  serializeRange,
  deserializeRange,
  getRangeBounds,
  isValidRange,
  createHighlightManager,
  type SerializedRange,
  type HighlightManager
} from '@/lib/highlights/modernRangeUtils';
import {
  createSidenote,
  getSidenotesForPage,
  subscribeSidenotes,
  updateSidenote,
  deleteSidenote,
  type FullSidenote
} from '@/lib/supabase/sidenotes';
import { createClient } from '@/lib/supabase/client';
import '@/styles/highlights.css';

interface ModernTextHighlighterProps {
  children: React.ReactNode;
  pageUrl: string;
  docId: string;
  className?: string;
}

interface PopoverState {
  visible: boolean;
  position: { x: number; y: number };
  range: Range | null;
}



export function ModernTextHighlighter({
  children,
  pageUrl,
  docId,
  className = ''
}: ModernTextHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const [highlightManager] = useState<HighlightManager>(() => createHighlightManager());

  const [popover, setPopover] = useState<PopoverState>({
    visible: false,
    position: { x: 0, y: 0 },
    range: null
  });

  const [sidenotes, setSidenotes] = useState<FullSidenote[]>([]);
  const [selectedSidenote, setSelectedSidenote] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [highlightRanges, setHighlightRanges] = useState<Map<string, Range>>(new Map());
  const [sidenotesWithPositions, setSidenotesWithPositions] = useState<Array<FullSidenote & { position: number }>>([]);
  const [forceSidebarOpen, setForceSidebarOpen] = useState(false);
  const [minimalEditorOpen, setMinimalEditorOpen] = useState(false);
  const [editingRange, setEditingRange] = useState<Range | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Load existing sidenotes on mount
  useEffect(() => {
    loadSidenotes();
  }, [pageUrl]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeSidenotes(
      pageUrl,
      (newSidenote) => {
        // Check if we already have this sidenote (avoid duplicates from immediate rendering)
        setSidenotes(prev => {
          const exists = prev.some(s => s.id === newSidenote.id);
          if (exists) return prev; // Already added immediately, skip duplicate
          return [...prev, newSidenote];
        });

        // Only render if not already rendered
        if (!highlightRanges.has(newSidenote.id)) {
          renderHighlight(newSidenote);
        }
      },
      (updatedSidenote) => {
        setSidenotes(prev =>
          prev.map(s => s.id === updatedSidenote.id ? { ...s, ...updatedSidenote } : s)
        );
      },
      (deletedId) => {
        setSidenotes(prev => prev.filter(s => s.id !== deletedId));
        removeHighlight(deletedId);
        dispatch(actions.disconnectSidenote(docId, deletedId));
      }
    );

    return unsubscribe;
  }, [pageUrl, docId, dispatch, highlightRanges]);

  // Render highlights when sidenotes change
  useEffect(() => {
    renderAllHighlights();
  }, [sidenotes]);

  // Calculate positions when highlights change
  useEffect(() => {
    calculateSidenotePositions();
  }, [highlightRanges, sidenotes]);

  // Recalculate positions on window resize
  useEffect(() => {
    const handleResize = () => {
      calculateSidenotePositions();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const calculateSidenotePositions = () => {
    if (!containerRef.current) return;

    const positions = sidenotes.map(sidenote => {
      const range = highlightRanges.get(sidenote.id);
      let position = 0;

      if (range) {
        try {
          const bounds = getRangeBounds(range);
          const containerRect = containerRef.current!.getBoundingClientRect();
          // Calculate relative position within the container (0-1)
          position = (bounds.top - containerRect.top) / containerRect.height;
        } catch (error) {
          console.warn('Error calculating position for sidenote:', sidenote.id, error);
        }
      }

      return { ...sidenote, position };
    });

    // Sort by position (top to bottom)
    positions.sort((a, b) => a.position - b.position);
    setSidenotesWithPositions(positions);
  };

  const loadSidenotes = async () => {
    const data = await getSidenotesForPage(pageUrl);
    setSidenotes(data);
  };

  const handleMouseUp = useCallback(() => {
    if (!containerRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) {
      setPopover(prev => ({ ...prev, visible: false }));
      return;
    }

    const range = selection.getRangeAt(0);

    // Check if selection is within our container
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      setPopover(prev => ({ ...prev, visible: false }));
      return;
    }

    // Validate range before proceeding
    if (!isValidRange(range)) {
      setPopover(prev => ({ ...prev, visible: false }));
      return;
    }

    const selectionBounds = selection.getRangeAt(0).getBoundingClientRect();

    setPopover({
      visible: true,
      position: {
        x: selectionBounds.left + selectionBounds.width / 2,
        y: selectionBounds.top
      },
      range: range.cloneRange()
    });
  }, []);

  const handleAddNote = async () => {
    if (!popover.range || !containerRef.current) return;

    // Store the range and open minimal editor
    setEditingRange(popover.range.cloneRange());
    setMinimalEditorOpen(true);

    // Hide the popover
    setPopover(prev => ({ ...prev, visible: false }));
  };

  const handleSaveNote = async (content: string) => {
    if (!editingRange || !containerRef.current || !content.trim()) return;

    try {
      const serializedRange = serializeRange(editingRange, containerRef.current);
      const newSidenote = await createSidenote(content.trim(), serializedRange, pageUrl);

      if (newSidenote) {
        // Immediately add to state and render highlight (don't wait for real-time subscription)
        setSidenotes(prev => [...prev, newSidenote]);

        // Render the highlight immediately
        renderHighlight(newSidenote);

        // Connect to sidenotes library immediately
        dispatch(actions.connectSidenote(docId, newSidenote.id));

        // Clear selection
        window.getSelection()?.removeAllRanges();
        setEditingRange(null);
      } else {
        alert('Failed to create sidenote. Please try again.');
      }
    } catch (error) {
      console.error('Error creating sidenote:', error);
      alert('Failed to create sidenote. Please try again.');
    }
  };

  const renderAllHighlights = () => {
    if (!containerRef.current) return;

    // Clear existing highlights
    highlightManager.clearHighlights();
    setHighlightRanges(new Map());

    // Render all highlights
    sidenotes.forEach(sidenote => {
      renderHighlight(sidenote);
    });
  };

  const renderHighlight = (sidenote: FullSidenote) => {
    if (!containerRef.current || !sidenote.highlights[0]) return;

    const highlight = sidenote.highlights[0];
    const serializedRange: SerializedRange = {
      id: sidenote.id,
      text: highlight.highlighted_text,
      startOffset: highlight.start_offset,
      endOffset: highlight.end_offset,
      beforeContext: '', // We'll enhance this in the database later
      afterContext: '',
      containerSelector: containerRef.current.id ? `#${containerRef.current.id}` : 'div'
    };

    const range = deserializeRange(serializedRange, containerRef.current);
    if (!range || !isValidRange(range)) {
      console.warn('Could not create valid range for sidenote:', sidenote.id);
      return;
    }

    try {
      // Add highlight using the modern API
      highlightManager.addHighlight(sidenote.id, range);

      // Store range for interaction handling
      setHighlightRanges(prev => new Map(prev.set(sidenote.id, range)));

      // Connect to sidenotes library for positioning
      dispatch(actions.connectSidenote(docId, sidenote.id));

    } catch (error) {
      console.error('Error rendering highlight for sidenote:', sidenote.id, error);
    }
  };

  const removeHighlight = (sidenoteId: string) => {
    highlightManager.removeHighlight(sidenoteId);
    setHighlightRanges(prev => {
      const newMap = new Map(prev);
      newMap.delete(sidenoteId);
      return newMap;
    });
  };

  const handleHighlightClick = (sidenoteId: string) => {
    const newSelection = selectedSidenote === sidenoteId ? null : sidenoteId;
    setSelectedSidenote(newSelection);
    highlightManager.setSelectedHighlight(newSelection);

    if (newSelection) {
      // Force open the sidebar when a highlight is clicked
      setForceSidebarOpen(true);
      dispatch(actions.selectAnchor(docId, sidenoteId));
    } else {
      dispatch(actions.deselectSidenote(docId));
    }
  };

  const handleSidebarClose = () => {
    setForceSidebarOpen(false);
    setSelectedSidenote(null);
    highlightManager.setSelectedHighlight(null);
    dispatch(actions.deselectSidenote(docId));
  };

  const handleUpdateContent = async (id: string, content: string): Promise<boolean> => {
    const success = await updateSidenote(id, content);
    if (success) {
      setSidenotes(prev =>
        prev.map(s => s.id === id ? { ...s, content, updated_at: new Date().toISOString() } : s)
      );
    }
    return success;
  };

  const handleDeleteSidenote = async (id: string): Promise<boolean> => {
    const success = await deleteSidenote(id);
    if (success) {
      setSidenotes(prev => prev.filter(s => s.id !== id));
      removeHighlight(id);
      dispatch(actions.disconnectSidenote(docId, id));
    }
    return success;
  };

  const handleDeselectSidenotes = () => {
    setSelectedSidenote(null);
    highlightManager.setSelectedHighlight(null);
    dispatch(actions.deselectSidenote(docId));
  };

  const handleJumpToHighlight = (sidenoteId: string) => {
    const range = highlightRanges.get(sidenoteId);
    if (!range) return;

    try {
      // Scroll to the highlight
      const bounds = getRangeBounds(range);
      const scrollOffset = bounds.top + window.scrollY - window.innerHeight / 2;

      window.scrollTo({
        top: scrollOffset,
        behavior: 'smooth'
      });

      // Select the highlight permanently
      highlightManager.setSelectedHighlight(sidenoteId);

      // Select the sidenote
      setSelectedSidenote(sidenoteId);
      dispatch(actions.selectAnchor(docId, sidenoteId));
    } catch (error) {
      console.error('Error jumping to highlight:', error);
    }
  };

  const handleContainerClick = useCallback((event: React.MouseEvent) => {
    // For CSS Custom Highlight API, we need to detect clicks on highlights differently
    // We'll use elementFromPoint to check if we're clicking on highlighted text
    const point = { x: event.clientX, y: event.clientY };

    // Check if click is on highlighted text by examining ranges
    let clickedHighlight: string | null = null;

    for (const [sidenoteId, range] of highlightRanges) {
      const rects = range.getClientRects();
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        if (point.x >= rect.left && point.x <= rect.right &&
            point.y >= rect.top && point.y <= rect.bottom) {
          clickedHighlight = sidenoteId;
          break;
        }
      }
      if (clickedHighlight) break;
    }

    if (clickedHighlight) {
      event.stopPropagation();
      handleHighlightClick(clickedHighlight);
    } else {
      handleDeselectSidenotes();
      // Also close the sidebar when clicking on content area
      if (forceSidebarOpen) {
        handleSidebarClose();
      }
    }
  }, [highlightRanges]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseUp]);

  // Cleanup highlights on unmount
  useEffect(() => {
    return () => {
      highlightManager.clearHighlights();
    };
  }, [highlightManager]);

  return (
    <div className="relative w-full">
      {/* Main content area */}
      <article id={docId} className={`relative ${className}`}>
        <AnchorBase anchor="base">
          <div
            ref={containerRef}
            className="relative"
            style={{ userSelect: 'text' }}
            onClick={handleContainerClick}
          >
            {children}
          </div>
        </AnchorBase>
      </article>

      <HighlightPopover
        visible={popover.visible}
        position={popover.position}
        onAddNote={handleAddNote}
        onClose={() => setPopover(prev => ({ ...prev, visible: false }))}
      />

      {/* New overlay sidebar */}
      <SidenoteSidebarOverlay
        sidenotes={sidenotesWithPositions}
        selectedSidenote={selectedSidenote}
        currentUserId={currentUserId ?? undefined}
        onUpdate={handleUpdateContent}
        onDelete={handleDeleteSidenote}
        onJumpToHighlight={handleJumpToHighlight}
        onSidenotesUpdate={loadSidenotes}
        forceOpen={forceSidebarOpen}
        onClose={handleSidebarClose}
      />

      <MinimalEditor
        isOpen={minimalEditorOpen}
        onClose={() => {
          setMinimalEditorOpen(false);
          setEditingRange(null);
        }}
        onSave={handleSaveNote}
        title="Add Note"
        placeholder="Write your note here..."
      />
    </div>
  );
}