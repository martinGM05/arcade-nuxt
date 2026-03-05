import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

export interface TokenPayload extends JWTPayload {
  userId: string
  username: string
  email: string
}

function getSecret(): Uint8Array {
  const config = useRuntimeConfig()
  const secret = config.jwtSecret || process.env.JWT_SECRET || process.env.NUXT_JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return new TextEncoder().encode(secret)
}

export async function signToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  expiresIn: string = '7d',
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as TokenPayload
}
