import prisma from '#server/utils/prisma'
import { RoomStatus } from '@prisma/client'
import { rooms } from '../../ws/rooms'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const gameKey = (query['game'] as string | undefined)?.toUpperCase()

  if (!gameKey) throw createError({ statusCode: 400, message: 'Juego inválido' })

  const game = await prisma.game.findUnique({ where: { key: gameKey } })
  if (!game) throw createError({ statusCode: 400, message: 'Juego inválido' })

  const dbRooms = await prisma.gameRoom.findMany({
    where: { gameId: game.id, status: RoomStatus.WAITING },
    include: {
      players: { include: { user: { select: { username: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const activeRooms = dbRooms.filter(r => {
    const wsRoom = rooms.get(r.id)
    return wsRoom !== undefined && wsRoom.size > 0
  })

  return { rooms: activeRooms }
})
