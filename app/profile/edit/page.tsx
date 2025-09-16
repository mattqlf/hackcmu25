"use client";

import { PageHeader } from "@/components/page-header";
import { UserProfileEditor } from "@/components/UserProfileEditor";
import { User, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProfileEditPage() {
  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <PageHeader />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard" className="glass-button px-4 py-2 text-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
            <h1 className="modern-heading text-3xl font-bold text-slate-900">Edit Profile</h1>
          </div>
          <p className="modern-text text-slate-700">
            Update your profile information and preferences.
          </p>
        </div>

        {/* Profile Editor */}
        <section className="liquid-container">
          <div className="flex items-center gap-3 mb-6">
            <User className="h-6 w-6 text-green-500" />
            <h2 className="section-subheader">Profile Information</h2>
          </div>
          <UserProfileEditor />
        </section>
      </div>
    </div>
  );
}