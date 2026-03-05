import prisma from '#server/utils/prisma'
import { signToken } from '#server/utils/jwt'

export default defineEventHandler(async (event) => {
  const currentUser = event.context.user
  if (!currentUser) throw createError({ statusCode: 401, message: 'No autenticado' })

  const body = await readBody<{ email: string; username: string }>(event)
  if (!body.email || !body.username) {
    throw createError({ statusCode: 400, message: 'Email y username son requeridos' })
  }

  const email = body.email.trim().toLowerCase()
  const username = body.username.trim()

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!emailValid) throw createError({ statusCode: 400, message: 'Email inválido' })

  if (username.length < 3 || username.length > 20) {
    throw createError({ statusCode: 400, message: 'El username debe tener entre 3 y 20 caracteres' })
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw createError({ statusCode: 400, message: 'El username solo puede contener letras, números y _' })
  }

  const emailExists = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: 'insensitive' },
      NOT: { id: currentUser.userId },
    },
    select: { id: true },
  })
  if (emailExists) throw createError({ statusCode: 409, message: 'Email ya registrado' })

  const usernameExists = await prisma.user.findFirst({
    where: {
      username: { equals: username, mode: 'insensitive' },
      NOT: { id: currentUser.userId },
    },
    select: { id: true },
  })
  if (usernameExists) throw createError({ statusCode: 409, message: 'Username ya en uso' })

  const user = await prisma.user.update({
    where: { id: currentUser.userId },
    data: { email, username },
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

  return { user: { userId: user.id, email: user.email, username: user.username } }
})
