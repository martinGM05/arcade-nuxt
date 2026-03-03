import prisma from '#server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requerido' })

  const room = await prisma.gameRoom.findUnique({
    where: { id },
    include: { players: { include: { user: { select: { username: true } } } } },
  })

  if (!room) throw createError({ statusCode: 404, message: 'Sala no encontrada' })

  return { room }
})
