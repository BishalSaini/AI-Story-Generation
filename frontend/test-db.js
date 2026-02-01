const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
    try {
        console.log('Testing database connection...');
        await prisma.$connect();
        console.log('✅ Database connected successfully!');

        const userCount = await prisma.user.count();
        console.log(`Found ${userCount} users in database`);

        await prisma.$disconnect();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();
