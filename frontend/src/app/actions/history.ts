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
                        isPublic: true,
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
                images: true,
                user: {
                    select: {
                        name: true,
                        image: true,
                        id: true
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });

        return story;
    } catch (error) {
        console.error("Error fetching story:", error);
        return null;
    }
}

export async function deleteStory(storyId: string, userId: string) {
    try {
        // First verify the story belongs to the user
        const story = await prisma.story.findUnique({
            where: { id: storyId },
            select: { userId: true }
        });

        if (!story) {
            return { success: false, error: "Story not found" };
        }

        // Check if the user owns this story
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            select: { id: true }
        });

        if (!user || story.userId !== user.id) {
            return { success: false, error: "Unauthorized: You can only delete your own stories" };
        }

        // Delete the story (cascade will delete related images, comments, likes)
        await prisma.story.delete({
            where: { id: storyId }
        });

        return { success: true };
    } catch (error: any) {
        console.error("Error deleting story:", error);
        return { success: false, error: error.message };
    }
}
