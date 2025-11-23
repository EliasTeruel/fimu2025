import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

console.log('🔧 [Prisma] Inicializando cliente...')
console.log('🔧 [Prisma] DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...')

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  console.log('✅ [Prisma] Cliente configurado para desarrollo')
}
