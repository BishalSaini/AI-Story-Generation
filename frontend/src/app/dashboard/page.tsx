"use client";
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Send, History, Image as ImageIcon, Play, Pause, Square, Volume2, MessageCircle, X, User, Plus, LayoutDashboard, ChevronLeft, ChevronRight, Feather } from 'lucide-react';
import { generateAndSaveStory, extractCharacters, messageCharacter } from '../actions/story';
import { generateAndSaveAudio, getStoredAudio } from '../actions/audio';
import { getUserStories, getStoryById } from '../actions/history';
import CreditDisplay from '@/components/CreditDisplay';
import ModernLoader from '@/components/ModernLoader';
import { initializeUserCredits } from '../actions/credits';
import Link from 'next/link';


export default function Dashboard() {
    const { user } = useUser();
    // View State
    const [viewMode, setViewMode] = useState<'create' | 'view'>('create');
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [result, setResult] = useState<any>(null);
    const [storyHistory, setStoryHistory] = useState<any[]>([]);

    // Form State
    const [topic, setTopic] = useState("");
    const [storyType, setStoryType] = useState("Historical");
    const [era, setEra] = useState("Medieval");
    const [style, setStyle] = useState("Narrative");
    const [language, setLanguage] = useState("English");
    const [withImages, setWithImages] = useState(true);

    // Audio State
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [alignment, setAlignment] = useState<any[]>([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
    const [highlightedSentenceIndex, setHighlightedSentenceIndex] = useState(-1);
    const [audioLoadingStep, setAudioLoadingStep] = useState(0);

    // Refs
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const storyContainerRef = React.useRef<HTMLDivElement | null>(null);

    // Chat State
    const [chatCharacters, setChatCharacters] = useState<string[]>([]);
    const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<{ role: string, content: string }[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isExtractingChars, setIsExtractingChars] = useState(false);
    const [showChatPanel, setShowChatPanel] = useState(false);

    // Reset audio when result changes
    useEffect(() => {
        setAudioUrl(null);
        setIsPlaying(false);
        setAlignment([]);
        setHighlightedWordIndex(-1);
        setCurrentTime(0);
        // Reset Chat on new story
        setChatCharacters([]);
        setSelectedCharacter(null);
        setChatMessages([]);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [result]);

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

    const handleCreateNew = () => {
        setViewMode('create');
        setResult(null);
        setTopic("");
        setShowChatPanel(false);
    };

    const loadStoryFromHistory = async (storyId: string) => {
        setLoading(true);
        const story: any = await getStoryById(storyId);
        if (story) {
            setResult({
                story: {
                    ...story,
                    id: story.id,
                    story_content: story.content,
                    timeline: story.timeline as any[],
                    main_events_summary: story.events as any[]
                },
                images: story.images
            });

            // Load cached audio if available
            if (story.audioUrl && story.audioAlignment) {
                const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:8000";
                const fullUrl = `${backendUrl}${story.audioUrl}`;
                setAudioUrl(fullUrl);

                if (story.audioAlignment) {
                    const processed = preprocessAlignment(story.audioAlignment as any[], story.content);
                    setAlignment(processed);
                    console.log("Loaded cached audio with alignment:", processed.length, "tokens");
                }
            }

            setViewMode('view');
            setShowChatPanel(false);
        }
        setLoading(false);
    };

    const FACTS = [
        "Did you know? Cleopatra lived closer in time to the Moon landing than to the Great Pyramid's construction.",
        "The shortest war in history lasted only 38 minutes between Britain and Zanzibar in 1896.",
        "Woolly mammoths were still alive when the Egyptians were building the Great Pyramids.",
        "Oxford University is older than the Aztec Empire.",
        "There were female gladiators in Ancient Rome! They were called Gladiatrix.",
        "The Great Wall of China is not visible from space with the naked eye.",
    ];
    const [factIndex, setFactIndex] = useState(0);

    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setFactIndex((prev) => (prev + 1) % FACTS.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [loading]);

    const handleGenerate = async () => {
        if (!topic) return;
        setLoading(true);
        setResult(null);
        setLoadingStep(1); // Drafting

        try {
            // Auto-detect if Contemporary era with Historical type - likely needs Creative type
            let finalStoryType = storyType;
            if (era === "Contemporary" && storyType === "Historical") {
                const creativeKeywords = ['magical', 'fantasy', 'adventure', 'kids', 'dragon', 'princess', 'space', 'alien', 'robot'];
                const hasCreativeKeyword = creativeKeywords.some(keyword =>
                    topic.toLowerCase().includes(keyword)
                );
                if (hasCreativeKeyword) {
                    finalStoryType = "Creative";
                }
            }

            if (withImages) {
                setTimeout(() => setLoadingStep(2), 15000); // Fake progress to 'Visualizing' after 15s
            }

            const response = await generateAndSaveStory(
                user?.id || "guest",
                user?.primaryEmailAddress?.emailAddress || "guest@example.com",
                topic,
                era,
                style,
                finalStoryType,
                withImages,
                language
            );

            if (response.success && response.story) {
                setResult({
                    story: {
                        ...response.story,
                        story_content: response.story.content,
                        timeline: response.story.timeline as any[],
                        main_events_summary: response.story.events as any[]
                    },
                    images: response.story.images
                });
                await loadStoryHistory();
                if (typeof window !== 'undefined' && (window as any).refreshCredits) {
                    (window as any).refreshCredits();
                }
                setViewMode('view');
                setShowChatPanel(false);
            } else {
                alert("Generation failed: " + response.error);
            }

        } catch (e) {
            console.error(e);
            alert("Generation failed. Please try again.");
        } finally {
            setLoading(false);
            setLoadingStep(0);
        }
    };


    const preprocessAlignment = (rawAlignment: any[], text: string): any[] => {
        console.log("=== PREPROCESSING ALIGNMENT ===");
        console.log("Raw alignment length:", rawAlignment.length);
        console.log("Text length:", text.length);

        const wordAlignment = rawAlignment.filter(a => a.type === 'WordBoundary');
        const sentenceAlignment = rawAlignment.filter(a => a.type === 'SentenceBoundary');

        console.log("Word boundaries:", wordAlignment.length);
        console.log("Sentence boundaries:", sentenceAlignment.length);
        console.log("First 5 word alignments:", wordAlignment.slice(0, 5));
        console.log("All sentence alignments:", sentenceAlignment);

        const tokens = text.split(/(\s+)/);
        const processed: any[] = [];
        let alignmentIdx = 0;

        const clean = (s: string) => s.toLowerCase().replace(/[^\w]/g, '');

        tokens.forEach((token, tokenIdx) => {
            if (!token) return;

            // Handle special whitespace
            if (token.includes('\n\n')) {
                processed.push({ type: 'paragraph_break', text: token });
                return;
            }
            if (token.includes('\n')) {
                processed.push({ type: 'line_break', text: token });
                return;
            }
            if (!token.trim()) {
                processed.push({ type: 'space', text: token });
                return;
            }

            // Try to match word with alignment
            const cleanToken = clean(token);
            let matchedAlignment: any = null;

            // Look ahead up to 10 positions to find match
            for (let lookahead = 0; lookahead < 10 && alignmentIdx + lookahead < wordAlignment.length; lookahead++) {
                const alignmentWord = wordAlignment[alignmentIdx + lookahead].word;
                const cleanAlignment = clean(alignmentWord);

                // Try exact match, partial match, or substring match
                if (cleanToken === cleanAlignment ||
                    cleanToken.includes(cleanAlignment) ||
                    cleanAlignment.includes(cleanToken)) {
                    matchedAlignment = wordAlignment[alignmentIdx + lookahead];
                    alignmentIdx += lookahead + 1;
                    break;
                }
            }

            // Add to processed array
            processed.push({
                type: 'word',
                text: token,
                start: matchedAlignment?.start,
                end: matchedAlignment?.end,
                sentenceIdx: -1, // Will be filled later
                matched: !!matchedAlignment
            });
        });

        // Count matched words
        const matchedCount = processed.filter(p => p.type === 'word' && p.matched).length;
        const totalWords = processed.filter(p => p.type === 'word').length;
        console.log(`Matched ${matchedCount} out of ${totalWords} words (${((matchedCount / totalWords) * 100).toFixed(1)}%)`);

        // Map sentence boundaries to words
        sentenceAlignment.forEach((sent: any, sIdx: number) => {
            const nextSent = sentenceAlignment[sIdx + 1];
            const endTime = nextSent ? nextSent.start : 9999999;

            processed.forEach((p: any) => {
                if (p.type === 'word' && p.start !== undefined) {
                    if (p.start >= sent.start && p.start < endTime) {
                        p.sentenceIdx = sIdx;
                    }
                }
            });
        });

        // Count sentence assignments
        const wordsWithSentence = processed.filter(p => p.type === 'word' && p.sentenceIdx >= 0).length;
        console.log(`Assigned ${wordsWithSentence} words to sentences`);
        console.log("=== PREPROCESSING COMPLETE ===");

        return processed;
    };



    const handleTimeUpdate = () => {
        if (!audioRef.current || alignment.length === 0) {
            if (!audioRef.current) console.log("No audio ref");
            if (alignment.length === 0) console.log("No alignment data");
            return;
        }

        const now = audioRef.current.currentTime;
        setCurrentTime(now);

        // Log every second for debugging
        if (Math.floor(now) !== Math.floor(currentTime)) {
            console.log(`Time: ${now.toFixed(2)}s, Alignment items: ${alignment.length}`);
        }

        const activeWordIdx = alignment.findIndex((item) => {
            if (item.type !== 'word' || item.start === undefined) return false;
            // Add a small buffer for end time to keep highlight visible
            const end = item.end || (item.start + 0.3);
            return now >= item.start && now < end;
        });

        if (activeWordIdx !== -1) {
            if (activeWordIdx !== highlightedWordIndex) {
                console.log(`Highlighting word ${activeWordIdx}: "${alignment[activeWordIdx].text}" at ${now.toFixed(2)}s`);
            }
            setHighlightedWordIndex(activeWordIdx);
            const sIdx = alignment[activeWordIdx].sentenceIdx;
            if (sIdx !== undefined) setHighlightedSentenceIndex(sIdx);

            // Throttle scroll to avoid performance issues
            const element = document.getElementById(`word-${activeWordIdx}`);
            if (element && activeWordIdx % 2 === 0) { // Scroll every 2nd word to be smoother
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            // Log when no word is found
            if (alignment.length > 0 && Math.floor(now) % 2 === 0 && now > 0) {
                const wordsWithTime = alignment.filter(a => a.type === 'word' && a.start !== undefined);
                if (wordsWithTime.length > 0) {
                    console.log(`No word match at ${now.toFixed(2)}s. First word starts at: ${wordsWithTime[0].start}, Last word ends at: ${wordsWithTime[wordsWithTime.length - 1].end}`);
                }
            }
        }
    };

    const handlePlayAudio = async () => {
        if (audioUrl) {
            if (audioRef.current) {
                if (isPlaying) {
                    audioRef.current.pause();
                } else {
                    audioRef.current.play();
                }
                setIsPlaying(!isPlaying);
            }
            return;
        }

        if (!result?.story?.id) {
            alert("Story ID not found");
            return;
        }

        setIsAudioLoading(true);
        setAudioLoadingStep(1);

        // Simulation for engagement
        const interval = setInterval(() => {
            setAudioLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
        }, 1500);

        try {
            // Use cached audio system
            const res = await generateAndSaveAudio(
                result.story.id,
                result.story.story_content,
                result.story.storyType || result.story.style || "Historical"
            );

            if (res.success && res.audioUrl) {
                const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:8000";
                const fullUrl = `${backendUrl}${res.audioUrl}`;

                setAudioUrl(fullUrl);

                if (res.cached) {
                    console.log("Using cached audio");
                }

                if (res.alignment) {
                    console.log("=== AUDIO ALIGNMENT RECEIVED ===");
                    console.log("Total alignment events:", res.alignment.length);
                    console.log("Sample events:", res.alignment.slice(0, 10));
                    console.log("Event types:", [...new Set(res.alignment.map((a: any) => a.type))]);

                    // Process alignment to restore paragraphs
                    const processed = preprocessAlignment(res.alignment, result.story.story_content);
                    setAlignment(processed);
                    console.log("Final processed items:", processed.length);
                } else {
                    console.warn("No alignment data received");
                }

                // Auto play
                setTimeout(() => {
                    if (audioRef.current) {
                        audioRef.current.play();
                        setIsPlaying(true);
                    }
                }, 100);
            } else {
                alert("Failed to generate audio: " + (res.error || "Unknown error"));
            }
        } catch (e) {
            console.error(e);
            alert("Error generating audio");
        } finally {
            clearInterval(interval);
            setAudioLoadingStep(0);
            setIsAudioLoading(false);
        }
    };


    const retryExtraction = async () => {
        if (!result) return;
        setIsExtractingChars(true);
        const res = await extractCharacters(result.story.story_content);
        if (res.success) {
            setChatCharacters(res.characters);
        }
        setIsExtractingChars(false);
    };

    const handleStartChat = async () => {
        setShowChatPanel(!showChatPanel);
        // If opening and no characters yet, extract them
        if (!showChatPanel && chatCharacters.length === 0 && result) {
            setIsExtractingChars(true);
            const res = await extractCharacters(result.story.story_content);
            if (res.success) {
                setChatCharacters(res.characters);
            }
            setIsExtractingChars(false);
        }
    };

    const handleSelectCharacter = (char: string) => {
        setSelectedCharacter(char);
        setChatMessages([{ role: "assistant", content: `Greetings. I am ${char}. Ask me anything about my journey.` }]);
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !selectedCharacter) return;

        const newMessage = { role: "user", content: chatInput };
        setChatMessages(prev => [...prev, newMessage]);
        setChatInput("");
        setIsChatLoading(true);

        const res = await messageCharacter(
            result.story.story_content,
            selectedCharacter,
            [...chatMessages, newMessage],
            chatInput
        );

        if (res.success) {
            setChatMessages(prev => [...prev, { role: "assistant", content: res.response }]);
        }
        setIsChatLoading(false);
    };

    const renderFormattedText = (text: string) => {
        if (!text) return null;
        return text.split('\n').map((line, i) => {
            // Handle double newlines as paragraph breaks
            if (!line.trim()) return <br key={`br-${i}`} className="block h-4" />;

            // Bold parser for **text**
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
                <p key={i} className="mb-4 text-gray-300 leading-relaxed">
                    {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j} className="text-white font-bold">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                    })}
                </p>
            );
        });
    };

    return (
        <div className="min-h-screen bg-[#0f0f12] text-white flex relative">
            {/* Loading Overlay with Modern Loader */}
            {loading && (
                <ModernLoader
                    loadingStep={loadingStep}
                    factIndex={factIndex}
                    facts={FACTS}
                />
            )}

            {/* Sidebar (History) */}
            <aside className="w-64 border-r border-white/10 p-6 hidden md:flex flex-col">
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 via-red-600 to-purple-700 flex items-center justify-center shadow-lg">
                        <Feather size={16} className="text-white" />
                    </div>
                    <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">StoryNest</span>
                </div>

                <div className="mb-6">
                    <button
                        onClick={handleCreateNew}
                        className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-lg text-white font-semibold flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                        <Plus size={18} />
                        New Story
                    </button>
                </div>

                <div className="flex items-center gap-2 mb-4 text-gray-400 font-bold text-xs uppercase tracking-widest">
                    <History size={14} />
                    <span>Recent Adventures</span>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                    {storyHistory.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-4">No stories yet.</div>
                    ) : (
                        storyHistory.map((story) => (
                            <button
                                key={story.id}
                                onClick={() => loadStoryFromHistory(story.id)}
                                className={`w-full text-left p-3 rounded-lg transition-all border
                                    ${result?.story.title === story.title
                                        ? 'bg-white/10 border-orange-500/50 text-white'
                                        : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400 hover:text-white'
                                    }`}
                            >
                                <div className="text-sm font-semibold truncate leading-tight">
                                    {story.title}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-1">
                                    {story.era} • {new Date(story.createdAt).toLocaleDateString()}
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                    <CreditDisplay />
                    <div className="mt-4 text-[10px] text-gray-500 text-center font-medium">
                        Developed by Vipul Patil
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden flex flex-col relative h-screen">

                {/* Header (Top Bar) */}
                <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-[#0f0f12]">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            {viewMode === 'create' ? "Create New Story" : result?.story.title}
                        </h1>
                        {viewMode === 'view' && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-gray-400 border border-white/5 uppercase tracking-wide">
                                {result?.story.era}
                            </span>
                        )}
                    </div>
                    {viewMode === 'view' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowChatPanel(!showChatPanel)}
                                className={`p-2 rounded-lg border transition-all flex items-center gap-2 text-sm font-medium
                                    ${showChatPanel
                                        ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                    }`}
                            >
                                <MessageCircle size={18} />
                                {showChatPanel ? "Close Chat" : "Talk to Characters"}
                            </button>
                        </div>
                    )}
                </header>

                <div className="flex-1 overflow-hidden relative flex">
                    {/* View Mode: Story Content */}
                    {viewMode === 'view' && result && (
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="max-w-4xl mx-auto pb-20">

                                <div className="p-8 rounded-2xl bg-[#15151a] border border-white/5 shadow-2xl relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-600 shadow-[0_0_15px_rgba(249,115,22,0.3)]" />

                                    {/* Images */}
                                    {result.images && result.images.length > 0 && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                                            {result.images.map((img: any, idx: number) => (
                                                <div key={idx} className="aspect-video relative rounded-lg overflow-hidden border border-white/10 group">
                                                    <img
                                                        src={img.url}
                                                        alt={img.prompt}
                                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Audio Player */}
                                    <div className="flex flex-col gap-4 mb-8 bg-black/20 p-4 rounded-xl border border-white/10">
                                        {/* Hidden Audio Element */}
                                        {audioUrl && (
                                            <audio
                                                ref={audioRef}
                                                src={audioUrl}
                                                onEnded={() => { setIsPlaying(false); setHighlightedWordIndex(-1); }}
                                                onPause={() => setIsPlaying(false)}
                                                onPlay={() => setIsPlaying(true)}
                                                onTimeUpdate={handleTimeUpdate}
                                                className="hidden"
                                            />
                                        )}

                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={handlePlayAudio}
                                                disabled={isAudioLoading}
                                                className={`w-12 h-12 flex items-center justify-center rounded-full shadow-lg transition-all
                                                    ${isAudioLoading
                                                        ? 'bg-gray-800 cursor-wait'
                                                        : 'bg-orange-600 hover:bg-orange-500 text-white'
                                                    }
                                                `}
                                            >
                                                {isAudioLoading ? (
                                                    <div className="flex items-center gap-0.5 h-4">
                                                        {[0.4, 0.7, 0.5, 0.9, 0.6].map((h, i) => (
                                                            <motion.div
                                                                key={i}
                                                                animate={{ height: ["20%", "100%", "20%"] }}
                                                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                                                                className="w-1 bg-white/60 rounded-full"
                                                                style={{ height: `${h * 100}%` }}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : isPlaying ? (
                                                    <Pause size={24} className="fill-current" />
                                                ) : (
                                                    <Play size={24} className="fill-current ml-1" />
                                                )}
                                            </button>

                                            <div className="flex-1">
                                                <div className="text-sm font-bold text-gray-200">
                                                    {isAudioLoading ? (
                                                        <motion.span
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            key={audioLoadingStep}
                                                        >
                                                            {
                                                                [
                                                                    "",
                                                                    "Analyzing Narrative Tone...",
                                                                    "Calibrating Era-Specific Voice...",
                                                                    "Synthesizing Ancient Echoes...",
                                                                    "Finalizing Cinematic Sync..."
                                                                ][audioLoadingStep]
                                                            }
                                                        </motion.span>
                                                    ) : "Listen to Story"}
                                                </div>
                                                {/* Progress Bar */}
                                                <div className="w-full bg-white/10 h-1 mt-2 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-orange-500"
                                                        style={{
                                                            width: `${audioRef.current && audioRef.current.duration ? (currentTime / audioRef.current.duration) * 100 : 0}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Story Content */}
                                    <div
                                        ref={storyContainerRef}
                                        className="prose prose-invert prose-lg max-w-none leading-relaxed whitespace-pre-wrap select-none scroll-mt-24"
                                    >
                                        {alignment.length > 0 ? (
                                            alignment.map((item, index) => {
                                                if (item.type === 'paragraph_break') return <span key={index} className="block h-8" aria-hidden="true" />;
                                                if (item.type === 'line_break') return <span key={index} className="block h-4" aria-hidden="true" />;
                                                if (item.type === 'space') return <span key={index}>{item.text}</span>;

                                                const isSentenceActive = highlightedSentenceIndex === -1 || item.sentenceIdx === highlightedSentenceIndex;
                                                const isWordActive = index === highlightedWordIndex;

                                                return (
                                                    <span
                                                        key={index}
                                                        id={`word-${index}`}
                                                        className={`transition-all duration-300 inline text-lg
                                                            ${isWordActive ? 'text-orange-400 font-bold scale-110 shadow-orange-500/20' : isSentenceActive ? 'text-gray-100' : 'text-gray-600'}
                                                            ${isWordActive ? 'underline underline-offset-4' : ''}
                                                        `}
                                                    >
                                                        {item.text}
                                                    </span>
                                                );
                                            })
                                        ) : (
                                            <div className="text-gray-300">
                                                {renderFormattedText(result.story.story_content)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Timeline */}
                                    {result.story.timeline && (
                                        <div className="mt-12 pt-8 border-t border-white/10">
                                            <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
                                                <History size={18} className="text-orange-500" /> Timeline of Events
                                            </h3>
                                            <div className="space-y-4">
                                                {result.story.timeline.map((t: any, i: number) => (
                                                    <div key={i} className="flex gap-4 group">
                                                        <div className="w-24 text-right font-mono text-sm text-gray-500 pt-1 flex-shrink-0 group-hover:text-orange-400 transition-colors">
                                                            {t.date}
                                                        </div>
                                                        <div className="flex-1 pb-4 border-l border-white/10 pl-6 relative">
                                                            <div className="absolute top-2 left-[-5px] w-2.5 h-2.5 rounded-full bg-[#15151a] border border-gray-600 group-hover:border-orange-500 group-hover:bg-orange-900 transition-colors" />
                                                            <p className="text-gray-400 text-sm leading-relaxed">{t.event}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View Mode: Chat Panel (Right Split) */}
                    <AnimatePresence>
                        {viewMode === 'view' && showChatPanel && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 400, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="h-full border-l border-white/10 bg-[#121215] flex flex-col shadow-2xl z-20"
                            >
                                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#15151a]">
                                    <h3 className="font-bold text-white flex items-center gap-2">
                                        <MessageCircle size={18} className="text-orange-500" />
                                        Persona Chat
                                    </h3>
                                    <button onClick={() => setShowChatPanel(false)} className="text-gray-500 hover:text-white">
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-hidden flex flex-col p-4">
                                    {!selectedCharacter ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                                <User size={32} className="text-gray-500" />
                                            </div>
                                            <h4 className="text-lg font-bold text-white mb-2">Select a Character</h4>
                                            <p className="text-sm text-gray-400 mb-6">Choose a character from the story to start a conversation.</p>

                                            {isExtractingChars ? (
                                                <div className="flex items-center gap-2 text-orange-400 text-sm">
                                                    <Loader2 size={16} className="animate-spin" /> Identifying characters...
                                                </div>
                                            ) : (
                                                <div className="w-full space-y-2">
                                                    {chatCharacters.map((char, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => handleSelectCharacter(char)}
                                                            className="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-left flex items-center gap-3 transition-colors"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-xs font-bold text-white">
                                                                {char[0]}
                                                            </div>
                                                            <span className="text-gray-200 font-medium">{char}</span>
                                                        </button>
                                                    ))}
                                                    {chatCharacters.length === 0 && (
                                                        <button onClick={retryExtraction} className="text-xs text-orange-400 hover:underline">
                                                            Try detecting characters again
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white">
                                                        {selectedCharacter[0]}
                                                    </div>
                                                    <span className="font-bold text-white text-sm">{selectedCharacter}</span>
                                                </div>
                                                <button onClick={() => setSelectedCharacter(null)} className="text-xs text-gray-400 hover:text-orange-400">
                                                    Change
                                                </button>
                                            </div>

                                            <div className="flex-1 overflow-y-auto space-y-4 mb-4 custom-scrollbar pr-2">
                                                {chatMessages.map((msg, i) => (
                                                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                                                            ? "bg-orange-600 text-white rounded-br-none"
                                                            : "bg-white/10 text-gray-300 rounded-bl-none"
                                                            }`}>
                                                            {msg.content}
                                                        </div>
                                                    </div>
                                                ))}
                                                {isChatLoading && (
                                                    <div className="flex justify-start">
                                                        <div className="bg-white/5 p-3 rounded-2xl rounded-bl-none">
                                                            <Loader2 className="animate-spin text-gray-400" size={16} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={chatInput}
                                                    onChange={(e) => setChatInput(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                                    placeholder="Type a message..."
                                                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                                                />
                                                <button
                                                    onClick={handleSendMessage}
                                                    disabled={!chatInput.trim() || isChatLoading}
                                                    className="p-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-white disabled:opacity-50"
                                                >
                                                    <Send size={16} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Create Mode: Input Form */}
                    {viewMode === 'create' && (
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center custom-scrollbar">
                            <div className="w-full max-w-2xl space-y-8 pb-20">
                                <div className="text-center space-y-3">
                                    <h2 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-orange-500 to-red-600 tracking-tighter">
                                        CRAFT YOUR MASTERPIECE
                                    </h2>
                                    <p className="text-gray-400 text-lg font-medium track-tight">From a single spark of a prompt to a cinematic universe.</p>
                                </div>

                                <div className="bg-[#15151a] p-6 md:p-8 rounded-2xl border border-white/10 shadow-2xl space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">
                                            Topic / Theme / Character
                                        </label>
                                        <input
                                            type="text"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                            placeholder={
                                                {
                                                    "Historical": "e.g. Chatrapati Shivaji Maharaj, The Battle of Plassey",
                                                    "Creative": "e.g. A magical forest that whispers secrets, The last dragon",
                                                    "Mythology": "e.g. The churning of the ocean (Samudra Manthan), Karna's dilemma",
                                                    "SciFi": "e.g. A colony on Mars in 2050, AI assuming control",
                                                    "Mystery": "e.g. The missing diamond of Golconda, A detective in 1920s Bombay"
                                                }[storyType] || "e.g. Enter a topic..."
                                            }
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 transition text-lg"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Genre</label>
                                            <select
                                                value={storyType}
                                                onChange={(e) => setStoryType(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                                            >
                                                <option value="Historical">Historical</option>
                                                <option value="Creative">Creative Fiction</option>
                                                <option value="Mythology">Mythology</option>
                                                <option value="SciFi">Sci-Fi / Future</option>
                                                <option value="Mystery">Mystery</option>
                                            </select>

                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Narrative Style</label>
                                            <select
                                                value={style}
                                                onChange={(e) => setStyle(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                                            >
                                                <option value="Narrative">Classic Narrative</option>
                                                <option value="Cinematic">Cinematic</option>
                                                <option value="Journal">Journal / Diary</option>
                                                <option value="Poetic">Poetic</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Era / Period</label>
                                            <select
                                                value={era}
                                                onChange={(e) => setEra(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                                            >
                                                <option value="Ancient">Ancient</option>
                                                <option value="Medieval">Medieval</option>
                                                <option value="Renaissance">Renaissance</option>
                                                <option value="Industrial">Industrial</option>
                                                <option value="Contemporary">Contemporary</option>
                                                <option value="Future">Future</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Language</label>
                                            <select
                                                value={language}
                                                onChange={(e) => setLanguage(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50"
                                            >
                                                <option value="English">English</option>
                                                <option value="Hindi">Hindi</option>
                                                <option value="Marathi">Marathi</option>
                                                <option value="Sanskrit">Sanskrit</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Image Toggle */}
                                    <div className="flex items-center justify-between bg-black/20 p-4 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${withImages ? "bg-orange-500/20 text-orange-400" : "bg-gray-800 text-gray-500"}`}>
                                                <ImageIcon size={20} />
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">Visualize Story</div>
                                                <div className="text-xs text-gray-400">Add AI generated scenes (+10 Credits)</div>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={withImages} onChange={(e) => setWithImages(e.target.checked)} />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                                        </label>
                                    </div>



                                    <button
                                        onClick={handleGenerate}
                                        disabled={loading || !topic}
                                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition flex justify-center items-center gap-2 shadow-lg shadow-orange-900/20 text-lg"
                                    >
                                        {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                                        {loading ? "Weaving Narrative..." : `Generate Story (${withImages ? '20' : '10'} Credits)`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </main>

        </div>
    );
}
