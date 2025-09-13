'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit2, Save, Trash2, Reply as ReplyIcon, MoreVertical } from 'lucide-react';
import { Reply } from '@/lib/supabase/sidenotes';
import { formatDate } from '@/lib/utils/dateFormatter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReplyCardProps {
  reply: Reply;
  depth: number;
  currentUserId?: string;
  onReply: (parentReplyId: string, content: string) => Promise<boolean>;
  onUpdate: (replyId: string, content: string) => Promise<boolean>;
  onDelete: (replyId: string) => Promise<boolean>;
}

export function ReplyCard({
  reply,
  depth,
  currentUserId,
  onReply,
  onUpdate,
  onDelete
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
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isLoading || !editContent.trim()}
                  className="h-7"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="h-7"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-foreground leading-relaxed mb-2 whitespace-pre-wrap break-words">
              {reply.content}
            </div>
          )}

          {/* Reply Actions */}
          {!isEditing && (
            <div className="flex items-center gap-2 mb-3">
              {canReply && (
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
              )}

              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1 text-muted-foreground hover:text-foreground"
                      disabled={isLoading}
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}