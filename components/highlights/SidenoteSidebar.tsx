'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Edit2, Save, Trash2, Search, SortAsc, SortDesc, Clock, MapPin } from 'lucide-react';
import { FullSidenote } from '@/lib/supabase/sidenotes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidenoteSidebarProps {
  sidenotes: Array<FullSidenote & { position: number }>;
  selectedSidenote: string | null;
  onUpdate: (id: string, content: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onJumpToHighlight: (id: string) => void;
}

interface CompactSidenoteCardProps {
  sidenote: FullSidenote & { position: number };
  onUpdate: (id: string, content: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onJumpToHighlight: (id: string) => void;
  isSelected: boolean;
}

type SortOption = 'time-newest' | 'time-oldest' | 'location-top' | 'location-bottom';

function CompactSidenoteCard({
  sidenote,
  onUpdate,
  onDelete,
  onJumpToHighlight,
  isSelected
}: CompactSidenoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(sidenote.content);
  const [isLoading, setIsLoading] = useState(false);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
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
      {/* Header with timestamp and actions */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs text-muted-foreground font-medium">
          {formatDate(sidenote.created_at)}
        </div>
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {!isEditing ? (
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
          ) : (
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
          )}
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
    </Card>
  );
}

export function SidenoteSidebar({
  sidenotes,
  selectedSidenote,
  onUpdate,
  onDelete,
  onJumpToHighlight
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
              onUpdate={onUpdate}
              onDelete={onDelete}
              onJumpToHighlight={onJumpToHighlight}
              isSelected={selectedSidenote === sidenote.id}
            />
          ))
        )}
      </div>
    </div>
  );
}