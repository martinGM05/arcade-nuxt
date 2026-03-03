import prisma from '#server/utils/prisma'
import { GameType } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const body = await readBody<{ game: string }>(event)
  const game = body.game?.toUpperCase()

  if (!game || !Object.values(GameType).includes(game as GameType)) {
    throw createError({ statusCode: 400, message: 'Juego inválido' })
  }

  const room = await prisma.gameRoom.create({
    data: {
      game: game as GameType,
      hostId: user.userId,
      players: {
        create: { userId: user.userId, playerSlot: 0 },
      },
    },
    include: { players: { include: { user: { select: { username: true } } } } },
  })

  return { room }
})
