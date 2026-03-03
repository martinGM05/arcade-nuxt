import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var _prismaPool: Pool | undefined
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined
}

function createPrisma(): PrismaClient {
  const pool = globalThis._prismaPool ?? new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://arcade:arcadepass@localhost:5432/arcade_dev',
  })
  globalThis._prismaPool = pool
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])
}

const prisma: PrismaClient = globalThis._prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') {
  globalThis._prisma = prisma
}

export default prisma
