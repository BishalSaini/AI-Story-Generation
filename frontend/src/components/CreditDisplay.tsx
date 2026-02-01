"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getUserCredits } from "@/app/actions/credits";
import { Coins } from "lucide-react";

export default function CreditDisplay() {
    const { user } = useUser();
    const [credits, setCredits] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCredits() {
            if (user?.id) {
                setLoading(true);
                const userCredits = await getUserCredits(user.id);
                setCredits(userCredits);
                setLoading(false);
            }
        }
        fetchCredits();
    }, [user]);

    // Function to refresh credits (can be called from parent)
    const refreshCredits = async () => {
        if (user?.id) {
            const userCredits = await getUserCredits(user.id);
            setCredits(userCredits);
        }
    };

    // Expose refresh function to parent via ref if needed
    useEffect(() => {
        // @ts-ignore - attach to window for easy access
        window.refreshCredits = refreshCredits;
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg border border-emerald-500/20">
                <Coins className="w-5 h-5 text-emerald-400 animate-pulse" />
                <span className="text-sm text-gray-400">Loading...</span>
            </div>
        );
    }

    const creditColor = credits === null || credits === 0
        ? "text-red-400"
        : credits <= 3
            ? "text-yellow-400"
            : "text-emerald-400";

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
            <Coins className={`w-5 h-5 ${creditColor}`} />
            <div className="flex flex-col">
                <span className={`text-lg font-bold ${creditColor}`}>
                    {credits ?? 0}
                </span>
                <span className="text-xs text-gray-500">Credits</span>
            </div>
        </div>
    );
}
