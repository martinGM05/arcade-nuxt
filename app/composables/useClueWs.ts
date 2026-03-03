export type SuspectId = 'scarlett' | 'mustard' | 'white' | 'green' | 'peacock' | 'plum'
export type WeaponId = 'candlestick' | 'knife' | 'lead_pipe' | 'revolver' | 'rope' | 'wrench'
export type RoomId =
  | 'study' | 'library' | 'billiard_room'
  | 'kitchen' | 'ballroom' | 'conservatory'
  | 'hall' | 'lounge' | 'dining_room'

export type CardId = SuspectId | WeaponId | RoomId

export interface CluePub {
  userId: string
  username: string
  slot: number
  currentRoom: RoomId
  alive: boolean
  cardCount: number
}

export interface ClueSuggestion {
  byUserId: string
  suspect: SuspectId
  weapon: WeaponId
  room: RoomId
}

export interface ClueGameState {
  players: CluePub[]
  currentUserId: string
  phase: 'MOVE' | 'SUGGEST' | 'DISPROVE' | 'ACCUSE_OR_PASS' | 'WAITING'
  publicCards: CardId[]
  myHand: CardId[]
  pendingSuggestion: ClueSuggestion | null
}

export interface DisproveRequest {
  suspect: SuspectId
  weapon: WeaponId
  room: RoomId
  matchingCards: CardId[]
}

export interface GameOver {
  winner: string | null
  winnerUsername: string | null
  solution: { suspect: SuspectId; weapon: WeaponId; room: RoomId } | null
  reason?: string
}

export function useClueWs(roomId: string) {
  const gameState = ref<ClueGameState | null>(null)
  const mySlot = ref<number | null>(null)
  const myUserId = ref<string | null>(null)
  const status = ref<'connecting' | 'waiting' | 'playing' | 'finished' | 'error'>('connecting')
  const error = ref('')
  const gameOver = ref<GameOver | null>(null)
  const disproveRequest = ref<DisproveRequest | null>(null)
  const lastEvent = ref<{ type: string; payload?: unknown } | null>(null)

  let ws: WebSocket | null = null

  const auth = useAuth()

  async function connect(): Promise<void> {
    const { token } = await $fetch<{ token: string }>('/api/ws-token')
    myUserId.value = auth.user.value?.userId ?? null
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    ws = new WebSocket(`${protocol}://${location.host}/_ws/clue`)

    ws.addEventListener('open', () => {
      ws!.send(JSON.stringify({ type: 'JOIN', roomId, token }))
    })

    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data) as Record<string, unknown>

      switch (msg['type']) {
        case 'JOINED':
          mySlot.value = msg['slot'] as number
          status.value = 'waiting'
          break

        case 'PLAYER_JOINED':
          lastEvent.value = { type: 'PLAYER_JOINED', payload: msg }
          break

        case 'GAME_STATE':
          gameState.value = {
            players: msg['players'] as CluePub[],
            currentUserId: msg['currentUserId'] as string,
            phase: msg['phase'] as ClueGameState['phase'],
            publicCards: msg['publicCards'] as CardId[],
            myHand: msg['myHand'] as CardId[],
            pendingSuggestion: msg['pendingSuggestion'] as ClueSuggestion | null,
          }
          if (status.value === 'waiting' && msg['phase'] !== 'WAITING') status.value = 'playing'
          break

        case 'TURN_START':
          lastEvent.value = { type: 'TURN_START', payload: msg }
          break

        case 'PLAYER_MOVED':
          lastEvent.value = { type: 'PLAYER_MOVED', payload: msg }
          break

        case 'SUGGESTION_MADE':
          lastEvent.value = { type: 'SUGGESTION_MADE', payload: msg }
          break

        case 'DISPROVE_REQUEST':
          disproveRequest.value = {
            suspect: msg['suspect'] as SuspectId,
            weapon: msg['weapon'] as WeaponId,
            room: msg['room'] as RoomId,
            matchingCards: msg['matchingCards'] as CardId[],
          }
          break

        case 'DISPROVE_RESULT':
          disproveRequest.value = null
          lastEvent.value = { type: 'DISPROVE_RESULT', payload: msg }
          break

        case 'DISPROVE_RESULT_PUBLIC':
          lastEvent.value = { type: 'DISPROVE_RESULT_PUBLIC', payload: msg }
          break

        case 'CANNOT_DISPROVE':
        case 'CANNOT_DISPROVE_ALL':
          lastEvent.value = { type: msg['type'] as string, payload: msg }
          break

        case 'ACCUSATION_RESULT':
          lastEvent.value = { type: 'ACCUSATION_RESULT', payload: msg }
          break

        case 'GAME_OVER':
          status.value = 'finished'
          gameOver.value = {
            winner: msg['winner'] as string | null,
            winnerUsername: msg['winnerUsername'] as string | null,
            solution: msg['solution'] as GameOver['solution'],
            reason: msg['reason'] as string | undefined,
          }
          break

        case 'PLAYER_DISCONNECTED':
          lastEvent.value = { type: 'PLAYER_DISCONNECTED', payload: msg }
          break

        case 'ERROR':
          error.value = msg['message'] as string
          break
      }
    })

    ws.addEventListener('close', () => {
      if (status.value !== 'finished') { status.value = 'error'; error.value = 'Conexión cerrada' }
    })
  }

  function send(data: Record<string, unknown>): void {
    ws?.send(JSON.stringify(data))
  }

  function startGame(): void { send({ type: 'READY' }) }
  function move(to: RoomId): void { send({ type: 'MOVE', to }) }
  function suggest(suspect: SuspectId, weapon: WeaponId): void { send({ type: 'SUGGEST', suspect, weapon }) }
  function passSuggest(): void { send({ type: 'PASS_SUGGEST' }) }
  function disprove(card: CardId): void { send({ type: 'DISPROVE', card }); disproveRequest.value = null }
  function cannotDisprove(): void { send({ type: 'CANNOT_DISPROVE' }); disproveRequest.value = null }
  function accuse(suspect: SuspectId, weapon: WeaponId, room: RoomId): void { send({ type: 'ACCUSE', suspect, weapon, room }) }
  function endTurn(): void { send({ type: 'END_TURN' }) }
  function disconnect(): void { ws?.close() }

  return {
    gameState, mySlot, myUserId, status, error, gameOver, disproveRequest, lastEvent,
    connect, startGame, move, suggest, passSuggest, disprove, cannotDisprove, accuse, endTurn, disconnect,
  }
}
