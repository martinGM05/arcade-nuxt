<template>
  <div
    v-if="!isTouch"
    class="cursor-glow"
    :style="{ left: `${glowX}px`, top: `${glowY}px` }"
  />
</template>

<script setup lang="ts">
const { x: mx, y: my } = useMouse()
const isTouch = useMediaQuery('(pointer: coarse)')

const glowX = ref(0)
const glowY = ref(0)

let rafId = 0
function frame() {
  glowX.value += (mx.value - glowX.value) * 0.12
  glowY.value += (my.value - glowY.value) * 0.12
  rafId = requestAnimationFrame(frame)
}
onMounted(() => { rafId = requestAnimationFrame(frame) })
onUnmounted(() => cancelAnimationFrame(rafId))
</script>

<style scoped>
.cursor-glow {
  position: fixed;
  top: 0;
  left: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(57, 255, 20, 0.9) 0%, rgba(57, 255, 20, 0.35) 45%, transparent 100%);
  box-shadow: 0 0 14px 5px rgba(57, 255, 20, 0.35);
  filter: blur(1px);
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: screen;
}
</style>
