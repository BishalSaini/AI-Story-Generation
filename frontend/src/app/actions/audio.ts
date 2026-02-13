"use server";

import prisma from "@/lib/db";
import axios from "axios";

export async function generateAndSaveAudio(
    storyId: string,
    text: string,
    storyType: string,
    language: string = ""
) {
    try {
        // First check if audio already exists for this story
        const existingStory = await prisma.story.findUnique({
            where: { id: storyId },
            // @ts-ignore - audioUrl and audioAlignment added in recent migration
            select: { audioUrl: true, audioAlignment: true, audioLanguage: true }
        }) as any;

        // If audio already exists AND was generated with the same language, return cached version
        const cachedLang = existingStory?.audioLanguage || "English";
        const requestedLang = language || "English";

        if (existingStory?.audioUrl && existingStory?.audioAlignment && cachedLang === requestedLang) {
            return {
                success: true,
                audioUrl: existingStory.audioUrl,
                alignment: existingStory.audioAlignment,
                cached: true
            };
        }

        // If audio exists but was generated with a different language, clear it
        if (existingStory?.audioUrl && cachedLang !== requestedLang) {
            console.log(`Audio language mismatch: cached=${cachedLang}, requested=${requestedLang}. Regenerating...`);
            await prisma.story.update({
                where: { id: storyId },
                data: {
                    audioUrl: null,
                    audioAlignment: [],
                    audioLanguage: null,
                } as any
            });
        }

        // Generate new audio
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const response = await axios.post(`${apiUrl}/generate-audio`, {
            text,
            storyType,
            language
        });

        if (!response.data.audioUrl) {
            throw new Error("No audio URL returned");
        }

        // Save audio to database (including language used)
        await prisma.story.update({
            where: { id: storyId },
            data: {
                audioUrl: response.data.audioUrl,
                audioAlignment: response.data.alignment || [],
                audioLanguage: requestedLang,
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
