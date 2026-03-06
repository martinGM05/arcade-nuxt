import prisma from '#server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, message: 'No autenticado' })

  const body = await readBody<{ game: string }>(event)
  const gameKey = body.game?.toUpperCase()

  if (!gameKey) throw createError({ statusCode: 400, message: 'Juego inválido' })

  const game = await prisma.game.findUnique({ where: { key: gameKey } })
  if (!game) throw createError({ statusCode: 400, message: 'Juego inválido' })
  if (!game.isActive) throw createError({ statusCode: 400, message: 'Juego no disponible' })

  const room = await prisma.gameRoom.create({
    data: {
      gameId: game.id,
      hostId: user.userId,
      players: {
        create: { userId: user.userId, playerSlot: 0 },
      },
    },
    include: { players: { include: { user: { select: { username: true } } } } },
  })

  return { room }
})
