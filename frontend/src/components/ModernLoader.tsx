"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Feather, BookOpen } from 'lucide-react';

interface ModernLoaderProps {
    loadingStep: number;
    factIndex: number;
    facts: string[];
}

export default function ModernLoader({ loadingStep, factIndex, facts }: ModernLoaderProps) {
    // Generate random positions once using useState with initializer function
    const [particles] = useState(() => {
        if (typeof window === 'undefined') {
            return [];
        }
        
        return [...Array(20)].map(() => ({
            initialX: Math.random() * window.innerWidth,
            initialY: Math.random() * window.innerHeight,
            targetX: Math.random() * window.innerWidth,
            targetY: Math.random() * window.innerHeight,
            duration: Math.random() * 3 + 2,
            delay: Math.random() * 2
        }));
    });

    return (
        <div className="absolute inset-0 z-50 bg-gradient-to-br from-black via-slate-900 to-orange-950/30 backdrop-blur-sm flex flex-col items-center justify-center p-8 overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                {particles.map((particle, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-orange-400/30 rounded-full"
                        initial={{ 
                            x: particle.initialX,
                            y: particle.initialY,
                            scale: 0 
                        }}
                        animate={{
                            y: [null, particle.targetY],
                            x: [null, particle.targetX],
                            scale: [0, 1, 0],
                            opacity: [0, 1, 0]
                        }}
                        transition={{
                            duration: particle.duration,
                            repeat: Infinity,
                            delay: particle.delay,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>

            <div className="max-w-2xl w-full text-center relative z-10">
                {/* Main Loader Animation */}
                <div className="relative mb-12">
                    {/* Rotating Outer Ring */}
                    <motion.div
                        className="w-40 h-40 mx-auto relative"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 border-r-orange-400" />
                    </motion.div>

                    {/* Pulsing Middle Ring */}
                    <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <div className="w-full h-full rounded-full border-4 border-orange-500/40" />
                    </motion.div>

                    {/* Center Icon */}
                    <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        animate={{ 
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                            duration: 2, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                        }}
                    >
                        {loadingStep === 1 ? (
                            <Feather className="w-12 h-12 text-orange-400" />
                        ) : (
                            <BookOpen className="w-12 h-12 text-orange-400" />
                        )}
                    </motion.div>

                    {/* Orbiting Sparkles */}
                    {[0, 120, 240].map((angle, i) => (
                        <motion.div
                            key={i}
                            className="absolute top-1/2 left-1/2"
                            style={{ transformOrigin: '0 0' }}
                            animate={{ rotate: 360 }}
                            transition={{ 
                                duration: 4,
                                repeat: Infinity,
                                ease: "linear",
                                delay: i * 0.3
                            }}
                        >
                            <motion.div
                                className="absolute"
                                style={{
                                    x: Math.cos((angle * Math.PI) / 180) * 80,
                                    y: Math.sin((angle * Math.PI) / 180) * 80
                                }}
                                animate={{ 
                                    scale: [1, 1.5, 1],
                                    opacity: [0.3, 1, 0.3]
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            >
                                <Sparkles className="w-4 h-4 text-orange-300" />
                            </motion.div>
                        </motion.div>
                    ))}
                </div>

                {/* Status Text */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h3 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-red-400 to-orange-500">
                        Weaving Your Story...
                    </h3>
                    
                    <motion.div 
                        className="text-orange-300 font-medium text-lg mb-10"
                        key={loadingStep}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        {loadingStep === 1 ? (
                            <span className="flex items-center justify-center gap-2">
                                <Feather className="w-5 h-5" />
                                Researching & Drafting Your Narrative...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <BookOpen className="w-5 h-5" />
                                Painting Vivid Historical Scenes...
                            </span>
                        )}
                    </motion.div>
                </motion.div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-10">
                    <motion.div
                        className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-600"
                        initial={{ width: "0%" }}
                        animate={{ 
                            width: loadingStep === 1 ? "45%" : "85%"
                        }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />
                </div>

                {/* Fun Fact Card */}
                <motion.div
                    className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-orange-400" />
                        <span className="text-xs uppercase tracking-widest text-orange-400 font-bold">
                            Did You Know?
                        </span>
                        <Sparkles className="w-5 h-5 text-orange-400" />
                    </div>
                    
                    <motion.p 
                        className="text-xl font-serif text-gray-100 leading-relaxed"
                        key={factIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.5 }}
                    >
                        {facts[factIndex]}
                    </motion.p>

                    {/* Shimmer Effect */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ 
                            duration: 2, 
                            repeat: Infinity, 
                            ease: "linear",
                            repeatDelay: 1 
                        }}
                    />
                </motion.div>

                {/* Loading Dots */}
                <div className="flex items-center justify-center gap-2 mt-8">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-2.5 h-2.5 bg-orange-400 rounded-full"
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.3, 1, 0.3]
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeInOut"
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
