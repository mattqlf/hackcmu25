import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Header */}
      <PageHeader />

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-20 px-4 relative">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text">
            PaperSync
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto font-medium">
            Bringing collaboration to paper reading.
          </p>

          {/* YouTube Video Embed */}
          <div className="mb-8 flex justify-center">
            <div className="relative w-full max-w-4xl aspect-video rounded-lg overflow-hidden shadow-lg">
              <iframe
                src="https://www.youtube.com/embed/pnznDL9SZvI"
                title="YouTube video player"
                style={{ border: 0 }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              ></iframe>
            </div>
          </div>

          <div className="flex justify-center">
            <Button asChild size="lg" className="text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
              <Link href="/arxiv-search" className="flex items-center gap-2">
                Start Reading <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
