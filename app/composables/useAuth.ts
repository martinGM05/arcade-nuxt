interface AuthUser {
  userId: string
  username: string
  email: string
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth.user', () => null)

  async function fetchUser(): Promise<void> {
    try {
      const data = await $fetch<{ user: AuthUser }>('/api/me')
      user.value = data.user
    } catch {
      user.value = null
    }
  }

  async function login(email: string, password: string): Promise<void> {
    const data = await $fetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    user.value = data.user
  }

  async function register(email: string, username: string, password: string): Promise<void> {
    const data = await $fetch<{ user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: { email, username, password },
    })
    user.value = data.user
  }

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/login')
  }

  async function updateProfile(email: string, username: string): Promise<void> {
    const data = await $fetch<{ user: AuthUser }>('/api/profile', {
      method: 'PUT',
      body: { email, username },
    })
    user.value = data.user
  }

  return { user, fetchUser, login, register, logout, updateProfile }
}
