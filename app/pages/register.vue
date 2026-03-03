<template>
  <div class="auth-page">
    <div class="auth-box">
      <h1 class="auth-title">REGISTRARSE</h1>
      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="field">
          <label>EMAIL</label>
          <input v-model="email" type="email" autocomplete="email" required />
        </div>
        <div class="field">
          <label>USUARIO</label>
          <input v-model="username" type="text" autocomplete="username" required minlength="3" />
        </div>
        <div class="field">
          <label>CONTRASEÑA</label>
          <input v-model="password" type="password" autocomplete="new-password" required minlength="8" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading" class="submit-btn">
          {{ loading ? 'CREANDO...' : 'CREAR CUENTA' }}
        </button>
      </form>
      <p class="auth-link">¿Ya tienes cuenta? <NuxtLink to="/login">Entra aquí</NuxtLink></p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const auth = useAuth()
const email = ref('')
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''
  loading.value = true
  try {
    await auth.register(email.value, username.value, password.value)
    await navigateTo('/')
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message ?? 'Error al registrarse'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
}

.auth-box {
  background: var(--bg-card);
  border: 1px solid var(--neon-green);
  box-shadow: 0 0 30px #39ff1422;
  padding: 2.5rem;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.auth-title {
  font-family: var(--font-pixel);
  font-size: 1rem;
  color: var(--neon-green);
  text-align: center;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field label {
  font-family: var(--font-pixel);
  font-size: 0.45rem;
  color: var(--text-dim);
  letter-spacing: 0.1em;
}

.field input {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 1rem;
  padding: 0.6rem 0.75rem;
  outline: none;
  transition: border-color 0.2s;
}

.field input:focus {
  border-color: var(--neon-green);
}

.error {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--neon-pink);
}

.submit-btn {
  font-family: var(--font-pixel);
  font-size: 0.55rem;
  padding: 0.75rem;
  background: var(--neon-green);
  color: var(--bg);
  border: none;
  cursor: pointer;
  transition: opacity 0.2s;
  letter-spacing: 0.05em;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.auth-link {
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-dim);
}
</style>
