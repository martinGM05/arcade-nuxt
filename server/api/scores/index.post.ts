import prisma from '#server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const body = await readBody<{ game: string; value: number }>(event)

  if (!body.game) throw createError({ statusCode: 400, message: 'Juego inválido' })
  if (!Number.isInteger(body.value) || body.value < 0) {
    throw createError({ statusCode: 400, message: 'Puntuación inválida' })
  }

  const game = await prisma.game.findUnique({ where: { key: body.game.toUpperCase() } })
  if (!game) throw createError({ statusCode: 400, message: 'Juego inválido' })
  if (!game.isActive) throw createError({ statusCode: 400, message: 'Juego no disponible' })

  const existing = await prisma.score.findFirst({
    where: { userId: user.userId, gameId: game.id },
    orderBy: { value: 'desc' },
  })

  if (existing && existing.value >= body.value) {
    return { score: existing }
  }

  const score = await prisma.score.create({
    data: { userId: user.userId, gameId: game.id, value: body.value },
  })

  return { score }
})
