import { UserProfileEditor } from '@/components/UserProfileEditor';
import { Suspense } from 'react';

function WelcomeMessage({ searchParams }: { searchParams: { welcome?: string } }) {
  if (searchParams.welcome === 'true') {
    return (
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome! 🎉</h1>
        <p className="text-muted-foreground mt-2">
          Let's set up your profile to get started. Add your name and a profile picture.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
      <p className="text-muted-foreground mt-2">
        Manage your profile information and avatar
      </p>
    </div>
  );
}

export default function ProfilePage({
  searchParams,
}: {
  searchParams: { welcome?: string };
}) {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <Suspense fallback={<div>Loading...</div>}>
          <WelcomeMessage searchParams={searchParams} />
        </Suspense>

        <UserProfileEditor />
      </div>
    </div>
  );
}