import prisma from '#server/utils/prisma'
import { GameType } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const body = await readBody<{ game: string; value: number }>(event)

  if (!body.game || !Object.values(GameType).includes(body.game as GameType)) {
    throw createError({ statusCode: 400, message: 'Juego inválido' })
  }
  if (!Number.isInteger(body.value) || body.value < 0) {
    throw createError({ statusCode: 400, message: 'Puntuación inválida' })
  }

  // Only save if it's a personal best
  const existing = await prisma.score.findFirst({
    where: { userId: user.userId, game: body.game as GameType },
    orderBy: { value: 'desc' },
  })

  if (existing && existing.value >= body.value) {
    return { score: existing }
  }

  const score = await prisma.score.create({
    data: {
      userId: user.userId,
      game: body.game as GameType,
      value: body.value,
    },
  })

  return { score }
})
