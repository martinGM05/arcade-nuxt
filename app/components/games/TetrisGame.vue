<template>
  <div class="tetris-wrapper">
    <div class="tetris-layout">
      <div class="board-side">
        <div class="score-bar">
          <span>SCORE: <strong>{{ score }}</strong></span>
          <span>BEST: <strong>{{ highScore }}</strong></span>
        </div>
        <div class="canvas-container">
          <canvas ref="canvasRef" :width="BOARD_W" :height="BOARD_H"></canvas>
          <div v-if="state === 'idle'" class="overlay">
            <p class="overlay-title">TETRIS</p>
            <p class="overlay-hint">ENTER o toca para comenzar</p>
          </div>
          <div v-else-if="state === 'gameover'" class="overlay">
            <p class="overlay-title game-over">GAME OVER</p>
            <p class="overlay-score">{{ score }} pts</p>
            <p v-if="score >= highScore && score > 0" class="overlay-hs">¡NUEVO RÉCORD!</p>
            <p class="overlay-hint">ENTER para reintentar</p>
          </div>
          <div v-else-if="state === 'paused'" class="overlay">
            <p class="overlay-title">PAUSA</p>
            <p class="overlay-hint">P para continuar</p>
          </div>
        </div>
        <div class="controls-hint">
          <kbd>← →</kbd> mover &nbsp;|&nbsp; <kbd>↑</kbd> rotar &nbsp;|&nbsp; <kbd>↓</kbd> bajar &nbsp;|&nbsp; <kbd>Space</kbd> caída &nbsp;|&nbsp; <kbd>P</kbd> pausa
        </div>

        <!-- Mobile gamepad -->
        <div class="gamepad">
          <div class="gamepad-top">
            <button
              class="gpad-btn gpad-rotate"
              @touchstart.prevent="tapKey('ArrowUp')"
              @click="tapKey('ArrowUp')"
              title="Rotar"
            >↺</button>
            <button
              class="gpad-btn gpad-drop"
              @touchstart.prevent="tapKey(' ')"
              @click="tapKey(' ')"
              title="Caída"
            >⬇</button>
          </div>
          <div class="gamepad-bottom">
            <button
              class="gpad-btn"
              @touchstart.prevent="startHold('ArrowLeft')"
              @touchend.prevent="endHold"
              @mousedown="startHold('ArrowLeft')"
              @mouseup="endHold"
              @mouseleave="endHold"
              title="Izquierda"
            >◀</button>
            <button
              class="gpad-btn gpad-down"
              @touchstart.prevent="startHold('ArrowDown')"
              @touchend.prevent="endHold"
              @mousedown="startHold('ArrowDown')"
              @mouseup="endHold"
              @mouseleave="endHold"
              title="Bajar"
            >▼</button>
            <button
              class="gpad-btn"
              @touchstart.prevent="startHold('ArrowRight')"
              @touchend.prevent="endHold"
              @mousedown="startHold('ArrowRight')"
              @mouseup="endHold"
              @mouseleave="endHold"
              title="Derecha"
            >▶</button>
          </div>
        </div>
      </div>
      <div class="side-panel">
        <div class="panel-box">
          <h3 class="panel-label">SIGUIENTE</h3>
          <canvas ref="nextCanvasRef" :width="NEXT_SIZE" :height="NEXT_SIZE"></canvas>
        </div>
        <div class="panel-box">
          <h3 class="panel-label">LÍNEAS</h3>
          <span class="panel-value">{{ lines }}</span>
        </div>
        <div class="panel-box">
          <h3 class="panel-label">NIVEL</h3>
          <span class="panel-value">{{ level }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const COLS = 10
const ROWS = 20
const CELL = 24
const BOARD_W = COLS * CELL
const BOARD_H = ROWS * CELL
const NEXT_SIZE = 120

interface Piece {
  shape: number[][]
  color: string
  x: number
  y: number
}

const PIECES: Array<{ shape: number[][]; color: string }> = [
  { shape: [[1,1,1,1]], color: '#00e5ff' },
  { shape: [[1,1],[1,1]], color: '#ffe600' },
  { shape: [[0,1,0],[1,1,1]], color: '#b000ff' },
  { shape: [[1,0],[1,0],[1,1]], color: '#ff8c00' },
  { shape: [[0,1],[0,1],[1,1]], color: '#2979ff' },
  { shape: [[0,1,1],[1,1,0]], color: '#39ff14' },
  { shape: [[1,1,0],[0,1,1]], color: '#ff2d78' },
]

const LINE_SCORES = [0, 100, 300, 500, 800]

const { highScore, saveScore } = useHighScore('tetris')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const nextCanvasRef = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const lines = ref(0)
const level = ref(1)
const state = ref<'idle' | 'running' | 'paused' | 'gameover'>('idle')

let ctx: CanvasRenderingContext2D | null = null
let nextCtx: CanvasRenderingContext2D | null = null
let board: (string | 0)[][] = []
let current: Piece | null = null
let nextPiece: Piece | null = null
let rafId = 0
let lastTime = 0
let dropInterval = 800

function createBoard(): (string | 0)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0))
}

