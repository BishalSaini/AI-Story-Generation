"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, Shield, Scroll, ArrowRight } from 'lucide-react';
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f0f12] text-white selection:bg-orange-500/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-400 to-red-600" />
          <span className="text-xl font-bold tracking-tight">VishwaHistory</span>
        </div>
        <div className="flex items-center gap-4">
          <SignedIn>
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition">Dashboard</Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-100 transition">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center pt-20 pb-32 px-4 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-8">
            <Shield size={12} />
            <span>Historical Fidelity & Safety First</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            Relive the Glory of<br />
            <span className="bg-gradient-to-r from-orange-400 via-white to-green-400 bg-clip-text text-transparent">Indian History</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A research-grade AI storytelling engine designed to counteract historical amnesia.
            Experience accurately generated stories, scene-based visualizations, and deep cultural context.
          </p>

          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <button className="group flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl font-semibold text-white shadow-lg shadow-orange-900/20 hover:scale-105 transition-all">
                Start Journey
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <button className="px-8 py-3 rounded-xl font-semibold text-gray-300 border border-white/10 hover:bg-white/5 transition">
              Read Methodology
            </button>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-32 w-full text-left">
          {[
            { title: "Fact-Grounded AI", desc: "Strict constraints ensuring no fictional events or hallucinations.", icon: <BookOpen className="text-orange-400" /> },
            { title: "Safe Visuals", desc: "Architecture and scene-based imagery. No generated faces of figures.", icon: <Shield className="text-blue-400" /> },
            { title: "Interactive Context", desc: "Timelines, maps, and moral learnings for deep engagement.", icon: <Scroll className="text-green-400" /> }
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition"
            >
              <div className="mb-4 p-3 rounded-lg bg-white/5 w-fit">{f.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="border-t border-white/10 py-12 text-center text-gray-600 text-sm">
        <p>© 2026 VishwaHistory Research. Powered by Gemini & Neon.</p>
      </footer>
    </div>
  );
}
