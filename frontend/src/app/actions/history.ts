"use server";

import prisma from "@/lib/db";

export async function getUserStories(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            include: {
                stories: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 10, // Limit to last 10 stories
                    select: {
                        id: true,
                        title: true,
                        topic: true,
                        era: true,
                        createdAt: true,
                    }
                }
            }
        });

        return user?.stories || [];
    } catch (error) {
        console.error("Error fetching user stories:", error);
        return [];
    }
}

export async function getStoryById(storyId: string) {
    try {
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            include: {
                images: true
            }
        });

        return story;
    } catch (error) {
        console.error("Error fetching story:", error);
        return null;
    }
}
