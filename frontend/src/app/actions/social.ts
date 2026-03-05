"use server";

import prisma from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

// --- Story Publishing ---

export async function togglePublishStory(storyId: string) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
    });

    if (!dbUser) return { success: false, error: "User not found" };

    const story = await prisma.story.findUnique({
        where: { id: storyId },
    });

    if (!story) return { success: false, error: "Story not found" };

    if (story.userId !== dbUser.id) {
        return { success: false, error: "You do not own this story" };
    }

    const newStatus = !story.isPublic;

    // Sync user details if needed
    if (newStatus && (!dbUser.name || !dbUser.image)) {
        await prisma.user.update({
            where: { id: dbUser.id },
            data: {
                name: user.firstName ? `${user.firstName} ${user.lastName || ""}` : dbUser.name,
                image: user.imageUrl || dbUser.image
            }
        });
    }

    await prisma.story.update({
        where: { id: storyId },
        data: {
            isPublic: newStatus,
            publishedAt: newStatus ? new Date() : story.publishedAt
        },
    });

    revalidatePath("/dashboard");
    revalidatePath("/community");
    revalidatePath(`/story/${storyId}`);

    return { success: true, isPublic: newStatus };
}

// --- Likes ---

export async function toggleLikeStory(storyId: string) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } });
    if (!dbUser) return { success: false, error: "User not found" };

    const existingLike = await prisma.like.findUnique({
        where: {
            userId_storyId: {
                userId: dbUser.id,
                storyId: storyId,
            },
        },
    });

    if (existingLike) {
        await prisma.like.delete({
            where: { id: existingLike.id },
        });
    } else {
        await prisma.like.create({
            data: {
                userId: dbUser.id,
                storyId: storyId,
            },
        });
    }

    revalidatePath(`/story/${storyId}`);
    revalidatePath("/community");

    return { success: true, liked: !existingLike };
}

// --- Comments ---

export async function addComment(storyId: string, content: string) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };
    if (!content.trim()) return { success: false, error: "Comment cannot be empty" };

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } });
    if (!dbUser) return { success: false, error: "User not found" };

    // Update user info if missing
    if (!dbUser.name || !dbUser.image) {
        await prisma.user.update({
            where: { id: dbUser.id },
            data: {
                name: user.firstName ? `${user.firstName} ${user.lastName || ""}` : dbUser.name,
                image: user.imageUrl || dbUser.image
            }
        });
    }

    const comment = await prisma.comment.create({
        data: {
            content,
            userId: dbUser.id,
            storyId,
        },
        include: {
            user: {
                select: { name: true, image: true }
            }
        }
    });

    revalidatePath(`/story/${storyId}`);
    return { success: true, comment };
}

export async function getComments(storyId: string) {
    return await prisma.comment.findMany({
        where: { storyId },
        include: {
            user: {
                select: { name: true, image: true, id: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });
}

// --- Feed ---

export async function getPublicFeed(page: number = 1, limit: number = 10, sortBy: "recent" | "popular" = "recent") {
    const skip = (page - 1) * limit;

    const orderBy = sortBy === "recent"
        ? { publishedAt: "desc" }
        : { likes: { _count: "desc" } };

    const stories = await prisma.story.findMany({
        where: { isPublic: true },
        include: {
            user: {
                select: { name: true, image: true, id: true }
            },
            _count: {
                select: { likes: true, comments: true }
            },
            likes: {
                select: { userId: true }
            },
            images: {
                take: 1
            }
        },
        orderBy: orderBy as any,
        skip,
        take: limit,
    });

    const total = await prisma.story.count({ where: { isPublic: true } });

    return { stories, total, pages: Math.ceil(total / limit) };
}

// --- Profile ---

export async function getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            stories: {
                where: { isPublic: true },
                include: {
                    _count: { select: { likes: true, comments: true } },
                    images: { take: 1 }
                },
                orderBy: { publishedAt: "desc" }
            },
            _count: {
                select: { stories: true, likes: true }
            }
        }
    });

    if (!user) return null;

    // Calculate total likes received across all public stories
    const storiesWithLikes = await prisma.story.findMany({
        where: { userId: user.id, isPublic: true },
        include: { _count: { select: { likes: true } } }
    });

    const totalLikesReceived = storiesWithLikes.reduce((acc, story) => acc + story._count.likes, 0);

    return { ...user, totalLikesReceived };
}

export async function incrementViewCount(storyId: string) {
    // Fire and forget, don't await blocking usually, but here we await
    await prisma.story.update({
        where: { id: storyId },
        data: { viewCount: { increment: 1 } }
    });
}

export async function forkStory(storyId: string) {
    const user = await currentUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } });
    if (!dbUser) return { success: false, error: "User not found" };

    const originalStory = await prisma.story.findUnique({
        where: { id: storyId },
        include: { images: true }
    });

    if (!originalStory) return { success: false, error: "Story not found" };

    // Create the forked story (Remix)
    const forkedStory = await prisma.story.create({
        data: {
            userId: dbUser.id,
            title: `${originalStory.title} (Remix)`,
            content: originalStory.content,
            topic: originalStory.topic,
            era: originalStory.era,
            style: originalStory.style,
            moral: originalStory.moral,
            timeline: originalStory.timeline ?? undefined,
            events: originalStory.events ?? undefined,
            forkedFromId: originalStory.id,
            // We duplicate the images for the new story so they are preserved
            images: {
                create: originalStory.images.map(img => ({
                    url: img.url,
                    prompt: img.prompt,
                    category: img.category
                }))
            }
        }
    });

    revalidatePath("/dashboard");
    return { success: true, storyId: forkedStory.id };
}
