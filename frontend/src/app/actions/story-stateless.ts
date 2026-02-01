"use server";

import axios from "axios";
import { hasEnoughCredits, deductCredits, CREDIT_COSTS } from "./credits";

// STATELESS VERSION - No database required
export async function generateAndSaveStory(
    userId: string,
    email: string,
    topic: string,
    era: string,
    style: string,
    storyType: string = "Historical"
) {
    try {
        // 1. Check if user has enough credits
        const hasCredits = await hasEnoughCredits(userId, CREDIT_COSTS.STORY_GENERATION);
        if (!hasCredits) {
            return {
                success: false,
                error: `Insufficient credits. You need ${CREDIT_COSTS.STORY_GENERATION} credit(s) to generate a story.`
            };
        }

        // 2. Call FastAPI Backend for AI Generation
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const response = await axios.post(`${apiUrl}/generate`, {
            clerkId: userId,
            email: email,
            topic,
            era,
            style,
            storyType,
        });

        // 3. Return the generated story directly (no database save)
        const { story, images } = response.data;

        if (!story) throw new Error("No story returned from AI");

        // 4. Deduct credits after successful generation
        const deductResult = await deductCredits(
            userId,
            CREDIT_COSTS.STORY_GENERATION,
            "STORY_GENERATION",
            `Generated story: ${story.title}`,
            undefined // storyId - not available in stateless mode
        );

        if (!deductResult.success) {
            console.error("Failed to deduct credits:", deductResult.error);
            // Continue anyway since story was generated
        }

        // 5. Return story with images and updated credit balance
        return {
            success: true,
            story: {
                ...story,
                images: images,
                timeline: story.timeline || [],
                events: story.events || []
            },
            creditsRemaining: deductResult.newBalance
        };

    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response) {
            console.error("Backend Error Details:", error.response.data);
            return { success: false, error: error.response.data.detail || error.message };
        }
        console.error("Story Generation Error:", error);
        return { success: false, error: error.message };
    }
}
