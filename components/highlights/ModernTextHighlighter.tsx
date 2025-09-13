'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { AnchorBase, actions } from 'sidenotes';
import { HighlightPopover } from './HighlightPopover';
import { SidenoteSidebar } from './SidenoteSidebar';
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

interface SidenoteDisplayProps {
  sidenote: FullSidenote;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onJumpToHighlight?: (id: string) => void;
  isSelected?: boolean;
}

function SidenoteDisplay({ sidenote, onUpdate, onDelete, onJumpToHighlight, isSelected }: SidenoteDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(sidenote.content);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (editContent.trim() === sidenote.content) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    const success = await updateSidenote(sidenote.id, editContent.trim());

    if (success) {
      onUpdate(sidenote.id, editContent.trim());
      setIsEditing(false);
    } else {
      alert('Failed to update note');
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    setIsLoading(true);
    const success = await deleteSidenote(sidenote.id);

    if (success) {
      onDelete(sidenote.id);
    } else {
      alert('Failed to delete note');
    }
    setIsLoading(false);
  };

  const handleCancel = () => {
    setEditContent(sidenote.content);
    setIsEditing(false);
  };

  return (
    <Card
      className={`p-4 backdrop-blur-sm border mb-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
        isSelected
          ? 'bg-primary/5 border-primary/50 shadow-md'
          : 'bg-background/95 border-border/50 hover:bg-muted/30'
      }`}
      onClick={() => onJumpToHighlight?.(sidenote.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="text-xs text-muted-foreground">
          {new Date(sidenote.created_at).toLocaleDateString()}
        </div>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {!isEditing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-6 w-6 p-0"
                disabled={isLoading}
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                disabled={isLoading}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSave}
                className="h-6 w-6 p-0"
                disabled={isLoading || !editContent.trim()}
              >
                <Save className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                className="h-6 w-6 p-0"
                disabled={isLoading}
              >
                <X className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="Enter your note..."
          className="min-h-[60px] text-sm resize-none"
          disabled={isLoading}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSave();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
        />
      ) : (
        <div className="text-sm whitespace-pre-wrap break-words">
          {sidenote.content}
        </div>
      )}

      {sidenote.highlights[0] && (
        <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
          <div className="font-medium mb-1">Highlighted text:</div>
          <div className="italic">&ldquo;{sidenote.highlights[0].highlighted_text}&rdquo;</div>
        </div>
      )}
    </Card>
  );
}

export function ModernTextHighlighter({
  children,
  pageUrl,
  docId,
  className = ''
}: ModernTextHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();
  const [highlightManager] = useState<HighlightManager>(() => createHighlightManager());

  const [popover, setPopover] = useState<PopoverState>({
    visible: false,
    position: { x: 0, y: 0 },
    range: null
  });

  const [sidenotes, setSidenotes] = useState<FullSidenote[]>([]);
  const [selectedSidenote, setSelectedSidenote] = useState<string | null>(null);
  const [highlightRanges, setHighlightRanges] = useState<Map<string, Range>>(new Map());
  const [sidenotesWithPositions, setSidenotesWithPositions] = useState<Array<FullSidenote & { position: number }>>([]);

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

  const handleMouseUp = useCallback((event: MouseEvent) => {
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

    // Check if we're selecting inside an existing highlight (for CSS API this is less relevant)
    const rangeBounds = getRangeBounds(range);
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

    const content = prompt('Enter your note:');
    if (!content) return;

    try {
      const serializedRange = serializeRange(popover.range, containerRef.current);
      const newSidenote = await createSidenote(content, serializedRange, pageUrl);

      if (newSidenote) {
        // Immediately add to state and render highlight (don't wait for real-time subscription)
        setSidenotes(prev => [...prev, newSidenote]);

        // Render the highlight immediately
        renderHighlight(newSidenote);

        // Connect to sidenotes library immediately
        dispatch(actions.connectSidenote(docId, newSidenote.id));

        // Clear selection
        window.getSelection()?.removeAllRanges();
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
      dispatch(actions.selectAnchor(docId, sidenoteId));
    } else {
      dispatch(actions.deselectSidenote(docId));
    }
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
    const target = event.target as HTMLElement;
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
    <div className="flex h-screen">
      {/* Main content area */}
      <div className="flex-1 overflow-auto">
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
      </div>

      {/* New organized sidebar */}
      <SidenoteSidebar
        sidenotes={sidenotesWithPositions}
        selectedSidenote={selectedSidenote}
        onUpdate={handleUpdateContent}
        onDelete={handleDeleteSidenote}
        onJumpToHighlight={handleJumpToHighlight}
      />
    </div>
  );
}