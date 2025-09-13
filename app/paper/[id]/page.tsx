"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { ModernTextHighlighter } from "@/components/highlights/ModernTextHighlighter";

export default function PaperPage() {
  const params = useParams();
  const id = params.id as string;
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchPaperContent = async () => {
      if (!id) return;

      setLoading(true);
      setError("");

      try {
        console.log(`Fetching paper: ${id}`);
        const response = await fetch(`/api/paper/${encodeURIComponent(id)}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch paper: ${response.status}`);
        }

        const data = await response.json();
        setHtmlContent(data.htmlContent);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load paper");
      } finally {
        setLoading(false);
      }
    };

    fetchPaperContent();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <nav className="w-full border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/arxiv-search">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Search
                  </Link>
                </Button>
                <span className="text-lg font-semibold">Paper: {id}</span>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading paper content...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background">
        <nav className="w-full border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/arxiv-search">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Search
                  </Link>
                </Button>
                <span className="text-lg font-semibold">Paper: {id}</span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://arxiv.org/abs/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  View on ArXiv
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </nav>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Paper</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">{error}</p>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/arxiv-search">Back to Search</Link>
                </Button>
                <Button asChild>
                  <a
                    href={`https://arxiv.org/abs/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Original on ArXiv
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <nav className="w-full border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/arxiv-search">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Search
                </Link>
              </Button>
              <span className="text-lg font-semibold">Paper: {id}</span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://arxiv.org/abs/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                View on ArXiv
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Paper Content with Highlighting */}
      <ModernTextHighlighter
        pageUrl={`/paper/${id}`}
        docId={`paper-${id}`}
        className="min-h-screen"
      >
        <div className="paper-content">
          <div
            dangerouslySetInnerHTML={{ __html: htmlContent }}
            className="arxiv-paper-content"
          />
        </div>
      </ModernTextHighlighter>
    </main>
  );
}