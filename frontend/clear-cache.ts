import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAudioCache() {
    try {
        const result = await prisma.story.updateMany({
            data: {
                audioUrl: null,
                audioAlignment: null
            }
        });
        console.log(`✅ Cleared audio cache for ${result.count} stories`);
    } catch (error) {
        console.error('Error clearing cache:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearAudioCache();
