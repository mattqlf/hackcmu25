# Profile System Setup - All Required SQL Migrations

Run these SQL commands in your Supabase SQL editor **in order**:

## Step 5: Create Avatars Storage Bucket

```sql
-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## What's Been Completed

✅ **New York Timezone**: All timestamps now display in New York time
✅ **Profile Management**: Complete user profile editing interface
✅ **Avatar Upload**: Users can upload profile pictures (2MB limit)
✅ **Username Display**: Full names and avatars shown in comments/notes
✅ **Storage Security**: Proper RLS policies for avatar storage

## New Features Available

### 🎯 **Profile Management**
- **Profile Page**: Visit `/profile` to edit your profile
- **Avatar Upload**: Upload JPG, PNG, GIF, or WebP images (max 2MB)
- **Full Name**: Set your display name for comments/notes
- **Auto-Save**: Profile changes save automatically

### 🕐 **New York Timezone**
- **Smart Timestamps**:
  - "just now" for recent activity
  - "5m ago" / "2h ago" for today
  - "Mon 3:45 PM" for this week (NY time)
  - "Jan 15, 3:45 PM" for older items (NY time)

### 👤 **Enhanced Comments Display**
- **User Avatars**: Profile pictures shown on all notes/replies
- **Display Names**: Full names instead of generic "Anonymous"
- **Initials Fallback**: If no avatar, shows initials (e.g., "JD" for John Doe)
- **User Icon**: Default user icon if no name/avatar set

## Usage Instructions

### For New Users:
1. **Set Up Profile**: Visit `/profile` to add your name and photo
2. **Upload Avatar**: Click "Upload Photo" and select an image
3. **Save Changes**: Your profile updates automatically
4. **Start Commenting**: Your name/photo will appear on all new comments

### For Existing Users:
1. **Update Profile**: Visit `/profile` to add missing information
2. **Replace Avatar**: Upload a new photo to replace the current one
3. **Change Name**: Update your display name anytime

## Technical Details

### File Organization
- **Avatars**: Stored in `user_id/filename.ext` format
- **Auto-Cleanup**: Old avatars deleted when new ones uploaded
- **Security**: Users can only access their own avatar folders

### Timezone Handling
- **Library**: Uses `date-fns-tz` for accurate timezone conversion
- **Target Zone**: `America/New_York` (handles EST/EDT automatically)
- **Fallback**: Graceful degradation if timezone conversion fails

This completes the profile and timezone enhancement! Users can now have personalized profiles with avatars and see all times in New York timezone. 🎉