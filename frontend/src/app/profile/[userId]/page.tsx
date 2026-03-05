"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, BookOpen, Heart, MessageCircle, ChevronLeft, LayoutDashboard } from 'lucide-react';

import { getUserProfile } from '../../actions/social';

export default function ProfilePage() {
    const { userId } = useParams();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            loadProfile(userId as string);
        }
    }, [userId]);

    const loadProfile = async (id: string) => {
        setLoading(true);
        const data = await getUserProfile(id);
        setProfile(data);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">
                <div className="w-8 h-8 rounded-lg bg-orange-600 animate-spin" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-[#0f0f12] flex flex-col items-center justify-center text-white">
                <h1 className="text-2xl font-bold mb-4">User not found</h1>
                <Link href="/community" className="text-orange-500 hover:underline">Back to Community</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f0f12] text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-[#0f0f12]/80 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-6 lg:px-12">
                <Link href="/community" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft size={20} />
                    <span>Community</span>
                </Link>
                <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <LayoutDashboard size={20} />
                </Link>
            </header>

            <main className="pt-24 pb-20 max-w-7xl mx-auto px-6 lg:px-12">

                {/* Profile Header */}
                <div className="flex flex-col md:flex-row items-center gap-8 mb-16 p-8 rounded-2xl bg-[#15151a] border border-white/5">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-red-600 p-1">
                        <div className="w-full h-full rounded-full bg-[#15151a] overflow-hidden flex items-center justify-center relative">
                            {profile.image ? (
                                <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl font-bold text-gray-500">{profile.name?.[0] || <User size={48} />}</span>
                            )}
                        </div>
                    </div>

                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-3xl font-bold text-white mb-2">{profile.name || "Anonymous Storyteller"}</h1>
                        <p className="text-gray-400 mb-6">Joined {new Date(profile.createdAt).toLocaleDateString()}</p>

                        <div className="flex items-center justify-center md:justify-start gap-8">
                            <div className="flex flex-col items-center md:items-start">
                                <span className="text-2xl font-bold text-white">{profile.stories?.length || 0}</span>
                                <span className="text-xs text-gray-500 uppercase tracking-widest">Published Stories</span>
                            </div>
                            <div className="flex flex-col items-center md:items-start">
                                <span className="text-2xl font-bold text-white">{profile.totalLikesReceived || 0}</span>
                                <span className="text-xs text-gray-500 uppercase tracking-widest">Likes Received</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stories Grid */}
                <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
                    <BookOpen size={24} className="text-orange-500" />
                    Published Stories
                </h2>

                {profile.stories.length === 0 ? (
                    <div className="text-center py-20 bg-[#15151a] rounded-2xl border border-white/5">
                        <p className="text-gray-500">This user hasn't published any stories yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {profile.stories.map((story: any) => (
                            <Link key={story.id} href={`/story/${story.id}`}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    whileHover={{ y: -5 }}
                                    className="group bg-[#15151a] rounded-2xl border border-white/5 overflow-hidden hover:border-orange-500/30 transition-all duration-300 h-full flex flex-col"
                                >
                                    <div className="aspect-video bg-gray-900 relative overflow-hidden">
                                        {story.images && story.images[0] ? (
                                            <img src={story.images[0].url} alt={story.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                                <BookOpen size={32} className="text-gray-600" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-white border border-white/10 uppercase tracking-wide">
                                            {story.era}
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col">
                                        <h3 className="text-xl font-bold text-gray-100 mb-2 group-hover:text-orange-400 transition-colors line-clamp-1">
                                            {story.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 line-clamp-3 mb-6 flex-1">
                                            {story.content.substring(0, 100)}...
                                        </p>

                                        <div className="flex items-center gap-4 text-gray-400 text-sm border-t border-white/5 pt-4">
                                            <div className="flex items-center gap-1.5">
                                                <Heart size={14} />
                                                <span>{story._count?.likes || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MessageCircle size={14} />
                                                <span>{story._count?.comments || 0}</span>
                                            </div>
                                            <span className="ml-auto text-xs text-gray-600">
                                                {new Date(story.publishedAt || story.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                )}

            </main>
        </div>
    );
}
