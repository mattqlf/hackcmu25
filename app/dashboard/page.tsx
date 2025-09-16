"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Heart, History, ArrowLeft, ExternalLink, Trash2, Search, User } from "lucide-react";
import Link from "next/link";
import {
  getUserFavorites,
  getUserViewHistory,
  removeFromFavorites,
  clearViewHistory,
  type FavoritePaper,
  type ViewHistoryEntry
} from "@/lib/supabase/user-papers";

export default function DashboardPage() {
  const [favorites, setFavorites] = useState<FavoritePaper[]>([]);
  const [allFavorites, setAllFavorites] = useState<FavoritePaper[]>([]);
  const [viewHistory, setViewHistory] = useState<ViewHistoryEntry[]>([]);
  const [allViewHistory, setAllViewHistory] = useState<ViewHistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [favData, viewData] = await Promise.all([
        getUserFavorites(),
        getUserViewHistory() // Get all view history
      ]);
      setAllFavorites(favData);
      setFavorites(favData);
      setAllViewHistory(viewData);
      setViewHistory(viewData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  // Filter favorites based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFavorites(allFavorites);
    } else {
      const filtered = allFavorites.filter(paper =>
        paper.paper_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        paper.paper_abstract.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFavorites(filtered);
    }
  }, [searchQuery, allFavorites]);

  // Filter view history based on search query
  useEffect(() => {
    if (historySearchQuery.trim() === "") {
      setViewHistory(allViewHistory);
    } else {
      const filtered = allViewHistory.filter(entry =>
        entry.paper_title.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
        entry.paper_abstract.toLowerCase().includes(historySearchQuery.toLowerCase())
      );
      setViewHistory(filtered);
    }
  }, [historySearchQuery, allViewHistory]);

  const handleRemoveFavorite = async (paperId: string) => {
    const success = await removeFromFavorites(paperId);
    if (success) {
      setAllFavorites(prev => prev.filter(p => p.paper_id !== paperId));
      setFavorites(prev => prev.filter(p => p.paper_id !== paperId));
    }
  };

  const handleClearViewHistory = async () => {
    if (confirm('Are you sure you want to clear your view history?')) {
      const success = await clearViewHistory();
      if (success) {
        setViewHistory([]);
        setAllViewHistory([]);
        setHistorySearchQuery("");
      }
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Header */}
      <PageHeader />

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="glass-button px-4 py-2 text-sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Home
              </Link>
              <h1 className="modern-heading text-3xl font-bold text-slate-900">Dashboard</h1>
            </div>
            <Link href="/profile/edit" className="glass-button px-4 py-2 text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Edit Profile
            </Link>
          </div>
          <p className="modern-text text-slate-700">
            Your reading activity and liked papers.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-300px)]">
          {/* Liked Papers Column */}
          <div className="liquid-container flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Heart className="h-6 w-6 text-red-500" />
                <h2 className="section-subheader">Liked Papers ({favorites.length})</h2>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search liked papers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 glass-card text-sm text-slate-900 placeholder-slate-500 border-0 focus:ring-2 focus:ring-slate-400/20 rounded-lg"
              />
            </div>

            {/* Scrollable Papers List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {favorites.length === 0 ? (
                <div className="text-center py-12">
                  <div className="icon-container-lg glass-card rounded-full mx-auto mb-4">
                    <Heart className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="modern-heading text-lg text-slate-900 mb-2">
                    {searchQuery ? "No papers match your search" : "No liked papers yet"}
                  </h3>
                  <p className="body-text text-slate-600 mb-4">
                    {searchQuery ? "Try a different search term" : "Start exploring papers and like the ones you find interesting"}
                  </p>
                  {!searchQuery && (
                    <Link href="/" className="glass-button px-4 py-2">
                      Get Chrome Extension
                    </Link>
                  )}
                </div>
              ) : (
                favorites.map((paper) => (
                  <div key={paper.id} className="glass-card p-4 hover:bg-white/10 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link href={`/paper/${paper.paper_id}`}>
                          <h3 className="modern-heading font-semibold text-sm leading-tight text-slate-900 hover:text-slate-700 hover:underline cursor-pointer mb-2">
                            {paper.paper_title}
                          </h3>
                        </Link>
                        <p className="modern-text text-xs text-slate-600 line-clamp-2 mb-2">
                          {paper.paper_abstract}
                        </p>
                        <p className="modern-text text-xs text-slate-500">
                          Liked {new Date(paper.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-3">
                        <button
                          onClick={() => handleRemoveFavorite(paper.paper_id)}
                          className="glass-button-icon text-red-500 hover:text-red-600 p-1"
                          title="Remove from favorites"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                        <a
                          href={`https://arxiv.org/abs/${paper.paper_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="glass-button-icon text-slate-500 hover:text-slate-700 p-1"
                          title="View on ArXiv"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recently Viewed Column */}
          <div className="liquid-container flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <History className="h-6 w-6 text-blue-500" />
                <h2 className="section-subheader">Recently Viewed Papers</h2>
              </div>
              {allViewHistory.length > 0 && (
                <button onClick={handleClearViewHistory} className="glass-button text-sm px-3 py-2">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </button>
              )}
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search recently viewed papers..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 glass-card text-sm text-slate-900 placeholder-slate-500 border-0 focus:ring-2 focus:ring-slate-400/20 rounded-lg"
              />
            </div>

            {/* Scrollable History List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {viewHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="icon-container-lg glass-card rounded-full mx-auto mb-4">
                    <History className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="modern-heading text-lg text-slate-900 mb-2">
                    {historySearchQuery ? "No papers match your search" : "No viewing history yet"}
                  </h3>
                  <p className="body-text text-slate-600 mb-4">
                    {historySearchQuery ? "Try a different search term" : "Papers you view will appear here for easy access"}
                  </p>
                  {!historySearchQuery && (
                    <Link href="/" className="glass-button px-4 py-2">
                      Get Chrome Extension
                    </Link>
                  )}
                </div>
              ) : (
                viewHistory.map((entry) => (
                  <div key={entry.id} className="glass-card p-4 hover:bg-white/10 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link href={`/paper/${entry.paper_id}`}>
                          <h3 className="modern-heading font-semibold text-sm leading-tight text-slate-900 hover:text-slate-700 hover:underline cursor-pointer mb-2">
                            {entry.paper_title}
                          </h3>
                        </Link>
                        <p className="modern-text text-xs text-slate-600 line-clamp-2 mb-2">
                          {entry.paper_abstract}
                        </p>
                        <p className="modern-text text-xs text-slate-500">
                          {new Date(entry.viewed_at).toLocaleDateString()} at {new Date(entry.viewed_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-3">
                        <a
                          href={`https://arxiv.org/abs/${entry.paper_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="glass-button-icon text-slate-500 hover:text-slate-700 p-1"
                          title="View on ArXiv"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}