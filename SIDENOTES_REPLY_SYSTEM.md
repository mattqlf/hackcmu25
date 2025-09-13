# Sidenotes Reply System Implementation

## Overview

This implementation adds a comprehensive reply system to the existing sidenotes feature, allowing users to reply to previous notes in the sidebar with infinite nested replies. Each note and reply includes timestamps and user profile information.

## Features Implemented

### 1. **Infinite Chain Replies**
- Users can reply to any note or reply
- Supports unlimited nesting depth (UI limits to 5 levels for readability)
- Tree structure for organizing nested conversations

### 2. **Timestamps**
- All notes and replies include creation and update timestamps
- Smart relative time display (e.g., "5m ago", "2h ago", "Jan 15")
- Shows "edited" indicator when content has been modified

### 3. **User Profiles**
- Displays user names and avatars for all notes and replies
- Fallback to initials when no avatar is available
- Anonymous fallback for users without profiles

### 4. **Real-time Updates**
- Automatic refresh of sidebar when new replies are added
- Maintains scroll position and expanded state

## Database Schema

### New Tables

#### `user_profiles` table:
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### `replies` table:
```sql
CREATE TABLE replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sidenote_id UUID NOT NULL REFERENCES sidenotes(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Key Relationships
- `replies.sidenote_id` → `sidenotes.id` (each reply belongs to a sidenote)
- `replies.parent_reply_id` → `replies.id` (for nested replies)
- `replies.user_id` → `user_profiles.id` (reply author)

## Files Created/Modified

### New Components
1. **`components/highlights/ReplyCard.tsx`**
   - Individual reply component with nested rendering
   - Edit/delete functionality for reply owners
   - Recursive component for infinite nesting

2. **`components/ui/avatar.tsx`**
   - Radix UI Avatar component for user profile pictures

### Database Migrations
1. **`supabase/migrations/20240913000000_create_user_profiles_table.sql`**
   - Creates user_profiles table with RLS policies
   - Auto-creates profiles on user signup

2. **`supabase/migrations/20240913000001_create_replies_table.sql`**
   - Creates replies table with proper indexes and RLS
   - Cascade delete when parent is removed

3. **`supabase/migrations/20240913000002_update_sidenotes_foreign_keys.sql`**
   - Ensures proper foreign key relationships
   - Updates highlights table structure

### Modified Components
1. **`components/highlights/SidenoteSidebar.tsx`**
   - Added user profile display
   - Added reply functionality
   - Shows reply count and expand/collapse
   - Integrated ReplyCard for nested replies

2. **`components/highlights/ModernTextHighlighter.tsx`**
   - Added current user tracking
   - Updated to pass user ID and refresh callback
   - Enhanced with user authentication

3. **`lib/supabase/sidenotes.ts`**
   - Added Reply interface and related types
   - Added reply CRUD functions
   - Enhanced sidenote queries to include user profiles
   - Tree building logic for nested replies

## API Functions

### Reply Management
- `createReply(sidenoteId, content, parentReplyId?)` - Create new reply
- `updateReply(replyId, content)` - Update existing reply
- `deleteReply(replyId)` - Delete reply and all children
- `getRepliesForSidenote(sidenoteId)` - Get all replies in tree structure

### Enhanced Sidenote Functions
- Updated `getSidenotesForPage()` to include user profiles and replies
- Enhanced `FullSidenote` type to include user profile and replies

## UI/UX Features

### Reply Interface
- **Reply Button**: Click to start replying to any note or reply
- **Nested Display**: Visual indentation with border lines for nested replies
- **Collapse/Expand**: Toggle visibility of reply threads
- **Reply Counter**: Shows total number of replies per note

### User Experience
- **Keyboard Shortcuts**: Cmd/Ctrl+Enter to save, Escape to cancel
- **Smart Timestamps**: Relative time that updates contextually
- **Owner Actions**: Edit/delete only available to content owners
- **Real-time Updates**: Sidebar refreshes automatically on changes

### Visual Design
- **Avatar Display**: User profile pictures with initials fallback
- **Threaded Layout**: Clear visual hierarchy for reply chains
- **Responsive Design**: Works on different screen sizes
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Security

### Row Level Security (RLS)
- Users can read all profiles (for display purposes)
- Users can only edit their own profiles
- Users can read replies on sidenotes they can see
- Users can only edit/delete their own replies
- Cascade deletion maintains data integrity

### Authentication
- All reply operations require authenticated user
- User ID automatically assigned from auth context
- Profile creation automated on signup

## Usage Instructions

### For Users
1. **View Replies**: Click the reply count button to expand/collapse replies
2. **Add Reply**: Click "Reply" button on any note or reply
3. **Edit Reply**: Click the options menu (⋮) on your own replies
4. **Delete Reply**: Use the options menu to delete (removes all nested replies)

### For Developers
1. **Database Setup**: Run the migration files in order
2. **Dependencies**: Ensure `@radix-ui/react-avatar` is installed
3. **Authentication**: Component requires Supabase auth to be configured
4. **Props**: Pass `currentUserId` and `onSidenotesUpdate` to SidenoteSidebar

## Migration Notes

### Required Supabase Setup
1. Apply migrations in numerical order
2. Ensure RLS is enabled on all tables
3. Configure auth policies for user_profiles
4. Test cascade deletion behavior

### Breaking Changes
- `SidenoteSidebar` component requires new props
- Database schema changes require migration
- New dependency on Radix UI Avatar

## Future Enhancements

### Potential Features
- **Mentions**: @username mentions in replies
- **Reactions**: Like/emoji reactions to replies
- **Notifications**: Email/in-app notifications for replies
- **Reply Templates**: Quick reply options
- **Rich Text**: Markdown support in replies
- **File Attachments**: Image/document attachments to replies

### Performance Optimizations
- **Pagination**: Load replies in batches for large threads
- **Caching**: Cache user profiles to reduce queries
- **Virtual Scrolling**: For very long reply chains
- **Lazy Loading**: Load nested replies on demand

## Troubleshooting

### Common Issues
1. **Avatar not showing**: Check if user has profile with avatar_url
2. **Replies not loading**: Verify RLS policies and user authentication
3. **Cascade delete issues**: Ensure foreign key constraints are properly set
4. **Performance**: Check indexes on replies table for large datasets

### Database Debugging
```sql
-- Check reply tree structure
SELECT r.*, u.full_name
FROM replies r
JOIN user_profiles u ON r.user_id = u.id
WHERE r.sidenote_id = 'your-sidenote-id'
ORDER BY r.created_at;

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'replies';
```

This implementation provides a robust, scalable reply system that enhances the collaborative aspect of the sidenotes feature while maintaining security and performance.