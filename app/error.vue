<template>
  <div class="error-page">
    <p class="error-code">{{ error.statusCode }}</p>
    <p class="error-msg">{{ error.statusMessage || 'Error inesperado' }}</p>
    <button class="error-btn" @click="handleError">VOLVER AL INICIO</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; statusMessage: string; message: string } }>()
const { error } = toRefs(props)

async function handleError(): Promise<void> {
  await clearError({ redirect: '/' })
}
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  background: var(--bg);
}

.error-code {
  font-family: var(--font-pixel);
  font-size: 4rem;
  color: var(--neon-pink);
  text-shadow: 0 0 30px #ff2d7888;
}

.error-msg {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: var(--text-dim);
}

.error-btn {
  font-family: var(--font-pixel);
  font-size: 0.55rem;
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: 1px solid var(--neon-cyan);
  color: var(--neon-cyan);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.error-btn:hover {
  background: var(--neon-cyan);
  color: var(--bg);
}
</style>
