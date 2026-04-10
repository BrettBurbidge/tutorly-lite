import { DATABASE_URL } from '$env/static/private';
import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

function createPrismaClient() {
	const pool = new Pool({ connectionString: DATABASE_URL });
	const adapter = new PrismaPg(pool);
	return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = prisma;
}

export type { PrismaClient };
