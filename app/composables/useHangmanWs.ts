export interface HangmanPlayer {
  userId: string
  username: string
  slot: number
  isSetter: boolean
}

export interface HangmanState {
  status: 'connecting' | 'waiting' | 'choosing' | 'playing' | 'finished' | 'error'
  players: HangmanPlayer[]
  setterUserId: string | null
  masked: string | null
  remaining: number
  guessedLetters: string[]
  wordCount: number
  winnerId: string | null
  winnerUsername: string | null
  phrase: string | null
  maxErrors: number
}

export function useHangmanWs(roomId: string) {
  const state = ref<HangmanState>({
    status: 'connecting',
    players: [],
    setterUserId: null,
    masked: null,
    remaining: 6,
    guessedLetters: [],
    wordCount: 0,
    winnerId: null,
    winnerUsername: null,
    phrase: null,
    maxErrors: 6,
  })

  const error = ref('')
  const myUserId = ref<string | null>(null)
  let ws: WebSocket | null = null

  const auth = useAuth()

  async function connect(): Promise<void> {
    const { token } = await $fetch<{ token: string }>('/api/ws-token')
    myUserId.value = auth.user.value?.userId ?? null
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    ws = new WebSocket(`${protocol}://${location.host}/_ws/hangman`)

    ws.addEventListener('open', () => {
      ws!.send(JSON.stringify({ type: 'JOIN', roomId, token }))
    })

    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data) as Record<string, unknown>
      switch (msg['type']) {
        case 'JOINED':
          break
        case 'ROOM_STATE':
          state.value = {
            status: msg['status'] as HangmanState['status'],
            players: msg['players'] as HangmanPlayer[],
            setterUserId: msg['setterUserId'] as string | null,
            masked: msg['masked'] as string | null,
            remaining: msg['remaining'] as number,
            guessedLetters: msg['guessedLetters'] as string[],
            wordCount: msg['wordCount'] as number,
            winnerId: msg['winnerId'] as string | null,
            winnerUsername: msg['winnerUsername'] as string | null,
            phrase: msg['phrase'] as string | null,
            maxErrors: msg['maxErrors'] as number,
          }
          break
        case 'ERROR':
          error.value = msg['message'] as string
          state.value.status = 'error'
          break
      }
    })

    ws.addEventListener('close', () => {
      if (state.value.status !== 'finished') {
        state.value.status = 'error'
        error.value = 'Conexión cerrada'
      }
    })
  }

  function send(data: Record<string, unknown>): void {
    ws?.send(JSON.stringify(data))
  }

  function setPhrase(phrase: string): void { send({ type: 'SET_PHRASE', phrase }) }
  function guessLetter(letter: string): void { send({ type: 'GUESS_LETTER', letter }) }
  function guessPhrase(phrase: string): void { send({ type: 'GUESS_PHRASE', phrase }) }
  function disconnect(): void { ws?.close() }

  return { state, error, myUserId, connect, setPhrase, guessLetter, guessPhrase, disconnect }
}
