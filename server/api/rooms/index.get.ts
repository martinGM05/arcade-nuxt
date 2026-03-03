import prisma from '#server/utils/prisma'
import { GameType, RoomStatus } from '@prisma/client'
import { rooms } from '../../ws/rooms'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const game = (query['game'] as string | undefined)?.toUpperCase()

  if (!game || !Object.values(GameType).includes(game as GameType)) {
    throw createError({ statusCode: 400, message: 'Juego inválido' })
  }

  const dbRooms = await prisma.gameRoom.findMany({
    where: { game: game as GameType, status: RoomStatus.WAITING },
    include: {
      players: { include: { user: { select: { username: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  // Only return rooms with at least one active WS connection right now
  const activeRooms = dbRooms.filter(r => {
    const wsRoom = rooms.get(r.id)
    return wsRoom !== undefined && wsRoom.size > 0
  })

  return { rooms: activeRooms }
})
