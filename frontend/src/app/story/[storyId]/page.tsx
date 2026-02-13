"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import {
    Heart, MessageCircle, Share2, Play, Pause, ChevronLeft,
    Send, User as UserIcon, Calendar, Clock, BookOpen
} from 'lucide-react';

import { getStoryById } from '../../actions/history';
import { toggleLikeStory, addComment, getComments, incrementViewCount, forkStory } from '../../actions/social';
import { generateAndSaveAudio } from '../../actions/audio';

export default function StoryPage() {
    const { storyId } = useParams();
    const { user, isLoaded } = useUser();
    const router = useRouter();

    const [story, setStory] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState<any[]>([]);
    const [commentInput, setCommentInput] = useState("");
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0); // Optimistic count

    // Audio State
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (storyId) {
            loadStory(storyId as string);
            loadComments(storyId as string);
            incrementViewCount(storyId as string);
        }
    }, [storyId]);

    const loadStory = async (id: string) => {
        setLoading(true);
        const data = await getStoryById(id);
        if (data) {
            setStory(data);
            // Check if user liked it - simplified check since we don't have isLiked in getStoryById yet without user context
            // In a real app we'd fetch this status specifically
            // For now defaults to false until interaction
            setLikeCount(data._count?.likes || 0); // Need to update getStoryById to include counts
        }
        setLoading(false);
    };

    const loadComments = async (id: string) => {
        const data = await getComments(id);
        setComments(data);
    };

    const handleLike = async () => {
        if (!user) return alert("Please sign in to like stories");

        // Optimistic update
        const newLiked = !isLiked;
        setIsLiked(newLiked);
        setLikeCount(prev => newLiked ? prev + 1 : prev - 1);

        const res = await toggleLikeStory(storyId as string);
        if (!res.success) {
            // Revert
            setIsLiked(!newLiked);
            setLikeCount(prev => !newLiked ? prev + 1 : prev - 1);
        }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return alert("Please sign in to comment");
        if (!commentInput.trim()) return;

        const res = await addComment(storyId as string, commentInput);
        if (res.success) {
            setCommentInput("");
            setComments(prev => [res.comment, ...prev]);
        } else {
            alert("Failed to post comment");
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
    };

    const handleFork = async () => {
        if (!user) return alert("Please sign in to remix stories");
        if (!confirm("Create a remix of this story in your library?")) return;

        const res = await forkStory(storyId as string);
        if (res.success) {
            router.push('/dashboard'); // Ideally go to the new story
        } else {
            alert("Failed to remix: " + res.error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">
                <div className="w-8 h-8 rounded-lg bg-orange-600 animate-spin" />
            </div>
        );
    }

    if (!story) {
        return (
            <div className="min-h-screen bg-[#0f0f12] flex flex-col items-center justify-center text-white">
                <h1 className="text-2xl font-bold mb-4">Story not found</h1>
                <Link href="/community" className="text-orange-500 hover:underline">Back to Community</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f0f12] text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-[#0f0f12]/90 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-6 lg:px-12">
                <Link href="/community" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ChevronLeft size={20} />
                    <span>Back to Community</span>
                </Link>
                <div className="flex items-center gap-4">
                    {user && (
                        <button onClick={handleFork} className="px-4 py-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/30 font-medium text-sm transition-all">
                            Remix Story
                        </button>
                    )}
                    <button onClick={handleShare} className="p-2 text-gray-400 hover:text-white transition-colors">
                        <Share2 size={20} />
                    </button>
                </div>
            </header>

            <main className="pt-24 pb-20 max-w-4xl mx-auto px-6">

                {/* Hero Section */}
                <div className="mb-12 text-center">
                    <span className="inline-block px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-bold tracking-widest uppercase mb-4 border border-orange-500/20">
                        {story.era} • {story.style}
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        {story.title}
                    </h1>

                    <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-700 overflow-hidden">
                                {story.user?.image ? <img src={story.user.image} className="w-full h-full object-cover" /> : null}
                            </div>
                            <span>{story.user?.name || "Unknown Author"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            <span>{new Date(story.publishedAt || story.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Images Grid */}
                {story.images && story.images.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                        {story.images.map((img: any, i: number) => (
                            <div key={i} className="aspect-video rounded-xl overflow-hidden border border-white/10 relative group">
                                <img src={img.url} alt={img.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Audio Player (If URL exists) */}
                {story.audioUrl && (
                    <div className="mb-12 p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (audioRef.current) {
                                    if (isPlaying) audioRef.current.pause();
                                    else audioRef.current.play();
                                    setIsPlaying(!isPlaying);
                                }
                            }}
                            className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center hover:bg-orange-500 transition-colors"
                        >
                            {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-1" />}
                        </button>
                        <div className="flex-1">
                            <div className="text-sm font-medium text-white mb-1">Audio Narration</div>
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 w-0" /> {/* Needs real progress tracking */}
                            </div>
                        </div>
                        <audio ref={audioRef} src={`http://localhost:8000${story.audioUrl}`} onEnded={() => setIsPlaying(false)} />
                    </div>
                )}

                {/* Content */}
                <article className="prose prose-invert prose-lg max-w-none mb-16 leading-relaxed">
                    {story.content.split('\n').map((para: string, i: number) => (
                        para.trim() ? <p key={i} className="mb-6 text-gray-300">{para}</p> : <br key={i} />
                    ))}
                </article>

                {/* Actions */}
                <div className="flex items-center justify-between py-6 border-t border-white/10 mb-12">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'}`}
                        >
                            <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
                            <span className="font-medium">{likeCount} Likes</span>
                        </button>
                        <div className="flex items-center gap-2 text-gray-400">
                            <MessageCircle size={24} />
                            <span className="font-medium">{comments.length} Comments</span>
                        </div>
                    </div>
                </div>

                {/* Comments Section */}
                <div className="bg-[#15151a] rounded-2xl p-8 border border-white/5">
                    <h3 className="text-xl font-bold mb-6">Discussion</h3>

                    {/* Comment Form */}
                    {user ? (
                        <form onSubmit={handleComment} className="mb-8 flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                <img src={user.imageUrl} alt={user.fullName || "User"} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 relative">
                                <textarea
                                    value={commentInput}
                                    onChange={(e) => setCommentInput(e.target.value)}
                                    placeholder="Share your thoughts..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-orange-500/50 min-h-[100px] resize-none"
                                />
                                <button
                                    type="submit"
                                    disabled={!commentInput.trim()}
                                    className="absolute bottom-4 right-4 p-2 bg-orange-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-500 transition-colors"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="p-4 bg-white/5 rounded-xl text-center mb-8">
                            <p className="text-gray-400">Please <Link href="/sign-in" className="text-orange-400 hover:underline">sign in</Link> to leave a comment.</p>
                        </div>
                    )}

                    {/* Comments List */}
                    <div className="space-y-6">
                        {comments.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No comments yet. Be the first to share your thoughts!</p>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="flex gap-4 group">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
                                        {comment.user?.image ? <img src={comment.user.image} className="w-full h-full object-cover" /> : (comment.user?.name?.[0] || '?')}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm text-white">{comment.user?.name || "User"}</span>
                                            <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-gray-300 text-sm leading-relaxed">{comment.content}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
}
