export default defineNitroPlugin(() => {
  const env = {
    PORT: process.env.PORT,
    NITRO_PORT: process.env.NITRO_PORT,
    HOST: process.env.HOST,
    NITRO_HOST: process.env.NITRO_HOST,
    NUXT_PORT: process.env.NUXT_PORT,
    NUXT_HOST: process.env.NUXT_HOST,
    NODE_ENV: process.env.NODE_ENV,
  }
  // Log once at startup to help diagnose bind issues in deploys
  console.log('Nitro startup env', env)
})
