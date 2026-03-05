"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPublicFeed } from '../actions/social';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, BookOpen, Clock, ChevronLeft, ChevronRight, LayoutDashboard, Search } from 'lucide-react';
import ModernLoader from '@/components/ModernLoader';

export default function CommunityPage() {
    const [stories, setStories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");

    useEffect(() => {
        loadStories();
    }, [page, sortBy]);

    const loadStories = async () => {
        setLoading(true);
        try {
            const res = await getPublicFeed(page, 12, sortBy);
            setStories(res.stories || []);
            setTotalPages(res.pages || 1);
        } catch (error) {
            console.error("Failed to load stories", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0f12] text-white font-sans">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-[#0f0f12]/80 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-6 lg:px-12">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 via-red-600 to-purple-700 flex items-center justify-center shadow-lg">
                        <BookOpen size={16} className="text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">StoryNest Community</span>
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors flex items-center gap-2">
                        <LayoutDashboard size={16} />
                        Dashboard
                    </Link>
                </div>
            </header>

            <main className="pt-24 pb-20 px-6 lg:px-12 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-2">
                            Explore Stories
                        </h1>
                        <p className="text-gray-400 text-lg">Discover worlds created by our community.</p>
                    </div>

                    <div className="flex items-center bg-[#15151a] p-1 rounded-lg border border-white/10 self-start">
                        <button
                            onClick={() => { setSortBy('recent'); setPage(1); }}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${sortBy === 'recent' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Newest
                        </button>
                        <button
                            onClick={() => { setSortBy('popular'); setPage(1); }}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${sortBy === 'popular' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Popular
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-80 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                        ))}
                    </div>
                ) : (
                    <>
                        {stories.length === 0 ? (
                            <div className="text-center py-20">
                                <p className="text-gray-500 text-xl">No stories found yet. Be the first to publish!</p>
                                <Link href="/dashboard" className="inline-block mt-4 px-6 py-3 bg-orange-600 rounded-lg text-white hover:bg-orange-500 transition-colors">
                                    Create a Story
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {stories.map((story) => (
                                    <Link key={story.id} href={`/story/${story.id}`}>
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ y: -5 }}
                                            className="group bg-[#15151a] rounded-2xl border border-white/5 overflow-hidden hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-900/10 transition-all duration-300 flex flex-col h-full"
                                        >
                                            <div className="aspect-video bg-gray-900 relative overflow-hidden">
                                                {story.images && story.images[0] ? (
                                                    <img src={story.images[0].url} alt={story.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-gray-600">
                                                        <BookOpen size={48} opacity={0.2} />
                                                    </div>
                                                )}
                                                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-white border border-white/10 uppercase tracking-wide">
                                                    {story.era}
                                                </div>
                                            </div>

                                            <div className="p-6 flex-1 flex flex-col">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden">
                                                        {story.user?.image ? <img src={story.user.image} className="w-full h-full object-cover" /> : (story.user?.name?.[0] || 'A')}
                                                    </div>
                                                    <span className="text-xs text-gray-400 font-medium">
                                                        {story.user?.name || "Unknown Author"}
                                                    </span>
                                                    <span className="text-xs text-gray-600">•</span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(story.publishedAt || story.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <h3 className="text-xl font-bold text-gray-100 mb-2 group-hover:text-orange-400 transition-colors line-clamp-1">
                                                    {story.title}
                                                </h3>
                                                <p className="text-sm text-gray-500 line-clamp-3 mb-6 flex-1">
                                                    {story.content.replace(/(\*\*|__|#)/g, '').substring(0, 150)}...
                                                </p>

                                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                    <div className="flex items-center gap-4 text-gray-400 text-sm">
                                                        <div className="flex items-center gap-1.5 group-hover:text-pink-500 transition-colors">
                                                            <Heart size={16} />
                                                            <span>{story._count?.likes || 0}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 group-hover:text-blue-500 transition-colors">
                                                            <MessageCircle size={16} />
                                                            <span>{story._count?.comments || 0}</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-orange-500 font-medium group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                                        Read Story <ChevronRight size={14} />
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-16 flex justify-center items-center gap-4">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <span className="text-gray-400 font-mono text-sm">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
