import prisma from '#server/utils/prisma'
import { comparePassword } from '#server/utils/password'
import { signToken } from '#server/utils/jwt'
import { getRequestHeader, getRequestIP } from 'h3'

function logAuth(event: Parameters<typeof getRequestIP>[0], action: string, outcome: 'ok' | 'fail', details: Record<string, unknown>) {
  const ip = getRequestIP(event) ?? 'unknown'
  const ua = getRequestHeader(event, 'user-agent') ?? 'unknown'
  console.info(`[auth] ${action} ${outcome}`, { ip, ua, ...details })
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email: string; password: string }>(event)

  if (!body.email || !body.password) {
    logAuth(event, 'login', 'fail', { reason: 'missing_fields' })
    throw createError({ statusCode: 400, message: 'Email y contraseña son requeridos' })
  }

  const email = body.email.trim().toLowerCase()
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  })
  if (!user) {
    logAuth(event, 'login', 'fail', { reason: 'user_not_found', email })
    throw createError({ statusCode: 401, message: 'Credenciales inválidas' })
  }

  const valid = await comparePassword(body.password, user.passwordHash)
  if (!valid) {
    logAuth(event, 'login', 'fail', { reason: 'invalid_password', email, userId: user.id })
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

  logAuth(event, 'login', 'ok', { userId: user.id, email, username: user.username })
  return { user: { id: user.id, email: user.email, username: user.username } }
})