function randomPiece(): Piece {
  const p = PIECES[Math.floor(Math.random() * PIECES.length)]!
  return {
    shape: p.shape.map(r => [...r]),
    color: p.color,
    x: Math.floor(COLS / 2) - Math.floor(p.shape[0]!.length / 2),
    y: 0,
  }
}

function rotate(shape: number[][]): number[][] {
  const rows = shape.length
  const cols = shape[0]!.length
  const result: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c]![rows - 1 - r] = shape[r]![c]!
    }
  }
  return result
}

function collides(piece: Piece, ox = 0, oy = 0, shape: number[][] | null = null): boolean {
  const s = shape ?? piece.shape
  for (let r = 0; r < s.length; r++) {
    const row = s[r]!
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue
      const nx = piece.x + c + ox
      const ny = piece.y + r + oy
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true
      if (ny >= 0 && board[ny]![nx]) return true
    }
  }
  return false
}

function merge(): void {
  if (!current) return
  current.shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) {
        const ny = current!.y + r
        if (ny >= 0) board[ny]![current!.x + c] = current!.color
      }
    })
  })
}

function clearLines(): void {
  let cleared = 0
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r]!.every(cell => cell !== 0)) {
      board.splice(r, 1)
      board.unshift(Array(COLS).fill(0))
      cleared++
      r++
    }
  }
  if (cleared > 0) {
    lines.value += cleared
    score.value += LINE_SCORES[Math.min(cleared, 4)]! * level.value
    saveScore(score.value)
    level.value = Math.floor(lines.value / 10) + 1
    dropInterval = Math.max(100, 800 - (level.value - 1) * 70)
  }
}

function spawnNext(): void {
  current = nextPiece ?? randomPiece()
  nextPiece = randomPiece()
  drawNext()
  if (collides(current)) endGame()
}

function hardDrop(): void {
  if (!current) return
  while (!collides(current, 0, 1)) { current.y++; score.value += 2 }
  land()
}

function land(): void {
  merge()
  clearLines()
  spawnNext()
}

function tick(timestamp: number): void {
  if (state.value !== 'running') return
  rafId = requestAnimationFrame(tick)
  if (timestamp - lastTime >= dropInterval) {
    lastTime = timestamp
    if (!collides(current!, 0, 1)) current!.y++
    else land()
  }
  drawBoard()
}

function drawCell(context: CanvasRenderingContext2D, x: number, y: number, color: string, cellSize = CELL): void {
  context.fillStyle = color
  context.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2)
  context.fillStyle = 'rgba(255,255,255,0.15)'
  context.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, 4)
  context.fillRect(x * cellSize + 1, y * cellSize + 1, 4, cellSize - 2)
}

function drawBoard(): void {
  if (!ctx || !current) return
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, BOARD_W, BOARD_H)
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 0.5
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) ctx.strokeRect(c * CELL, r * CELL, CELL, CELL)
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r]![c]!
      if (cell) drawCell(ctx, c, r, cell as string)
    }
  }

  let ghostY = current.y
  while (!collides(current, 0, ghostY - current.y + 1)) ghostY++
  current.shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell && ghostY + r >= 0) {
        ctx!.fillStyle = 'rgba(255,255,255,0.12)'
        ctx!.fillRect((current!.x + c) * CELL + 1, (ghostY + r) * CELL + 1, CELL - 2, CELL - 2)
      }
    })
  })

  current.shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell && current!.y + r >= 0) {
        ctx!.shadowColor = current!.color
        ctx!.shadowBlur = 6
        drawCell(ctx!, current!.x + c, current!.y + r, current!.color)
        ctx!.shadowBlur = 0
      }
    })
  })
}

