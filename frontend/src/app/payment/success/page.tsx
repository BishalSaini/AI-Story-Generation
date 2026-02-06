"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyStripeSession } from '@/app/actions/payment';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';

function SuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get('session_id');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState("Verifying your payment...");

    useEffect(() => {
        if (!sessionId) {
            setStatus('error');
            setMessage("No Session ID found.");
            return;
        }

        // Verify session
        verifyStripeSession(sessionId)
            .then((res) => {
                if (res.success) {
                    setStatus('success');
                    setMessage(`Payment Successful! You have received ${res.credits} credits.`);
                    // Refresh credits in background if possible or just let dashboard handle it
                } else {
                    setStatus('error');
                    setMessage(res.error || "Payment verification failed.");
                }
            })
            .catch((err) => {
                setStatus('error');
                setMessage("An unexpected error occurred.");
                console.error(err);
            });
    }, [sessionId]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
            <div className="bg-[#15151a] p-8 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full">
                {status === 'loading' && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
                        <h2 className="text-xl font-bold text-white">Processing Payment</h2>
                        <p className="text-gray-400">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Success!</h2>
                        <p className="text-gray-300">{message}</p>
                        <p className="text-sm text-gray-500">A receipt has been sent to your email.</p>
                        <Link href="/dashboard">
                            <button className="mt-6 px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-lg text-white font-bold transition w-full">
                                Go to Dashboard
                            </button>
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                            <XCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Something went wrong</h2>
                        <p className="text-red-400">{message}</p>
                        <Link href="/">
                            <button className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition w-full">
                                Return Home
                            </button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <div className="min-h-screen bg-[#0f0f12] text-white flex flex-col items-center justify-center">
            <Suspense fallback={<Loader2 className="animate-spin" />}>
                <SuccessContent />
            </Suspense>
        </div>
    );
}
