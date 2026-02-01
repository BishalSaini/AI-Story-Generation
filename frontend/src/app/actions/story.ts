"use server";

import prisma from "@/lib/db";
import axios from "axios";

export async function generateAndSaveStory(
    userId: string,
    email: string,
    topic: string,
    era: string,
    style: string,
    storyType: string = "Historical"
) {
    try {
        // 1. Ensure User Exists
        let user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    clerkId: userId,
                    email: email,
                },
            });
        }

        // 2. Call FastAPI Backend for Logic
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const response = await axios.post(`${apiUrl}/generate`, {
            clerkId: userId,
            email: email,
            topic,
            era,
            style,
            storyType,
        });

        // 3. Save to Database (Prisma Frontend)
        const { story, images } = response.data;

        if (!story) throw new Error("No story returned from AI");

        const savedStory = await prisma.story.create({
            data: {
                userId: user.id,
                topic: story.topic,
                era: story.era,
                style: story.style,
                title: story.title,
                content: story.content,
                moral: story.moral,
                timeline: story.timeline ? JSON.parse(JSON.stringify(story.timeline)) : [],
                events: story.events ? JSON.parse(JSON.stringify(story.events)) : [],
                images: {
                    create: images.map((img: any) => ({
                        url: img.url,
                        prompt: img.prompt,
                        category: img.category || "Generated"
                    }))
                }
            },
            include: {
                images: true
            }
        });

        // 4. Return to component
        return { success: true, story: savedStory };

    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response) {
            console.error("Backend Error Details:", error.response.data);
            return { success: false, error: error.response.data.detail || error.message };
        }
        console.error("Story Generation Error:", error);
        return { success: false, error: error.message };
    }
}
