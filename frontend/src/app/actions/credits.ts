"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Credit costs configuration
export const CREDIT_COSTS = {
    STORY_GENERATION: 1,  // Cost per story generation
    SIGNUP_BONUS: 10,     // Initial credits on signup
};

/**
 * Get user's current credit balance
 */
export async function getUserCredits(clerkId: string): Promise<number> {
    try {
        const user = await prisma.user.findUnique({
            where: { clerkId },
            select: { credits: true },
        });
        return user?.credits ?? 0;
    } catch (error) {
        console.error("Error fetching user credits:", error);
        return 0;
    }
}

/**
 * Check if user has enough credits
 */
export async function hasEnoughCredits(
    clerkId: string,
    requiredCredits: number
): Promise<boolean> {
    const currentCredits = await getUserCredits(clerkId);
    return currentCredits >= requiredCredits;
}

/**
 * Deduct credits from user account
 */
export async function deductCredits(
    clerkId: string,
    amount: number,
    type: string,
    description?: string,
    storyId?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
        // Get user
        const user = await prisma.user.findUnique({
            where: { clerkId },
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        // Check if user has enough credits
        if (user.credits < amount) {
            return {
                success: false,
                error: `Insufficient credits. You have ${user.credits} credits but need ${amount}.`
            };
        }

        // Deduct credits and create transaction record
        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Update user credits
            const updatedUser = await tx.user.update({
                where: { clerkId },
                data: { credits: { decrement: amount } },
            });

            // Create transaction record
            await tx.creditTransaction.create({
                data: {
                    userId: user.id,
                    amount: -amount, // Negative for deduction
                    type,
                    description,
                    storyId,
                    balanceAfter: updatedUser.credits,
                },
            });

            return updatedUser.credits;
        });

        return { success: true, newBalance: result };
    } catch (error) {
        console.error("Error deducting credits:", error);
        return { success: false, error: "Failed to deduct credits" };
    }
}

/**
 * Add credits to user account
 */
export async function addCredits(
    clerkId: string,
    amount: number,
    type: string,
    description?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
        // Get user
        const user = await prisma.user.findUnique({
            where: { clerkId },
        });

        if (!user) {
            return { success: false, error: "User not found" };
        }

        // Add credits and create transaction record
        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Update user credits
            const updatedUser = await tx.user.update({
                where: { clerkId },
                data: { credits: { increment: amount } },
            });

            // Create transaction record
            await tx.creditTransaction.create({
                data: {
                    userId: user.id,
                    amount, // Positive for addition
                    type,
                    description,
                    balanceAfter: updatedUser.credits,
                },
            });

            return updatedUser.credits;
        });

        return { success: true, newBalance: result };
    } catch (error) {
        console.error("Error adding credits:", error);
        return { success: false, error: "Failed to add credits" };
    }
}

/**
 * Get user's credit transaction history
 */
export async function getCreditHistory(clerkId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { clerkId },
            include: {
                creditTransactions: {
                    orderBy: { createdAt: "desc" },
                    take: 50, // Last 50 transactions
                },
            },
        });

        return user?.creditTransactions ?? [];
    } catch (error) {
        console.error("Error fetching credit history:", error);
        return [];
    }
}

/**
 * Initialize user with signup bonus credits
 */
export async function initializeUserCredits(
    clerkId: string,
    email: string
): Promise<{ success: boolean; credits?: number; error?: string }> {
    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { clerkId },
        });

        if (existingUser) {
            return { success: true, credits: existingUser.credits };
        }

        // Create user with initial credits
        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const newUser = await tx.user.create({
                data: {
                    clerkId,
                    email,
                    credits: CREDIT_COSTS.SIGNUP_BONUS,
                },
            });

            // Create transaction record for signup bonus
            await tx.creditTransaction.create({
                data: {
                    userId: newUser.id,
                    amount: CREDIT_COSTS.SIGNUP_BONUS,
                    type: "SIGNUP_BONUS",
                    description: "Welcome bonus - Free credits on signup!",
                    balanceAfter: CREDIT_COSTS.SIGNUP_BONUS,
                },
            });

            return newUser.credits;
        });

        return { success: true, credits: result };
    } catch (error) {
        console.error("Error initializing user credits:", error);
        return { success: false, error: "Failed to initialize credits" };
    }
}
