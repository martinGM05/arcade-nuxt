import prisma from '#server/utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const gameKey = (query.game as string | undefined)?.toUpperCase()

  if (!gameKey) {
    throw createError({ statusCode: 400, message: 'El parámetro game es requerido' })
  }

  const game = await prisma.game.findUnique({ where: { key: gameKey } })
  if (!game) throw createError({ statusCode: 400, message: 'Juego inválido' })
  if (!game.isActive) throw createError({ statusCode: 400, message: 'Juego no disponible' })

  const raw = await prisma.score.findMany({
    where: { gameId: game.id },
    orderBy: { value: 'desc' },
    take: 100,
    select: { id: true, value: true, createdAt: true, userId: true, user: { select: { username: true } } },
  })

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
