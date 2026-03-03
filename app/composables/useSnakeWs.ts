interface SnakeSegment { x: number; y: number }
interface SnakePlayerState {
  slot: 0 | 1
  username: string
  color: string
  segments: SnakeSegment[]
  alive: boolean
  score: number
}

interface TickMsg {
  type: 'TICK'
  snakes: SnakePlayerState[]
  food: SnakeSegment
  tick: number
}

interface GameOverMsg {
  type: 'GAME_OVER'
  winner: 0 | 1 | null
  scores: Record<number, number>
  reason: string
}

type WsMsg =
  | { type: 'CONNECTED' | 'ROOM_READY'; players?: Array<{ username: string; slot: number; color: string }> }
  | { type: 'JOINED'; slot: number; roomId: string }
  | TickMsg
  | GameOverMsg
  | { type: 'ERROR'; code: string; message: string }

export function useSnakeWs(roomId: string) {
  const snakes = ref<SnakePlayerState[]>([])
  const food = ref<SnakeSegment>({ x: 0, y: 0 })
  const tick = ref(0)
  const mySlot = ref<number | null>(null)
  const status = ref<'connecting' | 'waiting' | 'playing' | 'finished' | 'error'>('connecting')
  const error = ref('')
  const winner = ref<0 | 1 | null | undefined>(undefined)

  let ws: WebSocket | null = null

  async function connect(): Promise<void> {
    const { token } = await $fetch<{ token: string }>('/api/ws-token')
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    ws = new WebSocket(`${protocol}://${location.host}/_ws/snake`)

    ws.addEventListener('open', () => {
      ws!.send(JSON.stringify({ type: 'JOIN', roomId, token }))
    })

    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data) as WsMsg

      switch (msg.type) {
        case 'JOINED':
          mySlot.value = msg.slot
          status.value = 'waiting'
          break
        case 'ROOM_READY':
          status.value = 'playing'
          break
        case 'TICK':
          snakes.value = (msg as TickMsg).snakes
          food.value = (msg as TickMsg).food
          tick.value = (msg as TickMsg).tick
          break
        case 'GAME_OVER':
          status.value = 'finished'
          winner.value = (msg as GameOverMsg).winner
          break
        case 'ERROR':
          error.value = msg.message
          status.value = 'error'
          break
      }
    })

    ws.addEventListener('close', () => {
      if (status.value !== 'finished') status.value = 'error'
    })
  }

  function sendDir(x: number, y: number): void {
    ws?.send(JSON.stringify({ type: 'DIR', x, y }))
  }

  function disconnect(): void {
    ws?.close()
  }

  return { snakes, food, tick, mySlot, status, error, winner, connect, sendDir, disconnect }
}
