import prisma from '#server/utils/prisma'
import { hashPassword } from '#server/utils/password'
import { signToken } from '#server/utils/jwt'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; username: string; password: string }>(event)

  if (!body.email || !body.username || !body.password) {
    throw createError({ statusCode: 400, message: 'Email, username y contraseña son requeridos' })
  }

  if (body.password.length < 8) {
    throw createError({ statusCode: 400, message: 'La contraseña debe tener al menos 8 caracteres' })
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: body.email }, { username: body.username }] },
  })

  if (existing) {
    throw createError({ statusCode: 409, message: 'Email o username ya en uso' })
  }

  const passwordHash = await hashPassword(body.password)
  const user = await prisma.user.create({
    data: { email: body.email, username: body.username, passwordHash },
    select: { id: true, email: true, username: true },
  })

  const config = useRuntimeConfig()
  const token = await signToken({ userId: user.id, username: user.username, email: user.email })
  setCookie(event, config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return { user }
})
