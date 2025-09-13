'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Sidenote, AnchorBase, actions } from 'sidenotes';
import { HighlightPopover } from './HighlightPopover';
import { serializeRange, deserializeRange, getRangeBounds, type SerializedRange } from '@/lib/highlights/rangeUtils';
import { createSidenote, getSidenotesForPage, subscribeSidenotes, updateSidenote, deleteSidenote, type FullSidenote } from '@/lib/supabase/sidenotes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { X, Edit2, Save, Trash2 } from 'lucide-react';

interface IntegratedTextHighlighterProps {
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
}

function SidenoteDisplay({ sidenote, onUpdate, onDelete }: SidenoteDisplayProps) {
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
    <Card className="p-4 bg-background/95 backdrop-blur-sm border border-border/50 mb-2">
      <div className="flex justify-between items-start mb-2">
        <div className="text-xs text-muted-foreground">
          {new Date(sidenote.created_at).toLocaleDateString()}
        </div>
        <div className="flex gap-1">
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

export function IntegratedTextHighlighter({
  children,
  pageUrl,
  docId,
  className = ''
}: IntegratedTextHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();
  const [popover, setPopover] = useState<PopoverState>({
    visible: false,
    position: { x: 0, y: 0 },
    range: null
  });
  const [sidenotes, setSidenotes] = useState<FullSidenote[]>([]);
  const [highlightElements, setHighlightElements] = useState<Set<Element>>(new Set());

  // Load existing sidenotes on mount
  useEffect(() => {
    loadSidenotes();
  }, [pageUrl]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeSidenotes(
      pageUrl,
      (newSidenote) => {
        setSidenotes(prev => [...prev, newSidenote]);
        renderHighlight(newSidenote);
      },
      (updatedSidenote) => {
        setSidenotes(prev =>
          prev.map(s => s.id === updatedSidenote.id ? { ...s, ...updatedSidenote } : s)
        );
      },
      (deletedId) => {
        setSidenotes(prev => prev.filter(s => s.id !== deletedId));
        removeHighlight(deletedId);
        // Disconnect from sidenotes library
        dispatch(actions.disconnectSidenote(docId, deletedId));
      }
    );

    return unsubscribe;
  }, [pageUrl, docId, dispatch]);

  // Render highlights when sidenotes change
  useEffect(() => {
    renderAllHighlights();
  }, [sidenotes]);

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

    // Don't show popover if selecting existing highlights
    const rangeBounds = getRangeBounds(range);
    const elementsInRange = document.elementsFromPoint(
      rangeBounds.left + rangeBounds.width / 2,
      rangeBounds.top + rangeBounds.height / 2
    );

    const hasHighlight = elementsInRange.some(el =>
      el.classList.contains('text-highlight') || el.closest('.text-highlight')
    );

    if (hasHighlight) {
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

    const content = prompt('Enter your note:');
    if (!content) return;

    try {
      const serializedRange = serializeRange(popover.range, containerRef.current);
      const newSidenote = await createSidenote(content, serializedRange, pageUrl);

      if (newSidenote) {
        // Clear selection
        window.getSelection()?.removeAllRanges();
        // The real-time subscription will handle adding to state and rendering
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
    highlightElements.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(el.textContent || ''), el);
        parent.normalize();
      }
    });
    setHighlightElements(new Set());

    // Render all highlights
    sidenotes.forEach(sidenote => {
      renderHighlight(sidenote);
    });
  };

  const renderHighlight = (sidenote: FullSidenote) => {
    if (!containerRef.current || !sidenote.highlights[0]) return;

    const highlight = sidenote.highlights[0];
    const serializedRange: SerializedRange = {
      startContainerPath: highlight.start_container_path,
      startOffset: highlight.start_offset,
      endContainerPath: highlight.end_container_path,
      endOffset: highlight.end_offset,
      text: highlight.highlighted_text,
      isRelative: true
    };

    const range = deserializeRange(serializedRange, containerRef.current);
    if (!range) return;

    try {
      // Create highlight wrapper that integrates with sidenotes library
      const highlightSpan = document.createElement('span');
      highlightSpan.className = 'text-highlight bg-yellow-200 cursor-pointer rounded-sm px-1 transition-colors hover:bg-yellow-300 anchor';
      highlightSpan.setAttribute('data-sidenote-id', sidenote.id);
      highlightSpan.title = `Note: ${sidenote.content}`;

      // Use a more robust method to wrap content
      try {
        // Try the simple approach first (works for ranges within a single text node)
        range.surroundContents(highlightSpan);
      } catch (surroundError) {
        // Fallback for complex ranges that span multiple nodes
        const contents = range.extractContents();
        highlightSpan.appendChild(contents);
        range.insertNode(highlightSpan);
      }

      setHighlightElements(prev => new Set([...prev, highlightSpan]));

      // Add click handler to mimic InlineAnchor behavior
      highlightSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        dispatch(actions.selectAnchor(docId, highlightSpan));
      });

      // Connect anchor and sidenote to library
      dispatch(actions.connectAnchor(docId, sidenote.id, highlightSpan));
      dispatch(actions.connectSidenote(docId, sidenote.id));

    } catch (error) {
      console.error('Error rendering highlight:', error);
    }
  };

  const removeHighlight = (sidenoteId: string) => {
    const highlightEl = containerRef.current?.querySelector(`[data-sidenote-id="${sidenoteId}"]`);
    if (highlightEl) {
      const parent = highlightEl.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlightEl.textContent || ''), highlightEl);
        parent.normalize();
      }
      setHighlightElements(prev => {
        const newSet = new Set(prev);
        newSet.delete(highlightEl);
        return newSet;
      });
    }
  };

  const handleUpdateContent = (id: string, content: string) => {
    setSidenotes(prev =>
      prev.map(s => s.id === id ? { ...s, content, updated_at: new Date().toISOString() } : s)
    );
  };

  const handleDeleteSidenote = (id: string) => {
    setSidenotes(prev => prev.filter(s => s.id !== id));
    removeHighlight(id);
    // Disconnect from sidenotes library
    dispatch(actions.disconnectSidenote(docId, id));
  };

  const handleDeselectSidenotes = () => {
    dispatch(actions.deselectSidenote(docId));
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseUp]);

  return (
    <>
      <article id={docId} onClick={handleDeselectSidenotes} className={`relative ${className}`}>
        <AnchorBase anchor="base">
          <div
            ref={containerRef}
            className="relative"
            style={{ userSelect: 'text' }}
          >
            {children}
          </div>
        </AnchorBase>

        {/* Sidenotes positioned using the library's layout */}
        <div className="sidenotes">
          {sidenotes.map((sidenote) => (
            <Sidenote key={sidenote.id} sidenote={sidenote.id} base="base">
              <SidenoteDisplay
                sidenote={sidenote}
                onUpdate={handleUpdateContent}
                onDelete={handleDeleteSidenote}
              />
            </Sidenote>
          ))}
        </div>
      </article>

      <HighlightPopover
        visible={popover.visible}
        position={popover.position}
        onAddNote={handleAddNote}
        onClose={() => setPopover(prev => ({ ...prev, visible: false }))}
      />
    </>
  );
}