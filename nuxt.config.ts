// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@vueuse/nuxt'],

  typescript: {
    strict: true,
    typeCheck: false, // set to true after all types stabilize
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET ?? '',
    cookieName: process.env.COOKIE_NAME ?? 'arcade_session',
  },

  nitro: {
    experimental: {
      websocket: true,
    },
  },
})
