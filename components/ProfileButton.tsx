'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { getUserProfile, type UserProfile } from '@/lib/supabase/user-profiles';
import Link from 'next/link';

export function ProfileButton() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const userProfile = await getUserProfile();
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
      </Button>
    );
  }

  return (
    <Link href="/profile">
      <Button variant="ghost" size="sm" className="flex items-center gap-2 h-auto p-2">
        <Avatar className="w-6 h-6">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {profile?.full_name ? getInitials(profile.full_name) : <User className="w-3 h-3" />}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm hidden sm:inline">
          {profile?.full_name || 'Profile'}
        </span>
      </Button>
    </Link>
  );
}