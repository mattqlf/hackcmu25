'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Save, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getUserProfile, updateUserProfile, type UserProfile } from '@/lib/supabase/user-profiles';

interface UserProfileEditorProps {
  onClose?: () => void;
  onSave?: () => void;
}

export function UserProfileEditor({ onClose, onSave }: UserProfileEditorProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const userProfile = await getUserProfile();
      if (userProfile) {
        setProfile(userProfile);
        setFullName(userProfile.full_name || '');
        setAvatarUrl(userProfile.avatar_url || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Please select an image smaller than 2MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      setAvatarFile(file);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setAvatarUrl(previewUrl);
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    const supabase = createClient();

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('User not authenticated');
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      alert('Please enter your full name');
      return;
    }

    setIsSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;

      // Upload new avatar if file was selected
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(avatarFile);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        } else {
          alert('Failed to upload avatar. Please try again.');
          setIsSaving(false);
          return;
        }
      }

      // Update profile
      const success = await updateUserProfile({
        full_name: fullName.trim(),
        avatar_url: finalAvatarUrl || null
      });

      if (success) {
        // Also update the user metadata so the auth button shows the new name immediately
        const supabase = createClient();
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.auth.updateUser({
              data: {
                full_name: fullName.trim()
              }
            });
          }
        } catch (error) {
          console.log('Could not update user metadata:', error);
        }

        alert('Profile updated successfully!');

        // Trigger a page reload to refresh all profile data in the app
        if (typeof window !== 'undefined') {
          window.location.reload();
        }

        onSave?.();
        onClose?.();
      } else {
        alert('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="centered-container">
        <div className="body-text-muted">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="liquid-container max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="section-subheader mb-0">Edit Profile</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="glass-button-icon-sm text-slate-500 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-lg bg-primary/10 text-primary">
              {fullName ? getInitials(fullName) : '?'}
            </AvatarFallback>
          </Avatar>

          <div>
            <label
              htmlFor="avatar-upload"
              className="glass-button-sm cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Photo
            </label>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="body-text-light text-xs mt-2 text-center">
              Max 2MB. JPG, PNG, or GIF.
            </p>
          </div>
        </div>

        {/* Full Name Field */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="body-text font-medium">Full Name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            disabled={isSaving}
            className="glass-input"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !fullName.trim()}
            className="glass-button-md flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              disabled={isSaving}
              className="glass-button-md text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}