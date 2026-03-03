import prisma from '#server/utils/prisma'
import { GameType } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const game = query.game as string | undefined

  if (game && !Object.values(GameType).includes(game as GameType)) {
    throw createError({ statusCode: 400, message: 'Juego inválido' })
  }

  const scores = await prisma.score.findMany({
    where: game ? { game: game as GameType } : undefined,
    orderBy: [{ game: 'asc' }, { value: 'desc' }],
    take: 50,
    select: {
      id: true,
      game: true,
      value: true,
      createdAt: true,
      user: { select: { username: true } },
    },
  })

  return { scores }
})
