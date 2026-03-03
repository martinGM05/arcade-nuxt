export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  deleteCookie(event, config.cookieName)
  return { ok: true }
})
