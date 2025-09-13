'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit2, Save, Trash2, Reply as ReplyIcon, MoreVertical } from 'lucide-react';
import { Reply, voteReply } from '@/lib/supabase/sidenotes';
import { formatDate } from '@/lib/utils/dateFormatter';
import { renderContent } from '@/lib/utils/latexRenderer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VoteButtons } from './VoteButtons';

interface ReplyCardProps {
  reply: Reply;
  depth: number;
  currentUserId?: string;
  onReply: (parentReplyId: string, content: string) => Promise<boolean>;
  onUpdate: (replyId: string, content: string) => Promise<boolean>;
  onDelete: (replyId: string) => Promise<boolean>;
  onVoteUpdate?: () => void;
}

export function ReplyCard({
  reply,
  depth,
  currentUserId,
  onReply,
  onUpdate,
  onDelete,
  onVoteUpdate
}: ReplyCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [replyContent, setReplyContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const maxDepth = 5; // Limit nesting depth for UI sanity
  const canReply = depth < maxDepth;
  const isOwner = currentUserId === reply.user_id;


  const handleSave = async () => {
    if (editContent.trim() === reply.content) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    const success = await onUpdate(reply.id, editContent.trim());

    if (success) {
      setIsEditing(false);
    } else {
      alert('Failed to update reply');
    }
    setIsLoading(false);
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;

    setIsLoading(true);
    const success = await onReply(reply.id, replyContent.trim());

    if (success) {
      setIsReplying(false);
      setReplyContent('');
    } else {
      alert('Failed to add reply');
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this reply?')) {
      return;
    }

    setIsLoading(true);
    const success = await onDelete(reply.id);
    if (!success) {
      alert('Failed to delete reply');
    }
    setIsLoading(false);
  };

  const handleCancel = () => {
    setEditContent(reply.content);
    setIsEditing(false);
  };

  const handleReplyCancel = () => {
    setReplyContent('');
    setIsReplying(false);
  };

  const handleVote = async (voteType: -1 | 1) => {
    setIsLoading(true);
    try {
      const success = await voteReply(reply.id, voteType);
      if (success) {
        // Call the parent update callback
        onVoteUpdate?.();
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
    <div className={`mb-3 ${depth > 0 ? 'ml-6 border-l-2 border-muted/30 pl-4' : ''}`}>
      {/* Reply Header */}
      <div className="flex items-start gap-3">
        <Avatar className="w-7 h-7 flex-shrink-0">
          <AvatarImage src={reply.user_profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(reply.user_profile?.full_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-foreground">
              {reply.user_profile?.full_name || 'Anonymous'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDate(reply.created_at)}
            </span>
            {reply.created_at !== reply.updated_at && (
              <span className="text-xs text-muted-foreground italic">edited</span>
            )}
          </div>

          {/* Reply Content */}
          {isEditing ? (
            <div className="mb-3">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Edit your reply..."
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
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSave}
                  disabled={isLoading || !editContent.trim()}
                  className="glass-button-sm"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="glass-button-sm text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              className="text-sm text-foreground leading-relaxed mb-2 whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: renderContent(reply.content) }}
            />
          )}

          {/* Reply Actions */}
          {!isEditing && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
              {canReply && (
                <button
                  onClick={() => setIsReplying(true)}
                  className="glass-button-sm text-slate-600 hover:text-slate-800"
                  disabled={isLoading}
                >
                  <ReplyIcon className="w-3 h-3 mr-1" />
                  Reply
                </button>
              )}

              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="glass-button-icon-sm text-slate-500 hover:text-slate-700"
                      disabled={isLoading}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit2 className="w-3 h-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              </div>

              {/* Vote Buttons - only show if vote columns exist */}
              {(reply.upvotes !== undefined || reply.net_votes !== undefined) ? (
                <VoteButtons
                  upvotes={reply.upvotes || 0}
                  downvotes={reply.downvotes || 0}
                  netVotes={reply.net_votes || 0}
                  userVote={reply.user_vote}
                  onVote={handleVote}
                  disabled={isLoading}
                  size="sm"
                  orientation="horizontal"
                />
              ) : (
                <div className="text-xs text-slate-500 bg-yellow-100 px-1 py-0.5 rounded">
                  Migration needed
                </div>
              )}
            </div>
          )}

          {/* Reply Form */}
          {isReplying && (
            <div className="mb-3">
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
        </div>
      </div>

      {/* Nested Replies */}
      {reply.replies && reply.replies.length > 0 && (
        <div className="mt-3">
          {reply.replies.map((childReply) => (
            <ReplyCard
              key={childReply.id}
              reply={childReply}
              depth={depth + 1}
              currentUserId={currentUserId}
              onReply={onReply}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onVoteUpdate={onVoteUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}