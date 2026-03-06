// Security headers applied to every response.
// Must run before auth middleware — filename "00.security.ts" ensures ordering.
export default defineEventHandler((event) => {
  // Skip for WebSocket upgrade requests
  if (getRequestHeader(event, 'upgrade') === 'websocket') return

  setResponseHeaders(event, {
    // Prevent MIME-type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Block clickjacking
    'X-Frame-Options': 'DENY',

    // Force HTTPS for 1 year (only meaningful in production behind HTTPS)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

    // Don't send referrer to external sites
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Disable unused browser features
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',

    // Content Security Policy
    // - unsafe-inline needed for Vue hydration & inline styles
    // - ws:/wss: needed for WebSocket connections
    // - fonts.googleapis.com / fonts.gstatic.com for Press Start 2P & Share Tech Mono
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'none'",
    ].join('; '),
  })
})
