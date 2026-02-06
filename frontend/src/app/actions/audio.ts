"use server";

import prisma from "@/lib/db";
import axios from "axios";

export async function generateAndSaveAudio(
    storyId: string,
    text: string,
    storyType: string
) {
    try {
        // First check if audio already exists for this story
        const existingStory = await prisma.story.findUnique({
            where: { id: storyId },
            // @ts-ignore - audioUrl and audioAlignment added in recent migration
            select: { audioUrl: true, audioAlignment: true }
        }) as any;

        // If audio already exists, return it
        if (existingStory?.audioUrl && existingStory?.audioAlignment) {
            return {
                success: true,
                audioUrl: existingStory.audioUrl,
                alignment: existingStory.audioAlignment,
                cached: true
            };
        }

        // Generate new audio
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const response = await axios.post(`${apiUrl}/generate-audio`, {
            text,
            storyType
        });

        if (!response.data.audioUrl) {
            throw new Error("No audio URL returned");
        }

        // Save audio to database
        await prisma.story.update({
            where: { id: storyId },
            data: {
                audioUrl: response.data.audioUrl,
                audioAlignment: response.data.alignment || []
            } as any
        });

        return {
            success: true,
            audioUrl: response.data.audioUrl,
            alignment: response.data.alignment,
            cached: false
        };
    } catch (error: any) {
        console.error("Audio Generation Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getStoredAudio(storyId: string) {
    try {
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            // @ts-ignore - audioUrl and audioAlignment added in recent migration
            select: { audioUrl: true, audioAlignment: true }
        }) as any;

        if (story?.audioUrl && story?.audioAlignment) {
            return {
                success: true,
                audioUrl: story.audioUrl,
                alignment: story.audioAlignment
            };
        }

        return { success: false, error: "No audio found" };
    } catch (error: any) {
        console.error("Error fetching audio:", error);
        return { success: false, error: error.message };
    }
}
