import { verifyToken } from '#server/utils/jwt'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, config.cookieName)

  if (!token) {
    event.context.user = null
    return
  }

  try {
    const payload = await verifyToken(token)
    event.context.user = payload
  } catch {
    event.context.user = null
    deleteCookie(event, config.cookieName)
  }
})