function drawNext(): void {
  if (!nextCtx || !nextPiece) return
  nextCtx.fillStyle = '#0a0a0a'
  nextCtx.fillRect(0, 0, NEXT_SIZE, NEXT_SIZE)
  const s = nextPiece.shape
  const cellSize = Math.min(Math.floor(NEXT_SIZE / (s[0]!.length + 2)), Math.floor(NEXT_SIZE / (s.length + 2)))
  const offsetX = Math.floor((NEXT_SIZE - s[0]!.length * cellSize) / 2)
  const offsetY = Math.floor((NEXT_SIZE - s.length * cellSize) / 2)
  s.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) {
        nextCtx!.fillStyle = nextPiece!.color
        nextCtx!.shadowColor = nextPiece!.color
        nextCtx!.shadowBlur = 5
        nextCtx!.fillRect(offsetX + c * cellSize + 1, offsetY + r * cellSize + 1, cellSize - 2, cellSize - 2)
        nextCtx!.shadowBlur = 0
      }
    })
  })
}

function startGame(): void {
  board = createBoard()
  score.value = 0
  lines.value = 0
  level.value = 1
  dropInterval = 800
  nextPiece = randomPiece()
  spawnNext()
  state.value = 'running'
  lastTime = 0
  rafId = requestAnimationFrame(tick)
}

function endGame(): void {
  state.value = 'gameover'
  cancelAnimationFrame(rafId)
  saveScore(score.value)
  if (ctx) drawBoard()
}

function togglePause(): void {
  if (state.value === 'running') {
    state.value = 'paused'; cancelAnimationFrame(rafId)
  } else if (state.value === 'paused') {
    state.value = 'running'; lastTime = 0; rafId = requestAnimationFrame(tick)
  }
}

// Mobile tap key helper
function tapKey(key: string): void {
  if (key === 'Enter') {
    if (state.value === 'idle' || state.value === 'gameover') { startGame(); return }
  }
  if (state.value !== 'running' || !current) return
  if (key === 'ArrowLeft') { if (!collides(current, -1)) current.x--; drawBoard() }
  else if (key === 'ArrowRight') { if (!collides(current, 1)) current.x++; drawBoard() }
  else if (key === 'ArrowDown') { if (!collides(current, 0, 1)) { current.y++; score.value++ } else land(); drawBoard() }
  else if (key === 'ArrowUp') {
    const rotated = rotate(current.shape)
    if (!collides(current, 0, 0, rotated)) current.shape = rotated
    else if (!collides(current, 1, 0, rotated)) { current.shape = rotated; current.x++ }
    else if (!collides(current, -1, 0, rotated)) { current.shape = rotated; current.x-- }
    drawBoard()
  } else if (key === ' ') { hardDrop(); drawBoard() }
}

let holdTimer: ReturnType<typeof setInterval> | null = null
let holdTimeout: ReturnType<typeof setTimeout> | null = null

function startHold(key: string): void {
  tapKey(key)
  holdTimeout = setTimeout(() => {
    holdTimer = setInterval(() => tapKey(key), 80)
  }, 280)
}

function endHold(): void {
  if (holdTimeout) { clearTimeout(holdTimeout); holdTimeout = null }
  if (holdTimer) { clearInterval(holdTimer); holdTimer = null }
}

function onKey(e: KeyboardEvent): void {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault()

  if (e.key === 'Enter' || (e.key === ' ' && state.value !== 'running')) {
    if (state.value === 'idle' || state.value === 'gameover') startGame()
    return
  }
  if (e.key === 'p' || e.key === 'P') { togglePause(); return }
  if (state.value !== 'running' || !current) return

  if (e.key === 'ArrowLeft') { if (!collides(current, -1)) current.x-- }
  else if (e.key === 'ArrowRight') { if (!collides(current, 1)) current.x++ }
  else if (e.key === 'ArrowDown') {
    if (!collides(current, 0, 1)) { current.y++; score.value++ }
    else land()
  } else if (e.key === 'ArrowUp') {
    const rotated = rotate(current.shape)
    if (!collides(current, 0, 0, rotated)) current.shape = rotated
    else if (!collides(current, 1, 0, rotated)) { current.shape = rotated; current.x++ }
    else if (!collides(current, -1, 0, rotated)) { current.shape = rotated; current.x-- }
  } else if (e.key === ' ') { hardDrop() }
  drawBoard()
}

