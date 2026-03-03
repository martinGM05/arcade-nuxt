<template>
  <div class="breakout-wrapper">
    <div class="score-bar">
      <span>SCORE: <strong>{{ score }}</strong></span>
      <span>LIVES: <strong class="lives">{{ '♥'.repeat(lives) }}</strong></span>
      <span>BEST: <strong>{{ highScore }}</strong></span>
    </div>
    <div class="canvas-container">
      <canvas ref="canvasRef" :width="W" :height="H"></canvas>
      <div v-if="state === 'idle'" class="overlay">
        <p class="overlay-title">BREAKOUT</p>
        <p class="overlay-hint">ENTER o ESPACIO para comenzar</p>
        <p class="overlay-sub">Mueve con ← → o el ratón</p>
      </div>
      <div v-else-if="state === 'gameover'" class="overlay">
        <p class="overlay-title game-over">GAME OVER</p>
        <p class="overlay-score">{{ score }} pts</p>
        <p v-if="score >= highScore && score > 0" class="overlay-hs">¡NUEVO RÉCORD!</p>
        <p class="overlay-hint">ENTER para reintentar</p>
      </div>
      <div v-else-if="state === 'win'" class="overlay">
        <p class="overlay-title win">¡GANASTE!</p>
        <p class="overlay-score">{{ score }} pts</p>
        <p class="overlay-hint">ENTER para siguiente nivel</p>
      </div>
      <div v-else-if="state === 'paused'" class="overlay">
        <p class="overlay-title">PAUSA</p>
        <p class="overlay-hint">P para continuar</p>
      </div>
    </div>
    <div class="controls-hint">
      <kbd>← →</kbd> mover &nbsp;|&nbsp; <kbd>Mouse</kbd> mover &nbsp;|&nbsp; <kbd>P</kbd> pausa
    </div>
  </div>
</template>

<script setup lang="ts">
const W = 480
const H = 400
const BRICK_COLS = 10
const BRICK_ROWS = 5
const BRICK_W = Math.floor(W / BRICK_COLS) - 4
const BRICK_H = 18
const BRICK_PAD = 4
const BRICK_TOP = 40
const PAD_H = 10
const PAD_W_DEFAULT = 80
const BALL_R = 7

interface Brick {
  x: number; y: number; w: number; h: number; alive: boolean; color: string; points: number
}

const ROW_COLORS = ['#ff2d78','#ff8c00','#ffe600','#39ff14','#00e5ff']

const { highScore, saveScore } = useHighScore('breakout')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const lives = ref(3)
const state = ref<'idle' | 'running' | 'paused' | 'gameover' | 'win'>('idle')

let ctx: CanvasRenderingContext2D | null = null
let rafId = 0
let paddle = { x: 0, y: 0, w: PAD_W_DEFAULT, h: PAD_H }
let ball = { x: 0, y: 0, vx: 0, vy: 0, r: BALL_R }
let bricks: Brick[] = []
let level = 1

function initLevel(): void {
  paddle = { x: W / 2 - PAD_W_DEFAULT / 2, y: H - 30, w: PAD_W_DEFAULT, h: PAD_H }
  const spd = 3.5 + (level - 1) * 0.4
  const angle = (Math.random() * 60 + 60) * (Math.PI / 180)
  ball = { x: W / 2, y: H - 60, vx: Math.cos(angle) * spd * (Math.random() < 0.5 ? 1 : -1), vy: -Math.sin(angle) * spd, r: BALL_R }
  bricks = []
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: c * (BRICK_W + BRICK_PAD) + BRICK_PAD, y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
        w: BRICK_W, h: BRICK_H, alive: true,
        color: ROW_COLORS[r % ROW_COLORS.length]!,
        points: (BRICK_ROWS - r) * 10,
      })
    }
  }
}

function draw(): void {
  if (!ctx) return
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#ff2d7844'
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1)

  bricks.forEach(b => {
    if (!b.alive) return
    ctx!.fillStyle = b.color
    ctx!.shadowColor = b.color
    ctx!.shadowBlur = 6
    ctx!.fillRect(b.x, b.y, b.w, b.h)
    ctx!.shadowBlur = 0
    ctx!.fillStyle = 'rgba(255,255,255,0.2)'
    ctx!.fillRect(b.x, b.y, b.w, 4)
  })

  const grad = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.h)
  grad.addColorStop(0, '#ff2d78')
  grad.addColorStop(1, '#b00050')
  ctx.fillStyle = grad
  ctx.shadowColor = '#ff2d78'
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 4)
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = '#ffffff'
  ctx.shadowBlur = 10
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.fillStyle = '#333'
  ctx.font = '10px "Share Tech Mono"'
  ctx.fillText(`LVL ${level}`, 8, 18)
}

