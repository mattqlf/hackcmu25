"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function AuthButtonClient() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          // Get display name from user metadata or email
          const fullName = user.user_metadata?.full_name;
          setDisplayName(fullName || user.email?.split('@')[0] || 'User');
        }
      } catch (error) {
        console.error("Error getting user:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const fullName = session.user.user_metadata?.full_name;
          setDisplayName(fullName || session.user.email?.split('@')[0] || 'User');
        } else {
          setDisplayName("");
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Show loading state only briefly
  if (isLoading) {
    return (
      <div className="flex gap-2">
        <div className="w-16 h-8 bg-muted/50 rounded"></div>
        <div className="w-16 h-8 bg-muted/50 rounded"></div>
      </div>
    );
  }

  // Show authenticated user UI
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          Hello, <span className="font-medium text-foreground">{displayName}</span>!
        </span>
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button
          onClick={handleSignOut}
          size="sm"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
        >
          Sign out
        </Button>
      </div>
    );
  }

  // Show unauthenticated user UI
  return (
    <div className="flex gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href="/auth/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant="default">
        <Link href="/auth/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}