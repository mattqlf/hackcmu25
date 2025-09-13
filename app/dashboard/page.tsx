"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { UserProfileEditor } from "@/components/UserProfileEditor";
import { User, Search, Heart, Eye, ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  getUserFavorites,
  getUserWatchlist,
  getUserSearchHistory,
  removeFromFavorites,
  removeFromWatchlist,
  clearSearchHistory,
  type FavoritePaper,
  type WatchlistPaper,
  type SearchHistoryEntry
} from "@/lib/supabase/user-papers";

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [favorites, setFavorites] = useState<FavoritePaper[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistPaper[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);

  const sections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "search-history", label: "Search History", icon: Search },
    { id: "favorites", label: "Favorites", icon: Heart },
    { id: "watchlist", label: "Watchlist", icon: Eye },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [favData, watchData, historyData] = await Promise.all([
        getUserFavorites(),
        getUserWatchlist(),
        getUserSearchHistory()
      ]);
      setFavorites(favData);
      setWatchlist(watchData);
      setSearchHistory(historyData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleRemoveFavorite = async (paperId: string) => {
    const success = await removeFromFavorites(paperId);
    if (success) {
      setFavorites(prev => prev.filter(p => p.paper_id !== paperId));
    }
  };

  const handleRemoveFromWatchlist = async (paperId: string) => {
    const success = await removeFromWatchlist(paperId);
    if (success) {
      setWatchlist(prev => prev.filter(p => p.paper_id !== paperId));
    }
  };

  const handleClearSearchHistory = async () => {
    if (confirm('Are you sure you want to clear your search history?')) {
      const success = await clearSearchHistory();
      if (success) {
        setSearchHistory([]);
      }
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <PageHeader />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/" className="glass-button px-4 py-2 text-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Home
          </Link>
          <h1 className="modern-heading text-3xl font-bold text-slate-900">Dashboard</h1>
          <div className="ml-auto">
            <Link href="/arxiv-search" className="glass-button px-4 py-2 text-sm">
              Search Papers
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="liquid-container">
              <h2 className="modern-heading text-lg text-slate-900 mb-4">Navigation</h2>
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors rounded-lg ${
                        activeSection === section.id
                          ? "glass-card-strong text-slate-900 border-l-2 border-slate-600"
                          : "text-slate-700 hover:text-slate-900 hover:bg-white/20"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="modern-text">{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {activeSection === "profile" && (
              <div className="liquid-container">
                <h2 className="section-subheader">Profile Settings</h2>
                <UserProfileEditor />
              </div>
            )}

            {activeSection === "search-history" && (
              <div className="liquid-container">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="section-subheader">Search History</h2>
                  {searchHistory.length > 0 && (
                    <button onClick={handleClearSearchHistory} className="glass-button text-sm px-3 py-2">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear History
                    </button>
                  )}
                </div>

                {searchHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="icon-container-lg glass-card rounded-full mx-auto mb-4">
                      <Search className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="body-text">Your recent searches will appear here</p>
                    <p className="body-text-muted text-sm mt-2">Start searching to build your history</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchHistory.map((entry) => (
                      <div key={entry.id} className="glass-card p-4 hover:bg-white/10 transition-colors">
                        <div className="space-y-3">
                          <div>
                            <p className="body-text font-medium">{entry.search_query}</p>
                            <p className="body-text-muted text-sm">
                              {entry.results_count} results • {new Date(entry.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex justify-end">
                            <Link href={`/arxiv-search?q=${encodeURIComponent(entry.search_query)}`} className="glass-button-sm">
                              Search Again
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === "favorites" && (
              <div className="liquid-container">
                <h2 className="section-subheader">Favorite Papers ({favorites.length})</h2>

                {favorites.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="icon-container-lg glass-card rounded-full mx-auto mb-4">
                      <Heart className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="body-text">Papers you've favorited will appear here</p>
                    <p className="body-text-muted text-sm mt-2">Add papers to favorites from search results</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {favorites.map((paper) => (
                      <div key={paper.id} className="glass-card p-4 hover:bg-white/10 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Link href={`/paper/${paper.paper_id}`}>
                              <h3 className="modern-heading font-medium text-sm leading-tight text-slate-900 hover:text-slate-700 hover:underline cursor-pointer mb-2">
                                {paper.paper_title}
                              </h3>
                            </Link>
                            <p className="modern-text text-xs text-slate-600 line-clamp-2 mb-2">
                              {paper.paper_abstract}
                            </p>
                            <p className="modern-text text-xs text-slate-500">
                              Added {new Date(paper.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1 ml-3">
                            <button
                              onClick={() => handleRemoveFavorite(paper.paper_id)}
                              className="glass-button-icon-sm text-red-500 hover:text-red-600"
                              title="Remove from favorites"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                            <a
                              href={`https://arxiv.org/abs/${paper.paper_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="glass-button-icon-sm text-slate-500 hover:text-slate-700 flex items-center justify-center"
                              title="View on ArXiv"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeSection === "watchlist" && (
              <div className="liquid-container">
                <h2 className="section-subheader">Watchlist ({watchlist.length})</h2>

                {watchlist.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="icon-container-lg glass-card rounded-full mx-auto mb-4">
                      <Eye className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="body-text">Papers you're watching will appear here</p>
                    <p className="body-text-muted text-sm mt-2">Add papers to watchlist from search results</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {watchlist.map((paper) => (
                      <div key={paper.id} className="glass-card p-4 hover:bg-white/10 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <Link href={`/paper/${paper.paper_id}`}>
                              <h3 className="modern-heading font-medium text-sm leading-tight text-slate-900 hover:text-slate-700 hover:underline cursor-pointer mb-2">
                                {paper.paper_title}
                              </h3>
                            </Link>
                            <p className="modern-text text-xs text-slate-600 line-clamp-2 mb-2">
                              {paper.paper_abstract}
                            </p>
                            <p className="modern-text text-xs text-slate-500">
                              Watching since {new Date(paper.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1 ml-3">
                            <button
                              onClick={() => handleRemoveFromWatchlist(paper.paper_id)}
                              className="glass-button-icon-sm text-blue-500 hover:text-blue-600"
                              title="Remove from watchlist"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                            <a
                              href={`https://arxiv.org/abs/${paper.paper_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="glass-button-icon-sm text-slate-500 hover:text-slate-700 flex items-center justify-center"
                              title="View on ArXiv"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}