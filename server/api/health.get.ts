import prisma from '#server/utils/prisma'

export default defineEventHandler(async () => {
  let db: 'ok' | 'error' = 'ok'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    db = 'error'
  }

  const status = db === 'ok' ? 200 : 503
  setResponseStatus(useEvent(), status)

  return {
    status: db === 'ok' ? 'ok' : 'degraded',
    db,
    uptime: Math.floor(process.uptime()),
    ts: new Date().toISOString(),
  }
})
