"use server";

import { stripe } from "@/lib/stripe";
import { addCredits } from "./credits";
import { sendEmail } from "@/lib/mail";
import { headers } from "next/headers";
// redirect removed

// Define Plans with INR prices
const PLANS: any = {
    'Explorer': {
        name: 'Explorer Plan',
        price: 499, // INR
        credits: 100,
    },
    'Time Traveler': {
        name: 'Time Traveler Plan',
        price: 1499, // INR
        credits: 500,
    }
};

export async function createCheckoutSession(userId: string, userEmail: string, planName: string) {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("Stripe is not configured");
    }

    const plan = PLANS[planName];
    if (!plan) throw new Error("Invalid plan");

    const headersList = await headers();
    const origin = headersList.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'inr',
                    product_data: {
                        name: `${plan.name} - ${plan.credits} Credits`,
                        description: `Get ${plan.credits} AI credits for story generation.`,
                    },
                    unit_amount: plan.price * 100, // Amount in paise
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/`,
        customer_email: userEmail,
        client_reference_id: userId,
        billing_address_collection: 'required', // Required for Indian regulations
        metadata: {
            userId,
            planName,
            credits: plan.credits.toString()
        },
    });

    if (!session.url) throw new Error("Failed to create session");

    return { url: session.url };
}

export async function verifyStripeSession(sessionId: string) {
    if (!sessionId.startsWith('cs_')) {
        return { success: false, error: "Invalid Session ID" };
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            const userId = session.client_reference_id;
            const credits = Number(session.metadata?.credits || 0);
            const planName = session.metadata?.planName || "Unknown Plan";
            const email = session.customer_details?.email || session.customer_email;

            if (!userId || !credits) {
                return { success: false, error: "Missing metadata in session" };
            }

            // Ideally check if transaction already processed to avoid duplicates (idempotency)
            // For now, we rely on the specific flow. In production, check Transaction DB by session.id

            // Add Credits
            const result = await addCredits(
                userId,
                credits,
                'PURCHASE',
                `Purchased ${planName} (Session: ${sessionId})`
            );

            if (result.success) {
                // Send Receipt Email
                if (email) {
                    await sendEmail({
                        to: email,
                        subject: "Payment Successful - StoryNest",
                        text: `Thank you for your purchase!\n\nYou have successfully purchased the ${planName}.\n${credits} credits have been added to your account.\n\nTransaction ID: ${sessionId}\n\nStart creating stories now!`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px;">
                                <h1 style="color: #ea580c;">Payment Successful!</h1>
                                <p>Thank you for your purchase.</p>
                                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <p><strong>Plan:</strong> ${planName}</p>
                                    <p><strong>Credits Added:</strong> ${credits}</p>
                                    <p><strong>Amount Paid:</strong> ₹${PLANS[planName].price}</p>
                                </div>
                                <p>Your creative journey awaits.</p>
                                <a href="${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/dashboard" style="background: #ea580c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
                            </div>
                        `
                    });
                }
                return { success: true, credits, planName };
            } else {
                return { success: false, error: "Failed to add credits" };
            }
        } else {
            return { success: false, error: "Payment not completed" };
        }
    } catch (error) {
        console.error("Verification error:", error);
        return { success: false, error: "Verification failed " + String(error) };
    }
}
