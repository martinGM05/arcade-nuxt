export default defineNuxtPlugin(async () => {
  const auth = useAuth()
  if (!auth.user.value) {
    await auth.fetchUser()
  }
})
