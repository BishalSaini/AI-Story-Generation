"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, History, Image as ImageIcon } from 'lucide-react';
import { generateAndSaveStory } from '../actions/story';
import { getUserStories, getStoryById } from '../actions/history';
import CreditDisplay from '@/components/CreditDisplay';
import { initializeUserCredits } from '../actions/credits';


export default function Dashboard() {
    const { user } = useUser();
    const [topic, setTopic] = useState("");
    const [storyType, setStoryType] = useState("Historical");
    const [era, setEra] = useState("Medieval");
    const [style, setStyle] = useState("Narrative");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [storyHistory, setStoryHistory] = useState<any[]>([]);

    // Initialize user credits on first login
    useEffect(() => {
        if (user?.id && user?.primaryEmailAddress?.emailAddress) {
            initializeUserCredits(user.id, user.primaryEmailAddress.emailAddress);
            loadStoryHistory();
        }
    }, [user]);

    const loadStoryHistory = async () => {
        if (!user?.id) return;
        const stories = await getUserStories(user.id);
        setStoryHistory(stories);
    };

    const loadStoryFromHistory = async (storyId: string) => {
        const story = await getStoryById(storyId);
        if (story) {
            setResult({
                story: {
                    ...story,
                    story_content: story.content,
                    timeline: story.timeline as any[],
                    main_events_summary: story.events as any[]
                },
                images: story.images
            });
        }
    };

    const handleGenerate = async () => {
        if (!topic) return;
        setLoading(true);
        setResult(null);
        try {
            // Auto-detect if Contemporary era with Historical type - likely needs Creative type
            let finalStoryType = storyType;
            if (era === "Contemporary" && storyType === "Historical") {
                // Suggest creative for contemporary topics
                const creativeKeywords = ['magical', 'fantasy', 'adventure', 'kids', 'dragon', 'princess', 'space', 'alien', 'robot'];
                const hasCreativeKeyword = creativeKeywords.some(keyword => 
                    topic.toLowerCase().includes(keyword)
                );
                if (hasCreativeKeyword) {
                    finalStoryType = "Creative";
                }
            }
            
            // Using Server Action instead of direct API call
            const response = await generateAndSaveStory(
                user?.id || "guest",
                user?.primaryEmailAddress?.emailAddress || "guest@example.com",
                topic,
                era,
                style,
                finalStoryType
            );

            if (response.success && response.story) {
                // Transform for UI (Prisma returns JSON fields as objects, might need handling if simple render)
                // Timeline/Events are JsonValue, handled by React safely usually
                setResult({
                    story: {
                        ...response.story,
                        story_content: response.story.content, // mapping back to UI expectation
                        timeline: response.story.timeline as any[],
                        main_events_summary: response.story.events as any[]
                    },
                    images: response.story.images
                });

                // Reload history
                await loadStoryHistory();

                // Refresh credits display
                if (typeof window !== 'undefined' && (window as any).refreshCredits) {
                    (window as any).refreshCredits();
                }
            } else {
                alert("Generation failed: " + response.error);
            }

        } catch (e) {
            console.error(e);
            alert("Generation failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0f12] text-white flex">
            {/* Sidebar (History) - Static for demo */}
            <aside className="w-64 border-r border-white/10 p-6 hidden md:block">
                <div className="flex items-center gap-2 mb-8 text-orange-400 font-bold">
                    <History size={20} />
                    <span>History Log</span>
                </div>
                <div className="space-y-2">
                    {storyHistory.length === 0 ? (
                        <div className="text-sm text-gray-500">No previous stories.</div>
                    ) : (
                        storyHistory.map((story) => (
                            <button
                                key={story.id}
                                onClick={() => loadStoryFromHistory(story.id)}
                                className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition border border-white/5 hover:border-orange-500/30"
                            >
                                <div className="text-sm font-semibold text-white truncate">
                                    {story.title}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {story.era} • {new Date(story.createdAt).toLocaleDateString()}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold">Story Generator</h1>
                    <div className="flex items-center gap-4">
                        <CreditDisplay />
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            System Active
                        </div>
                    </div>
                </header>

                <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {/* Input Section */}
                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                {storyType === "Historical" ? "Historical Topic / Figure / Event" : "Story Topic / Theme / Character"}
                            </label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder={
                                    storyType === "Historical"
                                        ? "e.g. Napoleon Bonaparte, Cleopatra, World War II, etc."
                                        : "e.g. A dragon's adventure, Space exploration, Magic kingdom, etc."
                                }
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition"
                            />

                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Story Type</label>
                                <select
                                    value={storyType}
                                    onChange={(e) => setStoryType(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                                >
                                    <option value="Historical">Historical (Factual)</option>
                                    <option value="Creative">Creative/Imaginative</option>
                                    <option value="Hybrid">Hybrid (Historical + Creative)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Era</label>
                                    <select
                                        value={era}
                                        onChange={(e) => setEra(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                                    >
                                        <option value="Ancient">Ancient Era (3000 BCE - 500 CE)</option>
                                        <option value="Medieval">Medieval Era (500 - 1500)</option>
                                        <option value="Renaissance">Renaissance (1400 - 1700)</option>
                                        <option value="Modern">Modern Era (1700 - 1900)</option>
                                        <option value="20th Century">20th Century (1900 - 2000)</option>
                                        <option value="Contemporary">Contemporary (2000+)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Style</label>
                                    <select
                                        value={style}
                                        onChange={(e) => setStyle(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                                    >
                                        <option value="Narrative">Detailed Narrative</option>
                                        <option value="Kids">For Kids (Simple)</option>
                                        <option value="Documentary">Documentary Script</option>
                                        <option value="Academic">Academic/Scholarly</option>
                                        <option value="Epic">Epic/Dramatic</option>
                                        <option value="Biographical">Biographical</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={loading || !topic}
                                className="w-full mt-6 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex justify-center items-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                                {loading ? "Generating Story & Visuals..." : "Generate Story"}
                            </button>
                        </div>

                        {/* Guidelines */}
                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-200">
                            <strong>💡 Quick Tips:</strong>
                            <ul className="mt-2 space-y-1 ml-4 list-disc">
                                <li>For <strong>real historical events</strong>: Use "Historical" story type</li>
                                <li>For <strong>imaginative/fictional stories</strong>: Use "Creative" story type</li>
                                <li>Contemporary + magical/fantasy topics work best with "Creative" type</li>
                                <li><strong>Each story costs 10 credits</strong></li>
                            </ul>
                        </div>
                    </div>

                    {/* Output Section */}
                    <div className="space-y-6">
                        <AnimatePresence>
                            {result && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-8 rounded-2xl bg-white text-black min-h-[600px] shadow-2xl overflow-hidden relative"
                                >
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-red-600" />

                                    <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">{result.story.era}</span>
                                    <h2 className="text-3xl font-serif font-bold mb-4 text-gray-900">{result.story.title}</h2>

                                    {/* Images Scroll */}
                                    {result.images && result.images.length > 0 && (
                                        <div className="flex gap-4 overflow-x-auto mb-6 pb-2">
                                            {result.images.map((img: any, idx: number) => (
                                                <img
                                                    key={idx}
                                                    src={img.url}
                                                    alt={img.prompt}
                                                    className="h-48 rounded-lg shadow-md object-cover flex-shrink-0 border border-gray-200"
                                                />
                                            ))}
                                        </div>
                                    )}

                                    <div className="prose prose-stone max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {result.story.story_content}
                                    </div>

                                    {result.story.moral && (
                                        <div className="mt-8 p-4 bg-orange-50 rounded-lg border border-orange-100 italic text-orange-900">
                                            " {result.story.moral} "
                                        </div>
                                    )}

                                    {/* Timeline */}
                                    {result.story.timeline && (
                                        <div className="mt-8 pt-8 border-t border-gray-100">
                                            <h3 className="font-bold mb-4">Key Timeline</h3>
                                            <ul className="space-y-2 text-sm">
                                                {result.story.timeline.map((t: any, i: number) => (
                                                    <li key={i} className="flex gap-4">
                                                        <span className="font-mono font-bold text-gray-500 w-24 flex-shrink-0">{t.date}</span>
                                                        <span>{t.event}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {!result && !loading && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                                <ImageIcon size={48} className="mb-4" />
                                <p>Story and visuals will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
