<template>
  <button
    class="retro-btn"
    :class="[`retro-btn--${variant}`, { 'retro-btn--sm': size === 'sm' }]"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <span v-if="loading">...</span>
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  variant?: 'cyan' | 'green' | 'pink' | 'yellow' | 'ghost'
  size?: 'sm' | 'md'
  disabled?: boolean
  loading?: boolean
}>(), {
  variant: 'cyan',
  size: 'md',
})
</script>

<style scoped>
.retro-btn {
  font-family: var(--font-pixel);
  background: transparent;
  cursor: pointer;
  letter-spacing: 0.05em;
  transition: background 0.2s, color 0.2s, opacity 0.2s;
  border-style: solid;
  border-width: 1px;
}

.retro-btn--md { font-size: 0.55rem; padding: 0.65rem 1.25rem; }
.retro-btn--sm { font-size: 0.4rem;  padding: 0.35rem 0.75rem; }

.retro-btn--cyan   { border-color: var(--neon-cyan);   color: var(--neon-cyan); }
.retro-btn--green  { border-color: var(--neon-green);  color: var(--neon-green); }
.retro-btn--pink   { border-color: var(--neon-pink);   color: var(--neon-pink); }
.retro-btn--yellow { border-color: var(--neon-yellow); color: var(--neon-yellow); }
.retro-btn--ghost  { border-color: var(--border);      color: var(--text-dim); }

.retro-btn--cyan:hover:not(:disabled)   { background: var(--neon-cyan);   color: var(--bg); }
.retro-btn--green:hover:not(:disabled)  { background: var(--neon-green);  color: var(--bg); }
.retro-btn--pink:hover:not(:disabled)   { background: var(--neon-pink);   color: var(--bg); }
.retro-btn--yellow:hover:not(:disabled) { background: var(--neon-yellow); color: var(--bg); }
.retro-btn--ghost:hover:not(:disabled)  { border-color: var(--text-dim); color: var(--text); }

.retro-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
