<template>
  <div class="profile-page">
    <div class="profile-header">
      <h1 class="profile-title">PERFIL</h1>
      <p class="profile-sub">Actualiza tu información básica</p>
    </div>

    <div class="profile-card">
      <div class="field">
        <label>Email</label>
        <input v-model="email" type="email" class="text-input" placeholder="tu@email.com" />
      </div>
      <div class="field">
        <label>Username</label>
        <input v-model="username" type="text" class="text-input" placeholder="tu_usuario" />
        <p class="hint">3-20 caracteres, solo letras, números y _</p>
      </div>

      <div class="actions">
        <button class="save-btn" :disabled="saving" @click="save">
          {{ saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS' }}
        </button>
      </div>

      <p v-if="success" class="success">Cambios guardados</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

const auth = useAuth()
const email = ref(auth.user.value?.email ?? '')
const username = ref(auth.user.value?.username ?? '')
const saving = ref(false)
const error = ref('')
const success = ref(false)

watchEffect(() => {
  if (!email.value && auth.user.value?.email) email.value = auth.user.value.email
  if (!username.value && auth.user.value?.username) username.value = auth.user.value.username
})

async function save(): Promise<void> {
  saving.value = true
  error.value = ''
  success.value = false
  try {
    await auth.updateProfile(email.value, username.value)
    success.value = true
  } catch (e: unknown) {
    error.value = (e as { data?: { message?: string } })?.data?.message ?? 'Error al guardar'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.profile-page {
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.profile-header { text-align: center; }

.profile-title {
  font-family: var(--font-pixel);
  font-size: 1.2rem;
  color: var(--neon-cyan);
  text-shadow: 0 0 15px #00e5ff66;
}

.profile-sub {
  font-family: var(--font-mono);
  color: var(--text-dim);
  margin-top: 0.5rem;
}

.profile-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

label {
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: var(--text-dim);
  letter-spacing: 0.1em;
}

.text-input {
  background: #0b0b0b;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.6rem 0.7rem;
  font-family: var(--font-mono);
}

.hint {
  font-family: var(--font-mono);
  color: var(--text-dim);
  font-size: 0.8rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.save-btn {
  font-family: var(--font-pixel);
  font-size: 0.45rem;
  padding: 0.45rem 0.85rem;
  background: transparent;
  border: 1px solid var(--neon-cyan);
  color: var(--neon-cyan);
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success {
  font-family: var(--font-mono);
  color: var(--neon-green);
}

.error {
  font-family: var(--font-mono);
  color: var(--neon-pink);
}
</style>
