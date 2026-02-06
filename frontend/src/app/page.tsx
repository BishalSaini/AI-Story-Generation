"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, Shield, Scroll, ArrowRight, Check, Coins, Zap, Star, Loader2, Sparkles, Feather, Globe, Mic, MessageSquare, History, Play } from 'lucide-react';
import { UserButton, SignedIn, SignedOut, SignInButton, useUser } from '@clerk/nextjs';
import { addCredits } from './actions/credits';
import { createCheckoutSession } from './actions/payment';
import { useState } from 'react';

export default function Home() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  // Free Plan Logic (Test Mode Credits)
  const handleFreeCredits = async () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      alert("Please sign in to claim credits.");
      return;
    }
    setProcessingPlan('Novice');
    try {
      // Just give 10 credits for free
      const res = await addCredits(user.id, 10, 'FREE_TIER', `Free Tier Claim`);
      if (res.success) {
        alert(`🎉 Success! Added 10 credits to your account.`);
      } else {
        alert("Failed to add credits. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
    } finally {
      setProcessingPlan(null);
    }
  };

  // Paid Plan Logic (Stripe)
  const handlePurchase = async (planName: string) => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      alert("Please sign in to purchase.");
      return;
    }

    setProcessingPlan(planName);
    try {
      const email = user.primaryEmailAddress?.emailAddress || "";
      const result = await createCheckoutSession(user.id, email, planName);

      if (result.url) {
        window.location.href = result.url;
      } else {
        alert("Could not create checkout session.");
        setProcessingPlan(null);
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error?.message?.includes("Stripe is not configured")
        ? "Stripe API keys are missing. Please add them to .env"
        : "Payment initialization failed.";
      alert(errorMessage);
      setProcessingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f12] text-white selection:bg-orange-500/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto sticky top-0 z-50 backdrop-blur-md bg-[#0f0f12]/80 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-red-600 to-purple-700 flex items-center justify-center shadow-lg shadow-orange-900/20">
            <Feather size={20} className="text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">StoryNest</span>
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

      <main className="flex flex-col items-center">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center pt-24 pb-32 px-4 text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-8">
              <Sparkles size={12} />
              <span>AI-Powered Infinite Storytelling</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.95]">
              <span className="bg-gradient-to-r from-white via-white to-white/30 bg-clip-text text-transparent">THE FUTURE OF</span><br />
              <span className="bg-gradient-to-r from-orange-400 via-red-500 to-purple-600 bg-clip-text text-transparent tracking-widest italic uppercase">Narrative</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 font-medium tracking-tight leading-relaxed">
              Unleash the infinite power of AI to weave cinematic masterpieces.
              From the echoes of ancient myths to the neon pulse of the future—your imagination, perfected.
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
              { title: "Multi-Genre Magic", desc: "Craft Historical, Sci-Fi, Mystery, Mythology, or Creative Fiction with a single click.", icon: <Globe className="text-orange-400" /> },
              { title: "Cinematic AI Art", desc: "Breathtaking scene-based visualizations tailored to your story's specific era and mood.", icon: <Sparkles className="text-purple-400" /> },
              { title: "Interactive Personas", desc: "Go beyond reading. Chat with characters from your story in an immersive AI environment.", icon: <MessageSquare className="text-blue-400" /> }
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-orange-500/30 transition-all group scale-100 hover:scale-[1.02]"
              >
                <div className="mb-6 p-4 rounded-2xl bg-white/5 w-fit group-hover:bg-orange-500/10 transition-colors">{f.icon}</div>
                <h3 className="text-2xl font-bold mb-3">{f.title}</h3>
                <p className="text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Beyond Words Section */}
        <section className="w-full py-24 px-8 bg-gradient-to-b from-transparent to-white/[0.02]">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8 text-left"
            >
              <h2 className="text-4xl md:text-5xl font-bold leading-tight uppercase tracking-tight">
                Experience Stories<br />
                <span className="text-orange-500 bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent italic">Beyond Words</span>
              </h2>
              <div className="space-y-6">
                {[
                  { title: "AI Audio Narration", desc: "Listen to your stories with studio-quality AI voices tailored to the genre.", icon: <Mic className="text-orange-500" /> },
                  { title: "Dynamic Timelines", desc: "Interactive chronology tracking key events and character arcs.", icon: <History className="text-orange-500" /> },
                  { title: "Cultural Insights", desc: "Learn the moral and historical significance of every narrative.", icon: <Scroll className="text-orange-500" /> }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="mt-1 flex-shrink-0">{item.icon}</div>
                    <div>
                      <h4 className="font-bold text-lg">{item.title}</h4>
                      <p className="text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square rounded-[3rem] bg-gradient-to-br from-orange-600/20 via-transparent to-purple-600/20 border border-white/10 flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                <div className="flex flex-col items-center gap-4 text-center p-12">
                  <div className="w-24 h-24 rounded-full bg-orange-600 flex items-center justify-center shadow-2xl shadow-orange-600/50 group-hover:scale-110 transition-transform cursor-pointer">
                    <Play fill="white" size={32} />
                  </div>
                  <h3 className="text-2xl font-bold mt-4">Immersive Playback</h3>
                  <p className="text-gray-400">Word-by-word highlighting synced with AI narration for an unrivaled reading experience.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pricing / Plans Section */}
        <section className="w-full py-24 bg-[#0f0f12] relative overflow-hidden">
          {/* Subtle Background Elements */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Choose Your Path
            </h2>
            <p className="text-gray-400 mb-16 max-w-2xl mx-auto">
              Unlock the full potential of historical storytelling. Select a plan that suits your journey through time.
            </p>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Plan 1: Free */}
              <div className="border border-white/10 bg-white/5 rounded-2xl p-8 hover:border-orange-500/30 transition-all hover:transform hover:-translate-y-2 flex flex-col">
                <div className="mb-6">
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <BookOpen size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Novice</h3>
                  <div className="text-3xl font-bold text-white mb-1">Free</div>
                  <p className="text-gray-500 text-xs">Forever free</p>
                </div>
                <ul className="space-y-3 text-sm text-gray-300 text-left mb-8 flex-1">
                  <li className="flex items-center gap-2"><Check size={14} className="text-orange-500" /> 5 Stories per day</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-orange-500" /> Standard Generation Speed</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-orange-500" /> Basic Timeline</li>
                </ul>
                <button
                  onClick={handleFreeCredits}
                  disabled={processingPlan === 'Novice'}
                  className="w-full py-3 rounded-lg border border-white/20 hover:bg-white/5 transition font-medium flex justify-center items-center gap-2"
                >
                  {processingPlan === 'Novice' && <Loader2 className="animate-spin" size={16} />}
                  Claim Free Credits
                </button>
              </div>

              {/* Plan 2: Explorer (INR) */}
              <div className="border border-orange-500/50 bg-gradient-to-b from-orange-900/10 to-[#121215] rounded-2xl p-8 relative flex flex-col transform md:-translate-y-4 shadow-2xl shadow-orange-900/20">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-600 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full tracking-wider">
                  Recommended
                </div>
                <div className="mb-6">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-orange-600/30">
                    <Zap size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white">Explorer</h3>
                  <div className="text-3xl font-bold text-white mb-1">₹499<span className="text-base font-normal text-gray-400">/mo</span></div>
                  <p className="text-gray-500 text-xs">For avid learners</p>
                </div>
                <ul className="space-y-3 text-sm text-gray-300 text-left mb-8 flex-1">
                  <li className="flex items-center gap-2"><Check size={14} className="text-orange-500" /> 50 Stories per day</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-orange-500" /> Fast Generation</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-orange-500" /> HD Visuals</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-orange-500" /> Audio Narration</li>
                </ul>
                <button
                  onClick={() => handlePurchase('Explorer')}
                  disabled={!!processingPlan}
                  className="w-full py-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-lg shadow-orange-900/30 transition flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {processingPlan === 'Explorer' && <Loader2 className="animate-spin" size={16} />}
                  {processingPlan === 'Explorer' ? "Processing..." : "Get 100 Credits"}
                </button>
              </div>

              {/* Plan 3: Time Traveler (INR) */}
              <div className="border border-white/10 bg-white/5 rounded-2xl p-8 hover:border-blue-500/30 transition-all hover:transform hover:-translate-y-2 flex flex-col">
                <div className="mb-6">
                  <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4 text-blue-400">
                    <Star size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Time Traveler</h3>
                  <div className="text-3xl font-bold text-white mb-1">₹1499<span className="text-base font-normal text-gray-400">/mo</span></div>
                  <p className="text-gray-500 text-xs">For power users</p>
                </div>
                <ul className="space-y-3 text-sm text-gray-300 text-left mb-8 flex-1">
                  <li className="flex items-center gap-2"><Check size={14} className="text-blue-400" /> Unlimited Stories</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-blue-400" /> Priority Server Access</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-blue-400" /> 4K Image Generation</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-blue-400" /> Early Access Features</li>
                </ul>
                <button
                  onClick={() => handlePurchase('Time Traveler')}
                  disabled={!!processingPlan}
                  className="w-full py-3 rounded-lg border border-white/20 hover:bg-white/5 transition font-medium flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {processingPlan === 'Time Traveler' && <Loader2 className="animate-spin" size={16} />}
                  {processingPlan === 'Time Traveler' ? "Processing..." : "Get 500 Credits"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-16 bg-[#0a0a0c]">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center">
              <Feather size={16} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tighter text-white">StoryNest</span>
          </div>

          <p className="text-gray-500 text-sm">
            © 2026 StoryNest AI | Developed by <span className="text-gray-400 font-medium tracking-tight">Vipul Patil</span>
          </p>


        </div>
      </footer>
    </div>
  );
}
