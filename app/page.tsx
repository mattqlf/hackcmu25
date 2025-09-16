"use client";

import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const handleDownloadExtension = () => {
    // Simple download of the zip file
    const link = document.createElement('a');
    link.href = '/api/download-extension';
    link.download = 'arxivSync-extension.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Header */}
      <PageHeader />

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center py-20 px-4 relative">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text">
            arXivSync
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto font-medium">
            Bringing collaboration to paper reading.
          </p>

          <div className="flex justify-center gap-4 mb-8">
            <Button onClick={handleDownloadExtension} size="lg" className="text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
              <Download className="h-5 w-5 mr-2" />
              Download Chrome Extension
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300">
              <Link href="/dashboard" className="flex items-center gap-2">
                Dashboard <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Installation Instructions */}
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">How to install the Chrome Extension:</h3>
            <ol className="text-left text-sm text-slate-600 space-y-2 bg-white/20 backdrop-blur-sm rounded-lg p-6 border border-white/30">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span>Download the extension zip file by clicking the button above</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span>Extract the zip file to a folder on your computer</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span>Open Chrome and go to <code className="bg-slate-200 px-2 py-1 rounded text-xs">chrome://extensions/</code></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                <span>Enable "Developer mode" toggle in the top right corner</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
                <span>Click "Load unpacked" and select the extracted folder</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">6</span>
                <span>Visit any ArXiv paper and enjoy seamless reading with arXivSync!</span>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