function onCanvasTouch(e: TouchEvent): void {
  e.preventDefault()
  if (state.value === 'idle' || state.value === 'gameover') startGame()
}

onMounted(() => {
  ctx = canvasRef.value!.getContext('2d')
  nextCtx = nextCanvasRef.value!.getContext('2d')
  ctx!.fillStyle = '#0d0d0d'
  ctx!.fillRect(0, 0, BOARD_W, BOARD_H)
  nextCtx!.fillStyle = '#0a0a0a'
  nextCtx!.fillRect(0, 0, NEXT_SIZE, NEXT_SIZE)
  window.addEventListener('keydown', onKey)
  canvasRef.value!.addEventListener('touchstart', onCanvasTouch, { passive: false })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (canvasRef.value) canvasRef.value.removeEventListener('touchstart', onCanvasTouch)
  cancelAnimationFrame(rafId)
  endHold()
})
</script>

<style scoped>
.tetris-wrapper { display: flex; flex-direction: column; align-items: center; }
.tetris-layout { display: flex; gap: 1rem; align-items: flex-start; flex-wrap: wrap; justify-content: center; }
.board-side { display: flex; flex-direction: column; gap: 0.75rem; align-items: center; }
.score-bar { width: 100%; display: flex; justify-content: space-between; font-family: var(--font-pixel); font-size: 0.5rem; color: var(--text-dim); }
.score-bar strong { color: var(--neon-cyan); }
.canvas-container { position: relative; border: 2px solid var(--neon-cyan); box-shadow: 0 0 20px #00e5ff44, inset 0 0 20px #00000088; }
canvas { display: block; max-width: 100%; height: auto; }
.overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.82); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; }
.overlay-title { font-family: var(--font-pixel); font-size: 1.1rem; color: var(--neon-cyan); text-shadow: 0 0 15px #00e5ff; }
.overlay-title.game-over { color: var(--neon-pink); text-shadow: 0 0 15px #ff2d78; }
.overlay-score { font-family: var(--font-pixel); font-size: 0.6rem; color: var(--text); }
.overlay-hs { font-family: var(--font-pixel); font-size: 0.5rem; color: var(--neon-yellow); animation: blink 0.8s step-end infinite; }
.overlay-hint { font-size: 0.85rem; color: var(--text-dim); font-family: var(--font-mono); }
.controls-hint { font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono); }
kbd { background: #2a2a2a; border: 1px solid #444; border-radius: 3px; padding: 1px 5px; font-family: var(--font-mono); font-size: 0.75rem; color: var(--neon-cyan); }
.side-panel { display: flex; flex-direction: column; gap: 1rem; min-width: 120px; padding-top: 2rem; }
.panel-box { background: #0a0a0a; border: 1px solid var(--border); border-radius: 4px; padding: 0.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.panel-label { font-family: var(--font-pixel); font-size: 0.45rem; color: var(--text-dim); letter-spacing: 0.05em; }
.panel-value { font-family: var(--font-pixel); font-size: 1rem; color: var(--neon-cyan); }

/* Mobile gamepad */
.gamepad {
  display: none;
  flex-direction: column;
  gap: 6px;
  user-select: none;
}

.gamepad-top,
.gamepad-bottom {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.gpad-btn {
  width: 64px;
  height: 56px;
  background: #1a1a1a;
  border: 1px solid #00e5ff44;
  border-radius: 8px;
  color: var(--neon-cyan);
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.1s, box-shadow 0.1s;
}

.gpad-btn:active {
  background: #00e5ff22;
  box-shadow: 0 0 10px #00e5ff55;
}

.gpad-rotate { font-size: 1.5rem; }
.gpad-drop { font-size: 1.2rem; }

@media (pointer: coarse) {
  .gamepad { display: flex; }
  .controls-hint { display: none; }
}

@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
</style>
