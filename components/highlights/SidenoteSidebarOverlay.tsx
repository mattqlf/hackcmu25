'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Edit2,
  Trash2,
  Search,
  SortAsc,
  SortDesc,
  Clock,
  MapPin,
  Reply as ReplyIcon,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  GripVertical
} from 'lucide-react';
import { FullSidenote, createReply, updateReply, deleteReply, Reply, voteSidenote } from '@/lib/supabase/sidenotes';
import { ReplyCard } from './ReplyCard';
import { formatDate } from '@/lib/utils/dateFormatter';
import { renderContent } from '@/lib/utils/latexRenderer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MinimalEditor } from './MinimalEditor';
import { VoteButtons } from './VoteButtons';

interface SidenoteSidebarOverlayProps {
  sidenotes: Array<FullSidenote & { position: number }>;
  selectedSidenote: string | null;
  currentUserId?: string;
  onUpdate: (id: string, content: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onJumpToHighlight: (id: string) => void;
  onSidenotesUpdate?: () => void;
  forceOpen?: boolean;
  onClose?: () => void;
}

interface CompactSidenoteCardProps {
  sidenote: FullSidenote & { position: number };
  currentUserId?: string;
  onUpdate: (id: string, content: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onJumpToHighlight: (id: string) => void;
  onSidenotesUpdate?: () => void;
  isSelected: boolean;
  isFlashing?: boolean;
}

type SortOption = 'time-newest' | 'time-oldest' | 'location-top' | 'location-bottom';

function CompactSidenoteCard({
  sidenote,
  currentUserId,
  onUpdate,
  onDelete,
  onJumpToHighlight,
  onSidenotesUpdate,
  isSelected,
  isFlashing = false
}: CompactSidenoteCardProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [minimalEditorOpen, setMinimalEditorOpen] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const totalReplies = countTotalReplies(sidenote.replies || []);

  function countTotalReplies(replies: Reply[]): number {
    return replies.reduce((count, reply) => {
      return count + 1 + countTotalReplies(reply.replies || []);
    }, 0);
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    setIsLoading(true);
    const success = await onDelete(sidenote.id);
    if (!success) {
      alert('Failed to delete note');
    }
    setIsLoading(false);
  };

  const handleReplyToReply = async (parentReplyId: string, content: string) => {
    const reply = await createReply(sidenote.id, content, parentReplyId);
    if (reply) {
      onSidenotesUpdate?.();
    }
    return !!reply;
  };

  const handleUpdateReply = async (replyId: string, content: string) => {
    const success = await updateReply(replyId, content);
    if (success) {
      onSidenotesUpdate?.();
    }
    return success;
  };

  const handleDeleteReply = async (replyId: string) => {
    const success = await deleteReply(replyId);
    if (success) {
      onSidenotesUpdate?.();
    }
    return success;
  };

  const handleIframeSave = async (content: string) => {
    if (content.trim() === sidenote.content) {
      setMinimalEditorOpen(false);
      return;
    }

    setIsLoading(true);
    const success = await onUpdate(sidenote.id, content.trim());

    if (success) {
      setMinimalEditorOpen(false);
    } else {
      alert('Failed to update note');
    }
    setIsLoading(false);
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;

    setIsLoading(true);
    const success = await createReply(sidenote.id, replyContent.trim());

    if (success) {
      setIsReplying(false);
      setReplyContent('');
      setShowReplies(true);
      onSidenotesUpdate?.();
    } else {
      alert('Failed to add reply');
    }
    setIsLoading(false);
  };

  const handleReplyCancel = () => {
    setReplyContent('');
    setIsReplying(false);
  };

  const handleVote = async (voteType: -1 | 1) => {
    setIsLoading(true);
    try {
      const success = await voteSidenote(sidenote.id, voteType);
      if (success) {
        // Force a refresh of sidenotes to get updated vote counts
        onSidenotesUpdate?.();
      } else {
        alert('Failed to vote. Please try again.');
      }
      return success;
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Card
      className={`p-3 mb-2 transition-all duration-200 cursor-pointer hover:shadow-sm ${
        isSelected
          ? 'bg-primary/5 border-primary/50 shadow-sm'
          : 'bg-background/95 border-border/30 hover:bg-muted/20'
      } ${
        isFlashing ? 'gentle-flash' : ''
      }`}
      onClick={() => onJumpToHighlight(sidenote.id)}
    >
      {/* Header with user info and timestamp */}
      <div className="flex items-start gap-2 mb-3">
        <Avatar className="w-6 h-6 flex-shrink-0">
          <AvatarImage src={sidenote.user_profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(sidenote.user_profile?.full_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">
                {sidenote.user_profile?.full_name || 'Anonymous'}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(sidenote.created_at)}
              </span>
              {sidenote.created_at !== sidenote.updated_at && (
                <span className="text-xs text-muted-foreground italic">edited</span>
              )}
            </div>

            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              {currentUserId === sidenote.user_id && (
                <>
                  <button
                    onClick={() => setMinimalEditorOpen(true)}
                    className="glass-button-icon-sm text-slate-500 hover:text-slate-700 opacity-60 hover:opacity-100"
                    disabled={isLoading}
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="glass-button-icon-sm text-red-500 hover:text-red-600 opacity-60 hover:opacity-100"
                    disabled={isLoading}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className="text-sm whitespace-pre-wrap break-words leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderContent(sidenote.content) }}
      />

      {/* Highlighted text preview */}
      {sidenote.highlights[0] && (
        <div className="mt-2 text-xs text-muted-foreground bg-muted/20 p-2 rounded border-l-2 border-primary/30">
          <div className="italic line-clamp-2">
            &ldquo;{sidenote.highlights[0].highlighted_text}&rdquo;
          </div>
        </div>
      )}

      {/* Actions */}
        <div className="mt-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReplying(true)}
              className="glass-button-sm text-slate-600 hover:text-slate-800"
              disabled={isLoading}
            >
              <ReplyIcon className="w-3 h-3 mr-1" />
              Reply
            </button>

            {totalReplies > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="glass-button-sm text-slate-600 hover:text-slate-800"
                disabled={isLoading}
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>

          {/* Vote Buttons - only show if vote columns exist */}
          {(sidenote.upvotes !== undefined || sidenote.net_votes !== undefined) ? (
            <VoteButtons
              upvotes={sidenote.upvotes || 0}
              downvotes={sidenote.downvotes || 0}
              netVotes={sidenote.net_votes || 0}
              userVote={sidenote.user_vote}
              onVote={handleVote}
              disabled={isLoading}
              size="sm"
              orientation="horizontal"
            />
          ) : (
            <div className="text-xs text-slate-500 bg-yellow-100 px-2 py-1 rounded">
              Run migration to enable voting
            </div>
          )}
        </div>

      {/* Simple Reply Form */}
      {isReplying && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            className="min-h-[60px] text-sm resize-none"
            disabled={isLoading}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleReply();
              } else if (e.key === 'Escape') {
                handleReplyCancel();
              }
            }}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleReply}
              disabled={isLoading || !replyContent.trim()}
              className="glass-button-sm"
            >
              Reply
            </button>
            <button
              onClick={handleReplyCancel}
              disabled={isLoading}
              className="glass-button-sm text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Replies Section with scrollable container */}
      {showReplies && sidenote.replies && sidenote.replies.length > 0 && (
        <div className="mt-3 border-t border-border/30 pt-3 max-h-96 overflow-y-auto sidebar-scrollbar" onClick={(e) => e.stopPropagation()}>
          {sidenote.replies.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              depth={0}
              currentUserId={currentUserId}
              onReply={handleReplyToReply}
              onUpdate={handleUpdateReply}
              onDelete={handleDeleteReply}
              onVoteUpdate={onSidenotesUpdate}
            />
          ))}
        </div>
      )}

      {/* Iframe Editor for editing sidenote */}
      <MinimalEditor
        isOpen={minimalEditorOpen}
        onClose={() => setMinimalEditorOpen(false)}
        onSave={handleIframeSave}
        initialContent={sidenote.content}
        title="Edit Note"
        placeholder="Edit your note..."
      />

    </Card>
  );
}

export function SidenoteSidebarOverlay({
  sidenotes,
  selectedSidenote,
  currentUserId,
  onUpdate,
  onDelete,
  onJumpToHighlight,
  onSidenotesUpdate,
  forceOpen = false,
  onClose
}: SidenoteSidebarOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('location-top');
  const [isMinimized, setIsMinimized] = useState(false);
  const [width, setWidth] = useState(384); // 24rem in pixels
  const [isResizing, setIsResizing] = useState(false);
  const [flashingSidenoteId, setFlashingSidenoteId] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const minWidth = 280;
  const maxWidth = 600;

  // Handle forceOpen and flash effect
  useEffect(() => {
    if (forceOpen || selectedSidenote) {
      setIsMinimized(false);

      if (selectedSidenote) {
        // Flash the selected sidenote
        setFlashingSidenoteId(selectedSidenote);
        setTimeout(() => {
          setFlashingSidenoteId(null);
        }, 1000); // Flash for 1 second
      }
    }
  }, [forceOpen, selectedSidenote]);

  // Handle click outside sidebar to close it
  const handleBackdropClick = useCallback(() => {
    if (!isMinimized && onClose) {
      setIsMinimized(true);
      onClose();
    }
  }, [isMinimized, onClose]);

  // Handle mouse resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const newWidth = window.innerWidth - e.clientX;
    setWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Filter and sort sidenotes
  const filteredAndSortedSidenotes = useMemo(() => {
    let filtered = sidenotes;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = sidenotes.filter(sidenote =>
        sidenote.content.toLowerCase().includes(query) ||
        (sidenote.highlights[0]?.highlighted_text.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'time-newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'time-oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'location-top':
          return a.position - b.position;
        case 'location-bottom':
          return b.position - a.position;
        default:
          return a.position - b.position;
      }
    });

    return sorted;
  }, [sidenotes, searchQuery, sortOption]);

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case 'time-newest': return 'Newest First';
      case 'time-oldest': return 'Oldest First';
      case 'location-top': return 'Top to Bottom';
      case 'location-bottom': return 'Bottom to Top';
    }
  };

  const getSortIcon = () => {
    if (sortOption.startsWith('time')) {
      return <Clock className="w-4 h-4" />;
    } else {
      return <MapPin className="w-4 h-4" />;
    }
  };

  // If no sidenotes, don't render the overlay
  if (sidenotes.length === 0) {
    return null;
  }

  return (
    <>
      {/* Overlay backdrop - only show when sidebar is not minimized */}
      {!isMinimized && (
        <div
          className="fixed inset-0 bg-black/10 z-40"
          onClick={handleBackdropClick}
        />
      )}

      {/* Sidebar overlay */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 right-0 h-full glass-card-strong border-l border-white/30 flex flex-col shadow-2xl z-50 transition-all duration-300 ease-in-out ${
          isMinimized ? 'translate-x-full' : 'translate-x-0'
        }`}
        style={{ width: `${width}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Resize handle */}
        <div
          ref={resizeRef}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-slate-400/50 transition-colors"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-2">
            <GripVertical className="w-3 h-3 text-slate-600" />
          </div>
        </div>

        {/* Header */}
        <div className="p-4 border-b border-white/20 bg-white/5 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="modern-heading font-semibold text-lg text-slate-900">Notes</h3>
            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-700 glass-card px-2 py-1 rounded">
                {filteredAndSortedSidenotes.length} {filteredAndSortedSidenotes.length === 1 ? 'note' : 'notes'}
              </div>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="glass-button-icon-sm text-slate-500 hover:text-slate-700"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              placeholder="Search notes and highlights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full pl-10 h-9 text-sm"
            />
          </div>

          {/* Sort Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="glass-button w-full justify-between h-8 px-3 flex items-center">
                <div className="flex items-center gap-2">
                  {getSortIcon()}
                  <span className="modern-text text-sm">{getSortLabel(sortOption)}</span>
                </div>
                {sortOption.includes('newest') || sortOption.includes('bottom') ?
                  <SortDesc className="w-4 h-4" /> :
                  <SortAsc className="w-4 h-4" />
                }
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => setSortOption('location-top')}>
                <MapPin className="w-4 h-4 mr-2" />
                Top to Bottom
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('location-bottom')}>
                <MapPin className="w-4 h-4 mr-2" />
                Bottom to Top
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('time-newest')}>
                <Clock className="w-4 h-4 mr-2" />
                Newest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption('time-oldest')}>
                <Clock className="w-4 h-4 mr-2" />
                Oldest First
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-3 sidebar-scrollbar">
          {filteredAndSortedSidenotes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {searchQuery ? (
                <div>
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No notes found for "{searchQuery}"</p>
                </div>
              ) : (
                <div>
                  <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 opacity-50" />
                  </div>
                  <p>No notes yet</p>
                  <p className="text-xs mt-1">Select text to create your first note</p>
                </div>
              )}
            </div>
          ) : (
            filteredAndSortedSidenotes.map((sidenote) => (
              <CompactSidenoteCard
                key={sidenote.id}
                sidenote={sidenote}
                currentUserId={currentUserId}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onJumpToHighlight={onJumpToHighlight}
                onSidenotesUpdate={onSidenotesUpdate}
                isSelected={selectedSidenote === sidenote.id}
                isFlashing={flashingSidenoteId === sidenote.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Minimized tab */}
      {isMinimized && sidenotes.length > 0 && (
        <div
          className="fixed top-1/2 right-0 -translate-y-1/2 bg-primary text-primary-foreground px-2 py-4 rounded-l-lg shadow-lg cursor-pointer z-50 transition-all hover:px-3"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex flex-col items-center gap-2">
            <ChevronLeft className="w-4 h-4" />
            <div className="writing-mode-vertical text-xs font-medium">
              {sidenotes.length} Notes
            </div>
          </div>
        </div>
      )}
    </>
  );
}