function update(): void {
  ball.x += ball.vx
  ball.y += ball.vy

  if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) }
  if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) }
  if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy) }

  if (ball.y + ball.r > H) {
    lives.value--
    if (lives.value <= 0) { endGame(); return }
    const spd = 3.5 + (level - 1) * 0.4
    const angle = (Math.random() * 60 + 60) * (Math.PI / 180)
    ball.x = paddle.x + paddle.w / 2
    ball.y = paddle.y - 20
    ball.vx = Math.cos(angle) * spd * (Math.random() < 0.5 ? 1 : -1)
    ball.vy = -Math.abs(Math.sin(angle) * spd)
  }

  if (ball.y + ball.r >= paddle.y && ball.y - ball.r <= paddle.y + paddle.h &&
      ball.x >= paddle.x && ball.x <= paddle.x + paddle.w && ball.vy > 0) {
    const hitPos = (ball.x - paddle.x) / paddle.w
    const angle = (hitPos - 0.5) * 2 * (Math.PI / 3)
    const spd = Math.hypot(ball.vx, ball.vy)
    ball.vx = Math.sin(angle) * spd
    ball.vy = -Math.cos(angle) * spd
    ball.y = paddle.y - ball.r
  }

  let bricksLeft = 0
  for (const b of bricks) {
    if (!b.alive) continue
    bricksLeft++
    if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
        ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
      b.alive = false
      bricksLeft--
      score.value += b.points * level
      saveScore(score.value)
      const ol = ball.x + ball.r - b.x
      const or_ = b.x + b.w - (ball.x - ball.r)
      const ot = ball.y + ball.r - b.y
      const ob = b.y + b.h - (ball.y - ball.r)
      if (Math.min(ot, ob) < Math.min(ol, or_)) ball.vy = -ball.vy
      else ball.vx = -ball.vx
      break
    }
  }
  if (bricksLeft === 0) winLevel()
}

function winLevel(): void { state.value = 'win'; cancelAnimationFrame(rafId); draw() }
function endGame(): void { state.value = 'gameover'; cancelAnimationFrame(rafId); saveScore(score.value); draw() }
function loop(): void {
  if (state.value !== 'running') return
  rafId = requestAnimationFrame(loop)
  update(); draw()
}

function startGame(isNextLevel = false): void {
  if (!isNextLevel) { score.value = 0; lives.value = 3; level = 1 }
  else { level++ }
  initLevel()
  state.value = 'running'
  rafId = requestAnimationFrame(loop)
}

function togglePause(): void {
  if (state.value === 'running') { state.value = 'paused'; cancelAnimationFrame(rafId) }
  else if (state.value === 'paused') { state.value = 'running'; rafId = requestAnimationFrame(loop) }
}

function onKey(e: KeyboardEvent): void {
  if (['ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault()
  if (e.key === 'Enter' || e.key === ' ') {
    if (state.value === 'idle' || state.value === 'gameover') startGame(false)
    else if (state.value === 'win') startGame(true)
    return
  }
  if (e.key === 'p' || e.key === 'P') { togglePause(); return }
  if (state.value !== 'running') return
  const spd = 20
  if (e.key === 'ArrowLeft') paddle.x = Math.max(0, paddle.x - spd)
  else if (e.key === 'ArrowRight') paddle.x = Math.min(W - paddle.w, paddle.x + spd)
}

function onMouseMove(e: MouseEvent): void {
  if (state.value !== 'running') return
  const rect = canvasRef.value!.getBoundingClientRect()
  const scaleX = W / rect.width
  paddle.x = Math.max(0, Math.min(W - paddle.w, (e.clientX - rect.left) * scaleX - paddle.w / 2))
}

onMounted(() => {
  ctx = canvasRef.value!.getContext('2d')
  ctx!.fillStyle = '#0d0d0d'
  ctx!.fillRect(0, 0, W, H)
  window.addEventListener('keydown', onKey)
  canvasRef.value!.addEventListener('mousemove', onMouseMove)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (canvasRef.value) canvasRef.value.removeEventListener('mousemove', onMouseMove)
  cancelAnimationFrame(rafId)
})
</script>

<style scoped>
.breakout-wrapper { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
.score-bar { width: 480px; display: flex; justify-content: space-between; font-family: var(--font-pixel); font-size: 0.5rem; color: var(--text-dim); }
.score-bar strong { color: var(--neon-pink); }
.score-bar .lives { color: var(--neon-pink); letter-spacing: 0.1em; }
.canvas-container { position: relative; border: 2px solid var(--neon-pink); box-shadow: 0 0 20px #ff2d7844, inset 0 0 20px #00000088; }
canvas { display: block; }
.overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.82); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; }
.overlay-title { font-family: var(--font-pixel); font-size: 1.1rem; color: var(--neon-pink); text-shadow: 0 0 15px #ff2d78; }
.overlay-title.game-over { color: var(--neon-pink); }
.overlay-title.win { color: var(--neon-yellow); text-shadow: 0 0 15px #ffe600; }
.overlay-score { font-family: var(--font-pixel); font-size: 0.6rem; color: var(--text); }
.overlay-hs { font-family: var(--font-pixel); font-size: 0.5rem; color: var(--neon-yellow); animation: blink 0.8s step-end infinite; }
.overlay-hint { font-size: 0.85rem; color: var(--text-dim); font-family: var(--font-mono); }
.overlay-sub { font-size: 0.8rem; color: var(--text-dim); font-family: var(--font-mono); }
.controls-hint { font-size: 0.8rem; color: var(--text-dim); font-family: var(--font-mono); }
kbd { background: #2a2a2a; border: 1px solid #444; border-radius: 3px; padding: 1px 5px; font-family: var(--font-mono); font-size: 0.8rem; color: var(--neon-pink); }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
</style>
