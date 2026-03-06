// Sliding-window in-memory rate limiter.
// For multi-instance deployments replace with a Redis-backed solution.

const windows = new Map<string, number[]>()

// Prune stale entries every 5 minutes to avoid memory leaks
setInterval(() => {
  const cutoff = Date.now() - 300_000
  for (const [key, timestamps] of windows) {
    const fresh = timestamps.filter(t => t > cutoff)
    if (fresh.length === 0) windows.delete(key)
    else windows.set(key, fresh)
  }
}, 300_000).unref()

/**
 * Returns true if the request is allowed, false if the limit is exceeded.
 * @param key     Unique key (e.g. `login:${ip}`)
 * @param max     Max requests allowed in the window
 * @param windowMs Window size in milliseconds
 */
export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const timestamps = (windows.get(key) ?? []).filter(t => t > now - windowMs)
  if (timestamps.length >= max) return false
  timestamps.push(now)
  windows.set(key, timestamps)
  return true
}
