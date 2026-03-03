export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuth()
  if (!auth.user.value) {
    await auth.fetchUser()
  }
  if (!auth.user.value) {
    return navigateTo('/login')
  }
})
