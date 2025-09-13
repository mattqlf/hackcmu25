"use client";

import Link from "next/link";
import { AuthButtonClient } from "@/components/auth-button-client";
import { hasEnvVars } from "@/lib/utils";
import { EnvVarWarning } from "@/components/env-var-warning";

interface PageHeaderProps {
  showAuthButton?: boolean;
}

export function PageHeader({
  showAuthButton = true
}: PageHeaderProps) {
  return (
    <nav className="w-full border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-foreground hover:text-primary transition-colors">
              PaperSync
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {showAuthButton && (
              <>
                {!hasEnvVars ? <EnvVarWarning /> : <AuthButtonClient />}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}