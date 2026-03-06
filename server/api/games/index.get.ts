import prisma from '#server/utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const navOnly = query['nav'] === 'true'

  const games = await prisma.game.findMany({
    where: { isActive: true, ...(navOnly ? { showInNav: true } : {}) },
    orderBy: { createdAt: 'asc' },
    select: { id: true, key: true, name: true, emoji: true, color: true, route: true, badge: true, description: true },
  })

  return { games }
})
