'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Edit2, Save, Trash2, Search, SortAsc, SortDesc, Clock, MapPin, Reply as ReplyIcon, MessageSquare } from 'lucide-react';
import { FullSidenote, createReply, updateReply, deleteReply, Reply } from '@/lib/supabase/sidenotes';
import { ReplyCard } from './ReplyCard';
import { formatDate } from '@/lib/utils/dateFormatter';
// Import test function to make it available in development
import '@/lib/utils/timezoneTest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidenoteSidebarProps {
  sidenotes: Array<FullSidenote & { position: number }>;
  selectedSidenote: string | null;
  currentUserId?: string;
  onUpdate: (id: string, content: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onJumpToHighlight: (id: string) => void;
  onSidenotesUpdate?: () => void;
}

interface CompactSidenoteCardProps {
  sidenote: FullSidenote & { position: number };
  currentUserId?: string;
  onUpdate: (id: string, content: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onJumpToHighlight: (id: string) => void;
  onSidenotesUpdate?: () => void;
  isSelected: boolean;
}

type SortOption = 'time-newest' | 'time-oldest' | 'location-top' | 'location-bottom';

function CompactSidenoteCard({
  sidenote,
  currentUserId,
  onUpdate,
  onDelete,
  onJumpToHighlight,
  onSidenotesUpdate,
  isSelected
}: CompactSidenoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [editContent, setEditContent] = useState(sidenote.content);
  const [replyContent, setReplyContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const totalReplies = countTotalReplies(sidenote.replies || []);

  function countTotalReplies(replies: Reply[]): number {
    return replies.reduce((count, reply) => {
      return count + 1 + countTotalReplies(reply.replies || []);
    }, 0);
  }

  const handleSave = async () => {
    if (editContent.trim() === sidenote.content) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    const success = await onUpdate(sidenote.id, editContent.trim());

    if (success) {
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
    const success = await onDelete(sidenote.id);
    if (!success) {
      alert('Failed to delete note');
    }
    setIsLoading(false);
  };

  const handleCancel = () => {
    setEditContent(sidenote.content);
    setIsEditing(false);
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

  const handleReplyToReply = async (parentReplyId: string, content: string) => {
    const success = await createReply(sidenote.id, content, parentReplyId);
    if (success) {
      onSidenotesUpdate?.();
    }
    return success;
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

  const handleReplyCancel = () => {
    setReplyContent('');
    setIsReplying(false);
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
              {!isEditing && currentUserId === sidenote.user_id ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
                    disabled={isLoading}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDelete}
                    className="h-5 w-5 p-0 opacity-60 hover:opacity-100 text-destructive"
                    disabled={isLoading}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              ) : isEditing ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSave}
                    className="h-5 w-5 p-0"
                    disabled={isLoading || !editContent.trim()}
                  >
                    <Save className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                    className="h-5 w-5 p-0"
                    disabled={isLoading}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="Enter your note..."
          className="min-h-[50px] text-sm resize-none"
          disabled={isLoading}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSave();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
        />
      ) : (
        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {sidenote.content}
        </div>
      )}

      {/* Highlighted text preview */}
      {sidenote.highlights[0] && (
        <div className="mt-2 text-xs text-muted-foreground bg-muted/20 p-2 rounded border-l-2 border-primary/30">
          <div className="italic line-clamp-2">
&ldquo;{sidenote.highlights[0].highlighted_text}&rdquo;
          </div>
        </div>
      )}

      {/* Reply Actions */}
      {!isEditing && (
        <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsReplying(true)}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            disabled={isLoading}
          >
            <ReplyIcon className="w-3 h-3 mr-1" />
            Reply
          </Button>

          {totalReplies > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowReplies(!showReplies)}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              disabled={isLoading}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}
            </Button>
          )}
        </div>
      )}

      {/* Reply Form */}
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
            <Button
              size="sm"
              onClick={handleReply}
              disabled={isLoading || !replyContent.trim()}
              className="h-7"
            >
              Reply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReplyCancel}
              disabled={isLoading}
              className="h-7"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Replies Section */}
      {showReplies && sidenote.replies && sidenote.replies.length > 0 && (
        <div className="mt-3 border-t border-border/30 pt-3" onClick={(e) => e.stopPropagation()}>
          {sidenote.replies.map((reply) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              depth={0}
              currentUserId={currentUserId}
              onReply={handleReplyToReply}
              onUpdate={handleUpdateReply}
              onDelete={handleDeleteReply}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

export function SidenoteSidebar({
  sidenotes,
  selectedSidenote,
  currentUserId,
  onUpdate,
  onDelete,
  onJumpToHighlight,
  onSidenotesUpdate
}: SidenoteSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('location-top');

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

  return (
    <div className="w-80 h-full bg-background border-l border-border/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/30 bg-muted/20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Notes</h3>
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            {filteredAndSortedSidenotes.length} {filteredAndSortedSidenotes.length === 1 ? 'note' : 'notes'}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes and highlights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
        </div>

        {/* Sort Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between h-8">
              <div className="flex items-center gap-2">
                {getSortIcon()}
                <span className="text-sm">{getSortLabel(sortOption)}</span>
              </div>
              {sortOption.includes('newest') || sortOption.includes('bottom') ?
                <SortDesc className="w-4 h-4" /> :
                <SortAsc className="w-4 h-4" />
              }
            </Button>
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
      <div className="flex-1 overflow-y-auto p-3">
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
            />
          ))
        )}
      </div>
    </div>
  );
}