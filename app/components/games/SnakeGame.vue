<template>
  <div class="snake-wrapper">
    <div class="score-bar">
      <span>SCORE: <strong>{{ score }}</strong></span>
      <span>BEST: <strong>{{ highScore }}</strong></span>
    </div>

    <div class="canvas-container" ref="containerRef">
      <canvas ref="canvasRef" :width="CANVAS" :height="CANVAS"></canvas>

      <div v-if="state === 'idle'" class="overlay">
        <p class="overlay-title">SNAKE</p>
        <p class="overlay-hint">Presiona ENTER o ESPACIO para comenzar</p>
      </div>
      <div v-else-if="state === 'gameover'" class="overlay">
        <p class="overlay-title game-over">GAME OVER</p>
        <p class="overlay-score">Puntuación: {{ score }}</p>
        <p v-if="score >= highScore && score > 0" class="overlay-hs">¡NUEVO RÉCORD!</p>
        <p class="overlay-hint">ENTER o ESPACIO para reintentar</p>
      </div>
      <div v-else-if="state === 'paused'" class="overlay">
        <p class="overlay-title">PAUSA</p>
        <p class="overlay-hint">ENTER o P para continuar</p>
      </div>
    </div>

    <div class="controls-hint">
      <kbd>↑ ↓ ← →</kbd> o <kbd>W A S D</kbd> &nbsp;|&nbsp; <kbd>P</kbd> Pausa
    </div>
  </div>
</template>

<script setup lang="ts">
const GRID = 20
const CANVAS = 400
const CELL = CANVAS / GRID

const { highScore, saveScore } = useHighScore('snake')

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const score = ref(0)
const state = ref<'idle' | 'running' | 'paused' | 'gameover'>('idle')

let ctx: CanvasRenderingContext2D | null = null
let snake: Array<{ x: number; y: number }> = []
let dir = { x: 1, y: 0 }
let nextDir = { x: 1, y: 0 }
let food = { x: 0, y: 0 }
let rafId = 0
let lastTime = 0
let speed = 150

function initGame(): void {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]
  dir = { x: 1, y: 0 }
  nextDir = { x: 1, y: 0 }
  score.value = 0
  speed = 150
  spawnFood()
}

function spawnFood(): void {
  let pos: { x: number; y: number }
  do {
    pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
  } while (snake.some(s => s.x === pos.x && s.y === pos.y))
  food = pos
}

function tick(timestamp: number): void {
  if (state.value !== 'running') return
  rafId = requestAnimationFrame(tick)
  if (timestamp - lastTime < speed) return
  lastTime = timestamp

  dir = { ...nextDir }
  const head0 = snake[0]!
  const head = { x: head0.x + dir.x, y: head0.y + dir.y }

  if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) { endGame(); return }
  if (snake.some(s => s.x === head.x && s.y === head.y)) { endGame(); return }

  snake.unshift(head)

  if (head.x === food.x && head.y === food.y) {
    score.value += 10
    saveScore(score.value)
    speed = Math.max(60, speed - 3)
    spawnFood()
  } else {
    snake.pop()
  }

  draw()
}

function draw(): void {
  if (!ctx) return
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, CANVAS, CANVAS)

  ctx.fillStyle = '#1a1a1a'
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2)
    }
  }

  if (food.x !== undefined) {
    const fx = food.x * CELL
    const fy = food.y * CELL
    ctx.fillStyle = '#ff2d78'
    ctx.shadowColor = '#ff2d78'
    ctx.shadowBlur = 8
    ctx.fillRect(fx + 3, fy + 3, CELL - 6, CELL - 6)
    ctx.shadowBlur = 0
  }

  snake.forEach((seg, i) => {
    const brightness = i === 0 ? 1 : Math.max(0.4, 1 - i * 0.025)
    ctx!.fillStyle = i === 0 ? '#39ff14' : `rgba(57,255,20,${brightness})`
    ctx!.shadowColor = '#39ff14'
    ctx!.shadowBlur = i === 0 ? 10 : 4
    ctx!.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2)
  })
  ctx.shadowBlur = 0

  if (snake.length === 0) return
  const head = snake[0]!
  const hx = head.x * CELL
  const hy = head.y * CELL
  ctx.fillStyle = '#0d0d0d'
  if (dir.x === 1) {
    ctx.fillRect(hx + CELL - 7, hy + 4, 4, 4)
    ctx.fillRect(hx + CELL - 7, hy + CELL - 8, 4, 4)
  } else if (dir.x === -1) {
    ctx.fillRect(hx + 3, hy + 4, 4, 4)
    ctx.fillRect(hx + 3, hy + CELL - 8, 4, 4)
  } else if (dir.y === -1) {
    ctx.fillRect(hx + 4, hy + 3, 4, 4)
    ctx.fillRect(hx + CELL - 8, hy + 3, 4, 4)
  } else {
    ctx.fillRect(hx + 4, hy + CELL - 7, 4, 4)
    ctx.fillRect(hx + CELL - 8, hy + CELL - 7, 4, 4)
  }
}

function startGame(): void {
  initGame()
  state.value = 'running'
  lastTime = 0
  rafId = requestAnimationFrame(tick)
  draw()
}

function endGame(): void {
  state.value = 'gameover'
  cancelAnimationFrame(rafId)
  saveScore(score.value)
  draw()
}

function togglePause(): void {
  if (state.value === 'running') {
    state.value = 'paused'
    cancelAnimationFrame(rafId)
  } else if (state.value === 'paused') {
    state.value = 'running'
    lastTime = 0
    rafId = requestAnimationFrame(tick)
  }
}

const KEY_MAP: Record<string, { x: number; y: number }> = {
  ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
}

function onKey(e: KeyboardEvent): void {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault()

  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    if (state.value === 'idle' || state.value === 'gameover') startGame()
    else if (state.value === 'paused') togglePause()
    return
  }

  if (e.key === 'p' || e.key === 'P') { togglePause(); return }
  if (state.value !== 'running') return

  const newDir = KEY_MAP[e.key]
  if (!newDir) return
  if (newDir.x !== -dir.x || newDir.y !== -dir.y) nextDir = newDir
}

onMounted(() => {
  ctx = canvasRef.value!.getContext('2d')
  draw()
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.snake-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.score-bar {
  width: 400px;
  display: flex;
  justify-content: space-between;
  font-family: var(--font-pixel);
  font-size: 0.55rem;
  color: var(--text-dim);
  letter-spacing: 0.05em;
}

.score-bar strong { color: var(--neon-green); }

.canvas-container {
  position: relative;
  width: 400px;
  height: 400px;
  border: 2px solid #39ff14;
  box-shadow: 0 0 20px #39ff1444, inset 0 0 20px #00000088;
}

canvas { display: block; }

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.overlay-title {
  font-family: var(--font-pixel);
  font-size: 1.2rem;
  color: var(--neon-green);
  text-shadow: 0 0 15px #39ff14;
}

.overlay-title.game-over {
  color: var(--neon-pink);
  text-shadow: 0 0 15px #ff2d78;
}

.overlay-score {
  font-family: var(--font-pixel);
  font-size: 0.6rem;
  color: var(--text);
}

.overlay-hs {
  font-family: var(--font-pixel);
  font-size: 0.55rem;
  color: var(--neon-yellow);
  animation: blink 0.8s step-end infinite;
}

.overlay-hint {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-dim);
}

.controls-hint {
  font-size: 0.8rem;
  color: var(--text-dim);
  font-family: var(--font-mono);
}

kbd {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 3px;
  padding: 1px 5px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--neon-green);
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
