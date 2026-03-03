<template>
  <div class="svs-wrapper">
    <div class="score-bar">
      <div v-for="s in snakes" :key="s.slot" class="player-score" :style="{ color: s.color }">
        {{ s.username }}: {{ s.score }}
        <span v-if="!s.alive" class="dead">(muerto)</span>
      </div>
    </div>

    <div class="canvas-container" :style="{ borderColor: myColor }">
      <canvas ref="canvasRef" :width="CANVAS" :height="CANVAS"></canvas>

      <div v-if="status === 'connecting'" class="overlay">
        <p class="overlay-title">CONECTANDO...</p>
      </div>
      <div v-else-if="status === 'waiting'" class="overlay">
        <p class="overlay-title">ESPERANDO</p>
        <p class="overlay-hint">Esperando al segundo jugador...</p>
        <p class="overlay-hint">Slot: {{ mySlot === 0 ? 'VERDE' : 'CYAN' }}</p>
      </div>
      <div v-else-if="status === 'finished'" class="overlay">
        <p class="overlay-title" :class="{ won: isWinner, lost: !isWinner }">
          {{ isWinner ? '¡GANASTE!' : winner === null ? 'EMPATE' : '¡PERDISTE!' }}
        </p>
        <div class="end-scores">
          <div v-for="s in snakes" :key="s.slot" :style="{ color: s.color }">
            {{ s.username }}: {{ s.score }} pts
          </div>
        </div>
        <NuxtLink to="/snake/multiplayer" class="back-btn">VOLVER AL LOBBY</NuxtLink>
      </div>
      <div v-else-if="status === 'error'" class="overlay">
        <p class="overlay-title game-over">ERROR</p>
        <p class="overlay-hint">{{ error }}</p>
        <NuxtLink to="/snake/multiplayer" class="back-btn">VOLVER</NuxtLink>
      </div>
    </div>

    <div class="controls-hint">
      <kbd>↑ ↓ ← →</kbd> o <kbd>W A S D</kbd> — Eres el jugador
      <span :style="{ color: myColor }">{{ mySlot === 0 ? 'VERDE' : 'CYAN' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  roomId: string
}>()

const GRID = 20
const CANVAS = 400
const CELL = CANVAS / GRID

const { snakes, food, mySlot, status, error, winner, connect, sendDir, disconnect } = useSnakeWs(props.roomId)

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

const myColor = computed(() => mySlot.value === 0 ? '#39ff14' : '#00e5ff')
const isWinner = computed(() => winner.value === mySlot.value)

function draw(): void {
  if (!ctx) return
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, CANVAS, CANVAS)

  // Grid dots
  ctx.fillStyle = '#1a1a1a'
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2)
    }
  }

  // Food
  ctx.fillStyle = '#ff2d78'
  ctx.shadowColor = '#ff2d78'
  ctx.shadowBlur = 8
  ctx.fillRect(food.value.x * CELL + 3, food.value.y * CELL + 3, CELL - 6, CELL - 6)
  ctx.shadowBlur = 0

  // Snakes
  for (const snake of snakes.value) {
    if (!snake.alive) continue
    snake.segments.forEach((seg, i) => {
      const brightness = i === 0 ? 1 : Math.max(0.4, 1 - i * 0.025)
      ctx!.fillStyle = i === 0 ? snake.color : `${snake.color}${Math.floor(brightness * 255).toString(16).padStart(2,'0')}`
      ctx!.shadowColor = snake.color
      ctx!.shadowBlur = i === 0 ? 10 : 4
      ctx!.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2)
    })
    ctx.shadowBlur = 0
  }
}

watch([snakes, food], draw, { deep: true })

const KEY_MAP: Record<string, { x: number; y: number }> = {
  ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
}

function onKey(e: KeyboardEvent): void {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault()
  const dir = KEY_MAP[e.key]
  if (dir && status.value === 'playing') sendDir(dir.x, dir.y)
}

onMounted(async () => {
  ctx = canvasRef.value!.getContext('2d')
  draw()
  window.addEventListener('keydown', onKey)
  await connect()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  disconnect()
})
</script>

<style scoped>
.svs-wrapper { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }

.score-bar {
  width: 400px;
  display: flex;
  justify-content: space-between;
  font-family: var(--font-pixel);
  font-size: 0.5rem;
}

.dead { opacity: 0.5; font-size: 0.4rem; }

.canvas-container {
  position: relative;
  width: 400px;
  height: 400px;
  border: 2px solid;
  box-shadow: 0 0 20px #0004, inset 0 0 20px #0008;
}

canvas { display: block; }

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.overlay-title {
  font-family: var(--font-pixel);
  font-size: 1rem;
  color: var(--neon-green);
  text-shadow: 0 0 15px currentColor;
}

.overlay-title.won { color: var(--neon-yellow); }
.overlay-title.lost { color: var(--neon-pink); }
.overlay-title.game-over { color: var(--neon-pink); }

.overlay-hint { font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-dim); }

.end-scores {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  text-align: center;
}

.back-btn {
  font-family: var(--font-pixel);
  font-size: 0.45rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--neon-cyan);
  color: var(--neon-cyan);
  text-decoration: none;
}

.controls-hint { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-dim); }
kbd { background: #2a2a2a; border: 1px solid #444; border-radius: 3px; padding: 1px 5px; font-family: var(--font-mono); color: var(--neon-green); }
</style>
