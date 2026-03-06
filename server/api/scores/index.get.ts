import prisma from '#server/utils/prisma'
import { GameType } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const game = query.game as string | undefined

  if (!game) {
    throw createError({ statusCode: 400, message: 'El parámetro game es requerido' })
  }

  if (!Object.values(GameType).includes(game as GameType)) {
    throw createError({ statusCode: 400, message: 'Juego inválido' })
  }

  const raw = await prisma.score.findMany({
    where: { game: game as GameType },
    orderBy: { value: 'desc' },
    take: 100, // buffer 2× para dedup: máx 50 usuarios únicos
    select: {
      id: true,
      game: true,
      value: true,
      createdAt: true,
      userId: true,
      user: { select: { username: true } },
    },
  })

  // Un registro por usuario — clave simple porque game ya está fijo
  const seen = new Set<string>()
  const top: Omit<(typeof raw)[number], 'userId'>[] = []

  for (const { userId, ...score } of raw) {
    if (!seen.has(userId)) {
      seen.add(userId)
      top.push(score)
      if (top.length >= 50) break
    }
  }

  return { scores: top, fetchedAt: Date.now() }
})
