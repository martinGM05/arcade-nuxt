import prisma from '#server/utils/prisma'
import { comparePassword } from '#server/utils/password'
import { signToken } from '#server/utils/jwt'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; password: string }>(event)

  if (!body.email || !body.password) {
    throw createError({ statusCode: 400, message: 'Email y contraseña son requeridos' })
  }

  const user = await prisma.user.findUnique({ where: { email: body.email } })
  if (!user) {
    throw createError({ statusCode: 401, message: 'Credenciales inválidas' })
  }

  const valid = await comparePassword(body.password, user.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 401, message: 'Credenciales inválidas' })
  }

  const config = useRuntimeConfig()
  const token = await signToken({ userId: user.id, username: user.username, email: user.email })
  setCookie(event, config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return { user: { id: user.id, email: user.email, username: user.username } }
})
