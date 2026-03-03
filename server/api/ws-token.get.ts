import { signToken } from '#server/utils/jwt'

export default defineEventHandler(async (event) => {
  const user = event.context.user
  if (!user) {
    throw createError({ statusCode: 401, message: 'No autenticado' })
  }

  // Short-lived token for WebSocket auth (60 seconds)
  const token = await signToken(
    { userId: user.userId, username: user.username, email: user.email },
    '60s',
  )

  return { token }
})
