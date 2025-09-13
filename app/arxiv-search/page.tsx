"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Search, Loader2, Copy, ExternalLink, ChevronDown, ChevronUp, Heart, Eye, HelpCircle } from "lucide-react";
import Link from "next/link";
import {
  addToFavorites,
  removeFromFavorites,
  addToWatchlist,
  removeFromWatchlist,
  isFavorited,
  isWatched,
  addToSearchHistory
} from "@/lib/supabase/user-papers";

interface ArxivPaper {
  id: string;
  title: string;
  abstract: string;
}

interface SearchResults {
  query: string;
  searchQuery: string;
  totalResults: number;
  currentResults: number;
  start: number;
  maxResults: number;
  hasMore: boolean;
  papers: ArxivPaper[];
}

export default function ArxivSearchPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentStart, setCurrentStart] = useState(0);
  const [resultsPerPage] = useState(50); // How many results to fetch per page
  const [expandedAbstracts, setExpandedAbstracts] = useState<Set<string>>(new Set());
  const [favoritePapers, setFavoritePapers] = useState<Set<string>>(new Set());
  const [watchlistPapers, setWatchlistPapers] = useState<Set<string>>(new Set());
  const [showSearchHelp, setShowSearchHelp] = useState(false);

  // Load query from URL params on mount
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      setQuery(urlQuery);
      performSearch(urlQuery, 0);
    }
  }, [searchParams]);

  const loadPaperStatuses = async (papers: ArxivPaper[]) => {
    const favoriteChecks = await Promise.all(
      papers.map(paper => isFavorited(paper.id))
    );
    const watchlistChecks = await Promise.all(
      papers.map(paper => isWatched(paper.id))
    );

    const newFavorites = new Set<string>();
    const newWatchlist = new Set<string>();

    papers.forEach((paper, index) => {
      if (favoriteChecks[index]) {
        newFavorites.add(paper.id);
      }
      if (watchlistChecks[index]) {
        newWatchlist.add(paper.id);
      }
    });

    setFavoritePapers(prev => new Set([...prev, ...newFavorites]));
    setWatchlistPapers(prev => new Set([...prev, ...newWatchlist]));
  };

  const performSearch = async (searchQuery: string, start: number = 0) => {
    setLoading(true);
    setError("");

    try {
      const url = `/api/arxiv-search?query=${encodeURIComponent(searchQuery)}&start=${start}&max_results=${resultsPerPage}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: SearchResults = await response.json();

      if (start === 0) {
        // New search - replace results and save to search history
        await addToSearchHistory(searchQuery, data.totalResults);
        setResults(data);
        setCurrentStart(0);
      } else {
        // Pagination - append results
        setResults(prev => prev ? {
          ...data,
          papers: [...prev.papers, ...data.papers]
        } : data);
        setCurrentStart(start);
      }

      // Load favorite/watchlist status for all papers
      await loadPaperStatuses(data.papers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    await performSearch(query, 0);
  };

  const handleLoadMore = async () => {
    if (!results || !results.hasMore) return;
    const nextStart = currentStart + resultsPerPage;
    await performSearch(query, nextStart);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyAllIds = () => {
    if (results) {
      const ids = results.papers.map(paper => paper.id);
      navigator.clipboard.writeText(ids.join('\n'));
    }
  };

  const toggleAbstract = (paperId: string) => {
    setExpandedAbstracts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paperId)) {
        newSet.delete(paperId);
      } else {
        newSet.add(paperId);
      }
      return newSet;
    });
  };

  const toggleFavorite = async (paper: ArxivPaper) => {
    const isFav = favoritePapers.has(paper.id);

    if (isFav) {
      const success = await removeFromFavorites(paper.id);
      if (success) {
        setFavoritePapers(prev => {
          const newSet = new Set(prev);
          newSet.delete(paper.id);
          return newSet;
        });
      }
    } else {
      const success = await addToFavorites({
        id: paper.id,
        title: paper.title,
        abstract: paper.abstract
      });
      if (success) {
        setFavoritePapers(prev => new Set([...prev, paper.id]));
      }
    }
  };

  const toggleWatchlist = async (paper: ArxivPaper) => {
    const isWatching = watchlistPapers.has(paper.id);

    if (isWatching) {
      const success = await removeFromWatchlist(paper.id);
      if (success) {
        setWatchlistPapers(prev => {
          const newSet = new Set(prev);
          newSet.delete(paper.id);
          return newSet;
        });
      }
    } else {
      const success = await addToWatchlist({
        id: paper.id,
        title: paper.title,
        abstract: paper.abstract
      });
      if (success) {
        setWatchlistPapers(prev => new Set([...prev, paper.id]));
      }
    }
  };

  return (
    <main className="min-h-screen relative">
      {/* Header */}
      <PageHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="modern-heading text-5xl md:text-6xl font-bold text-slate-900 mb-6 animate-float">
            Discover Research
          </h1>
          <p className="modern-text text-xl text-slate-700 mb-8 max-w-2xl mx-auto">
            Search millions of research papers. Powered by ArXiv API. 
          </p>

          <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-6">
            <div className="relative glass-card-strong p-3 rounded-2xl">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Search for papers, authors, or topics..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-12 pr-32 h-12 bg-transparent text-slate-900 placeholder:text-slate-500 border-none outline-none text-lg modern-text"
                disabled={loading}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="glass-button h-10 px-6 rounded-xl text-sm font-medium"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Search Help Dropdown */}
          <div className="max-w-3xl mx-auto mt-6 relative">
            <button
              onClick={() => setShowSearchHelp(!showSearchHelp)}
              className="glass-button-sm mx-auto"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              How to Search
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showSearchHelp ? 'rotate-180' : ''}`} />
            </button>

            {showSearchHelp && (
              <div className="liquid-container mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {/* Quick Examples */}
                  <div>
                    <h5 className="body-text font-medium mb-2">Quick Examples</h5>
                    <div className="space-y-1">
                      {["quantum computing", "machine learning", "neural networks"].map((term) => (
                        <button
                          key={term}
                          onClick={() => {
                            setQuery(term);
                            setShowSearchHelp(false);
                          }}
                          className="glass-card px-2 py-1 text-slate-700 hover:text-slate-900 transition-colors rounded text-xs block w-full text-left"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Syntax */}
                  <div>
                    <h5 className="body-text font-medium mb-2">Advanced Syntax</h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <code className="glass-card px-1 py-0.5 text-xs text-slate-800 font-mono">author:Smith</code>
                        <span className="body-text-muted">Author search</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="glass-card px-1 py-0.5 text-xs text-slate-800 font-mono">ti:quantum</code>
                        <span className="body-text-muted">Title only</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="glass-card px-1 py-0.5 text-xs text-slate-800 font-mono">cat:cs.AI</code>
                        <span className="body-text-muted">By category</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="glass-card px-1 py-0.5 text-xs text-slate-800 font-mono">"exact"</code>
                        <span className="body-text-muted">Exact phrase</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Popular Categories */}
                <div className="mt-4 pt-4 border-t border-slate-300/20">
                  <h5 className="body-text font-medium mb-2 text-center">Popular Categories</h5>
                  <div className="flex flex-wrap justify-center gap-1">
                    {["cs.AI", "cs.LG", "cs.CV", "cs.CL", "math.CO"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setQuery(`cat:${cat}`);
                          setShowSearchHelp(false);
                        }}
                        className="glass-card px-2 py-1 text-slate-700 hover:text-slate-900 transition-colors rounded text-xs"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="liquid-container mb-6 border border-red-400/30">
            <h3 className="modern-heading text-red-600 mb-2">Error</h3>
            <p className="modern-text text-slate-700 text-sm">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="space-y-6">
            {/* Search Summary */}
            <div className="liquid-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="section-header">Search Results</h2>
                <p className="body-text">
                  Found <span className="font-bold text-slate-900">{results.totalResults.toLocaleString()}</span> papers
                  {results.query && (
                    <span> matching <span className="font-medium">"{results.query}"</span></span>
                  )}
                </p>
                <p className="body-text-muted text-sm mt-1">
                  Showing {results.papers.length} of {results.totalResults.toLocaleString()} results
                </p>
              </div>
              <button
                onClick={copyAllIds}
                className="glass-button-md"
              >
                <Copy className="h-4 w-4" />
                Copy IDs ({results.papers.length})
              </button>
            </div>

            {/* ArXiv Papers List */}
            <div className="space-y-4">
              {results.papers.length > 0 ? (
                results.papers.map((paper, index) => {
                  const isExpanded = expandedAbstracts.has(paper.id);
                  return (
                    <div
                      key={paper.id}
                      className="liquid-container hover:bg-white/20 transition-all duration-200 border-l-4 border-l-blue-400/30 hover:border-l-blue-400/60"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="flex items-center justify-center w-8 h-8 bg-slate-200 text-slate-700 text-sm font-medium rounded-full flex-shrink-0">
                              {index + 1}
                            </span>
                            <code className="modern-text font-mono text-sm glass-card px-3 py-1 text-slate-700 hover:text-slate-900 cursor-pointer transition-colors"
                              onClick={() => copyToClipboard(paper.id)}>
                              {paper.id}
                            </code>
                          </div>

                          <Link href={`/paper/${paper.id}`} className="group">
                            <h3 className="modern-heading text-lg font-semibold leading-6 text-slate-900 group-hover:text-slate-700 transition-colors mb-3 line-clamp-2">
                              {paper.title}
                            </h3>
                          </Link>

                          <div className="flex items-center gap-4 mb-3">
                            <button
                              onClick={() => toggleAbstract(paper.id)}
                              className="glass-button text-sm px-3 py-1"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  Hide Abstract
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  Show Abstract
                                </>
                              )}
                            </button>

                            <Link href={`/paper/${paper.id}`}>
                              <button className="glass-button text-sm px-3 py-1">
                                Read Paper
                              </button>
                            </Link>
                          </div>

                          {/* Expandable Abstract */}
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-slate-300/20">
                              <p className="modern-text text-slate-600 leading-relaxed">
                                {paper.abstract}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button
                            onClick={() => toggleFavorite(paper)}
                            className={`glass-button-icon ${favoritePapers.has(paper.id) ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}
                            title={favoritePapers.has(paper.id) ? "Remove from favorites" : "Add to favorites"}
                          >
                            <Heart className={`h-4 w-4 ${favoritePapers.has(paper.id) ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            onClick={() => toggleWatchlist(paper)}
                            className={`glass-button-icon ${watchlistPapers.has(paper.id) ? 'text-blue-500' : 'text-slate-500 hover:text-blue-500'}`}
                            title={watchlistPapers.has(paper.id) ? "Remove from watchlist" : "Add to watchlist"}
                          >
                            <Eye className={`h-4 w-4 ${watchlistPapers.has(paper.id) ? 'fill-current' : ''}`} />
                          </button>
                          <a
                            href={`https://arxiv.org/abs/${paper.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="glass-button-icon text-slate-500 hover:text-slate-700"
                            title="View on ArXiv"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="centered-container py-16">
                  <div className="icon-container-lg glass-card rounded-full mb-4">
                    <Search className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="section-subheader mb-2">No papers found</h3>
                  <p className="body-text max-w-md">
                    Try different keywords or check your spelling
                  </p>
                </div>
              )}

              {/* Load More Button */}
              {results.papers.length > 0 && results.hasMore && (
                <div className="flex justify-center pt-6">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="glass-button px-8 py-3"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading more papers...
                      </>
                    ) : (
                      <>
                        Load More Papers
                        <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                          {(results.totalResults - results.papers.length).toLocaleString()} remaining
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* End of Results Message */}
              {results.papers.length > 0 && !results.hasMore && (
                <div className="liquid-container text-center py-6">
                  <div className="w-12 h-12 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-green-300" />
                  </div>
                  <p className="modern-text text-white/80 text-sm">
                    ✓ All {results.totalResults.toLocaleString()} papers loaded
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !results && (
          <div className="centered-container py-16">
            <div className="w-16 h-16 glass-card rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
            </div>
            <h3 className="modern-heading text-lg text-slate-900 mb-2">Searching ArXiv...</h3>
            <p className="modern-text text-slate-700">
              Finding the best papers for your query
            </p>
          </div>
        )}

      </div>
    </main>
  );
}