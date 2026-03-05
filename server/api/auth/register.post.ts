import prisma from '#server/utils/prisma'
import { hashPassword } from '#server/utils/password'
import { signToken } from '#server/utils/jwt'
import { getRequestHeader, getRequestIP } from 'h3'

function logAuth(event: Parameters<typeof getRequestIP>[0], action: string, outcome: 'ok' | 'fail', details: Record<string, unknown>) {
  const ip = getRequestIP(event) ?? 'unknown'
  const ua = getRequestHeader(event, 'user-agent') ?? 'unknown'
  console.info(`[auth] ${action} ${outcome}`, { ip, ua, ...details })
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; username: string; password: string }>(event)

  if (!body.email || !body.username || !body.password) {
    logAuth(event, 'register', 'fail', { reason: 'missing_fields' })
    throw createError({ statusCode: 400, message: 'Email, username y contraseña son requeridos' })
  }

  const email = body.email.trim().toLowerCase()
  const username = body.username.trim()
  const password = body.password

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!emailValid) {
    logAuth(event, 'register', 'fail', { reason: 'invalid_email', email })
    throw createError({ statusCode: 400, message: 'Email inválido' })
  }

  if (username.length < 3 || username.length > 20) {
    logAuth(event, 'register', 'fail', { reason: 'invalid_username_length', username })
    throw createError({ statusCode: 400, message: 'El username debe tener entre 3 y 20 caracteres' })
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    logAuth(event, 'register', 'fail', { reason: 'invalid_username_chars', username })
    throw createError({ statusCode: 400, message: 'El username solo puede contener letras, números y _' })
  }

  if (password.length < 8 || password.length > 72) {
    logAuth(event, 'register', 'fail', { reason: 'invalid_password_length', length: password.length })
    throw createError({ statusCode: 400, message: 'La contraseña debe tener al menos 8 caracteres' })
  }

  const emailExists = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  })

  if (emailExists) {
    logAuth(event, 'register', 'fail', { reason: 'email_taken', email })
    throw createError({ statusCode: 409, message: 'Email ya registrado' })
  }

  const usernameExists = await prisma.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { id: true },
  })

  if (usernameExists) {
    logAuth(event, 'register', 'fail', { reason: 'username_taken', username })
    throw createError({ statusCode: 409, message: 'Username ya en uso' })
  }

  const passwordHash = await hashPassword(password)
  const user = await prisma.user.create({
    data: { email, username, passwordHash },
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

  logAuth(event, 'register', 'ok', { userId: user.id, email, username })
  return { user }
})
